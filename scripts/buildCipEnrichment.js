/**
 * Generates src/data/cipEnrichment.json from cipToSocCatalog.json + careerCatalog.json.
 *
 * For each CIP-4 key, builds an enrichment entry with cipTitle, category,
 * socExamples (with BLS data from the catalog), and source tags.
 * Preserves hand-authored fields that already exist.
 *
 * Usage: node scripts/buildCipEnrichment.js
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const cipToSocPath = join(__dirname, '../src/data/cipToSocCatalog.json')
const catalogPath = join(__dirname, '../src/data/careerCatalog.json')
const enrichmentPath = join(__dirname, '../src/data/cipEnrichment.json')

const CIP2_CATEGORY = {
  1: 'Other', 3: 'Other', 4: 'Other', 5: 'Other', 9: 'Other',
  10: 'Other', 11: 'STEM', 12: 'Other', 13: 'Other', 14: 'STEM',
  15: 'STEM', 16: 'Arts & Humanities', 19: 'Other', 22: 'Social Sciences',
  23: 'Arts & Humanities', 24: 'Arts & Humanities', 25: 'Social Sciences',
  26: 'STEM', 27: 'STEM', 28: 'STEM', 29: 'Other', 30: 'Social Sciences',
  31: 'Social Sciences', 38: 'Social Sciences', 40: 'STEM', 41: 'Other',
  42: 'Social Sciences', 43: 'Other', 44: 'Social Sciences',
  45: 'Social Sciences', 46: 'Other', 47: 'Other', 48: 'Other',
  49: 'Social Sciences', 50: 'Arts & Humanities', 51: 'Health',
  52: 'Business', 54: 'Other',
}

function categoryForCip(cip4) {
  const d2 = parseInt(String(cip4).slice(0, 2), 10)
  return CIP2_CATEGORY[d2] ?? 'Other'
}

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'))
}

function main() {
  const cipToSoc = readJson(cipToSocPath)
  const catalog = readJson(catalogPath)
  let existing = {}
  try {
    existing = readJson(enrichmentPath)?.byCip ?? {}
  } catch { /* first run */ }

  const byCip = {}
  let generated = 0
  let preserved = 0

  for (const [cip4, entry] of Object.entries(cipToSoc.byCip ?? {})) {
    const socList = Array.isArray(entry) ? entry : entry?.socs ?? []
    const cipTitle = (typeof entry === 'object' && !Array.isArray(entry))
      ? entry.title ?? ''
      : ''

    const prev = existing[cip4]

    const socExamples = socList.slice(0, 6).map((soc) => {
      const cat = catalog.bySoc?.[soc]
      if (!cat) return { soc, title: soc }
      const ex = { soc, title: cat.title ?? soc }
      if (cat.bls) ex.bls = cat.bls
      if (cat.jobZone != null || cat.brightOutlook || cat.topSkills?.length) {
        ex.onet = {}
        if (cat.jobZone != null) ex.onet.jobZone = cat.jobZone
        if (cat.brightOutlook) ex.onet.brightOutlook = true
        if (cat.topSkills?.length) ex.onet.topSkills = cat.topSkills.slice(0, 3)
        if (cat.tasks?.[0]) ex.onet.taskTeaser = cat.tasks[0]
      }
      return ex
    })

    byCip[cip4] = {
      cipTitle: prev?.cipTitle || cipTitle || `CIP ${cip4}`,
      category: prev?.category || categoryForCip(cip4),
      socExamples,
      acs: prev?.acs ?? { fieldOfDegreeNote: null, outsideFieldPct: null },
      sources: prev?.sources ?? ['O*NET', 'careerCatalog'],
    }

    if (prev) preserved++
    generated++
  }

  const output = { byCip }
  writeFileSync(enrichmentPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')
  console.log(
    `[buildCipEnrichment] Wrote ${generated} CIP entries (${preserved} merged with existing) → ${enrichmentPath}`,
  )
}

main()
