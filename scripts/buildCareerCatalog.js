/**
 * Refresh script for src/data/careerCatalog.json.
 *
 * Uses the SOC list in src/data/cipToSocCatalog.json as the authoritative set.
 * For each SOC it calls O*NET Web Services v2 to pull occupation detail,
 * summary DWAs/tasks/skills, and related occupations, then merges in the
 * BLS wage/growth rows already present in src/data/cipEnrichment.json.
 *
 * Supports incremental mode (skips SOCs already in the catalog) by default.
 * Pass --force to re-fetch every SOC.
 *
 * Usage: node --env-file=.env.local scripts/buildCareerCatalog.js [--force]
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ONET_BASE = 'https://api-v2.onetcenter.org'
const DELAY_MS = 250

const cipToSocPath = join(__dirname, '../src/data/cipToSocCatalog.json')
const cipEnrichmentPath = join(__dirname, '../src/data/cipEnrichment.json')
const catalogPath = join(__dirname, '../src/data/careerCatalog.json')

const forceRefresh = process.argv.includes('--force')

const apiKey = process.env.ONET_API_KEY || process.env.VITE_ONET_API_KEY
if (!apiKey) {
  console.error('[buildCareerCatalog] Missing ONET_API_KEY (or VITE_ONET_API_KEY). Skipping.')
  process.exit(0)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function onetGet(path) {
  const res = await fetch(`${ONET_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': apiKey,
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`)
  return res.json()
}

function collectSocCodes(cipToSoc) {
  const set = new Set()
  for (const entry of Object.values(cipToSoc.byCip ?? {})) {
    const list = Array.isArray(entry) ? entry : entry?.socs ?? []
    for (const soc of list) set.add(soc)
  }
  return [...set]
}

function blsRowForSoc(cipEnrichment, soc) {
  for (const entry of Object.values(cipEnrichment.byCip ?? {})) {
    const hit = entry.socExamples?.find((ex) => ex.soc === soc)
    if (hit?.bls) return { medianAnnualWage: hit.bls.medianAnnualWage, growthPct2024_2034: hit.bls.growthPct2024_2034 }
  }
  return null
}

async function buildOne(soc, existing, cipEnrichment) {
  try {
    const [detail, dwas, tasks, skills, related] = await Promise.all([
      onetGet(`/online/occupations/${encodeURIComponent(soc)}`),
      onetGet(`/online/occupations/${encodeURIComponent(soc)}/summary/detailed_work_activities`).catch(() => null),
      onetGet(`/online/occupations/${encodeURIComponent(soc)}/summary/tasks`).catch(() => null),
      onetGet(`/online/occupations/${encodeURIComponent(soc)}/summary/skills`).catch(() => null),
      onetGet(`/online/occupations/${encodeURIComponent(soc)}/details/related_occupations`).catch(() => null),
    ])

    const dwaList = (dwas?.activity ?? dwas?.detailed_work_activity ?? []).slice(0, 5).map((a) => ({
      id: a.id ?? a.code,
      title: a.title ?? a.name,
    }))
    const taskList = (tasks?.task ?? []).slice(0, 5).map((t) => (typeof t === 'string' ? t : t.statement ?? t.title))
    const skillList = (skills?.element ?? skills?.skill ?? []).slice(0, 4).map((s) => s.name ?? s.title).filter(Boolean)
    const relatedList = (related?.occupation ?? related?.related_occupation ?? []).slice(0, 3).map((r) => ({
      soc: r.code ?? r.onetsoc_code,
      title: r.title,
    })).filter((r) => r.soc && r.title)

    const bls = blsRowForSoc(cipEnrichment, soc) ?? existing?.bls ?? null

    return {
      title: detail.title ?? existing?.title ?? soc,
      description: detail.description ?? existing?.description ?? '',
      jobZone: detail.job_zone ?? detail.education?.job_zone?.title ?? existing?.jobZone ?? null,
      brightOutlook: Boolean(detail.bright_outlook ?? existing?.brightOutlook),
      dwas: dwaList.length ? dwaList : (existing?.dwas ?? []),
      tasks: taskList.length ? taskList : (existing?.tasks ?? []),
      topSkills: skillList.length ? skillList : (existing?.topSkills ?? []),
      related: relatedList.length ? relatedList : (existing?.related ?? []),
      bls,
      keywords: existing?.keywords ?? [detail.title?.toLowerCase() ?? soc],
      opmSeries: existing?.opmSeries ?? null,
    }
  } catch (err) {
    console.warn(`  ⚠ SOC ${soc} skipped: ${err.message}`)
    return null
  }
}

async function main() {
  const cipToSoc = readJson(cipToSocPath)
  const cipEnrichment = readJson(cipEnrichmentPath)
  const existing = readJson(catalogPath)
  const allSocs = collectSocCodes(cipToSoc)

  const bySoc = { ...(existing.bySoc ?? {}) }

  const toFetch = forceRefresh ? allSocs : allSocs.filter((s) => !bySoc[s])
  const skipped = allSocs.length - toFetch.length

  console.log(
    `[buildCareerCatalog] ${allSocs.length} total SOCs, ${skipped} already cached, ${toFetch.length} to fetch` +
    (forceRefresh ? ' (--force: re-fetching all)' : ''),
  )
  if (toFetch.length === 0) {
    console.log('[buildCareerCatalog] Nothing new to fetch. Pass --force to re-fetch all.')
    return
  }

  let done = 0
  let failed = 0
  const startTime = Date.now()

  for (const soc of toFetch) {
    const prev = bySoc[soc]
    const next = await buildOne(soc, prev, cipEnrichment)
    if (next) {
      bySoc[soc] = next
    } else {
      failed++
    }
    done++

    if (done % 25 === 0 || done === toFetch.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      console.log(`  [${done}/${toFetch.length}] ${elapsed}s elapsed, ${failed} failed`)
    }

    if (done < toFetch.length) await sleep(DELAY_MS)
  }

  const output = {
    note: 'Per-SOC career profile from O*NET. Regenerate with: node --env-file=.env.local scripts/buildCareerCatalog.js',
    bySoc,
  }
  writeFileSync(catalogPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')
  console.log(`[buildCareerCatalog] Wrote ${Object.keys(bySoc).length} SOC entries to ${catalogPath}`)
}

main().catch((err) => {
  console.error('[buildCareerCatalog] failed:', err)
  process.exit(1)
})
