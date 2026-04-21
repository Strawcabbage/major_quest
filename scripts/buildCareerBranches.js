/**
 * Auto-generate lightweight career branches from careerCatalog.json.
 *
 * For every SOC with at least 2 topSkills, produces:
 *   - skills (first 2 from topSkills)
 *   - statModifiers (salaryMultiplier from BLS wage or jobZone, happinessDelta from brightOutlook)
 *   - flavor (short sentence from title + skills)
 *
 * Hand-crafted branches (those with nodeOverrides) are preserved verbatim.
 *
 * Usage: node scripts/buildCareerBranches.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const catalogPath = join(__dirname, '../src/data/careerCatalog.json')
const branchesPath = join(__dirname, '../src/data/careerBranches.json')

const NATIONAL_MEDIAN = 48_060

function salaryMult(profile) {
  if (profile.bls?.medianAnnualWage) {
    const ratio = profile.bls.medianAnnualWage / NATIONAL_MEDIAN
    return Math.round(Math.min(1.20, Math.max(0.85, 0.85 + (ratio - 0.6) * 0.5)) * 100) / 100
  }
  const jz = profile.jobZone ?? 3
  return [0.92, 0.92, 0.96, 1.0, 1.04, 1.08][jz] ?? 1.0
}

function happinessDelta(profile) {
  let d = 0
  if (profile.brightOutlook) d += 3
  if ((profile.jobZone ?? 3) >= 5) d -= 2
  return d
}

function buildFlavor(profile) {
  const skills = (profile.topSkills || []).slice(0, 2)
  if (skills.length < 2) return `Career in ${profile.title || 'this field'}.`
  return `Day-to-day relies on ${skills[0]} and ${skills[1]}.`
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
const existing = JSON.parse(readFileSync(branchesPath, 'utf-8'))

const handCrafted = new Set(
  Object.entries(existing.bySoc || {})
    .filter(([, v]) => Array.isArray(v.nodeOverrides) && v.nodeOverrides.length > 0)
    .map(([k]) => k)
)

const bySoc = {}
let generated = 0

for (const [soc, profile] of Object.entries(catalog.bySoc || {})) {
  if (handCrafted.has(soc)) {
    bySoc[soc] = existing.bySoc[soc]
    continue
  }
  const skills = (profile.topSkills || []).slice(0, 2)
  if (skills.length < 2) continue

  bySoc[soc] = {
    statModifiers: {
      salaryMultiplier: salaryMult(profile),
      happinessDelta: happinessDelta(profile),
      bankDelta: 0,
    },
    skills,
    flavor: buildFlavor(profile),
  }
  generated++
}

for (const soc of handCrafted) {
  if (!bySoc[soc]) bySoc[soc] = existing.bySoc[soc]
}

const output = {
  note: existing.note,
  defaultMechanicsTag: existing.defaultMechanicsTag,
  bySoc,
}

writeFileSync(branchesPath, JSON.stringify(output, null, 2) + '\n')
console.log(`[buildCareerBranches] Done. ${handCrafted.size} hand-crafted preserved, ${generated} generated. Total: ${Object.keys(bySoc).length}`)
