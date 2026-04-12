/**
 * College Scorecard Data Enrichment Script
 *
 * Fetches real median earnings and net-cost data from the College Scorecard API
 * and updates src/data/gameData.json with accurate initial_stats.
 *
 * Run once before the hackathon:
 *   node --env-file=.env.local scripts/fetchRealData.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY

if (!API_KEY) {
  console.error('❌  COLLEGE_SCORECARD_API_KEY not set. Add it to .env.local and re-run.')
  process.exit(1)
}

const BASE_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools.json'

// CIP 4-digit codes (no decimal) mapped to our major IDs
// CS: 11.01, Nursing: 51.38, English: 23.01
const MAJORS = [
  { major_id: 'cs_001',      cipCode: '1101', label: 'Computer Science' },
  { major_id: 'nursing_001', cipCode: '5138', label: 'Nursing'           },
  { major_id: 'english_001', cipCode: '2301', label: 'English'           },
]

const FIELDS = [
  'school.name',
  'latest.programs.cip_4_digit.code',
  'latest.programs.cip_4_digit.earnings.highest.2_yr.overall_median_earnings',
  'latest.cost.avg_net_price.overall',
].join(',')

/**
 * Fetch all pages for a given CIP code.
 * Returns an array of { earnings, avgNetPrice } objects.
 */
async function fetchDataForCIP(cipCode) {
  const results = []
  let page = 0
  const perPage = 100

  console.log(`  Fetching data for CIP ${cipCode}…`)

  while (true) {
    const url =
      `${BASE_URL}?api_key=${API_KEY}` +
      `&fields=${encodeURIComponent(FIELDS)}` +
      `&per_page=${perPage}` +
      `&page=${page}`

    const res = await fetch(url)
    if (!res.ok) {
      console.error(`  API error ${res.status}: ${await res.text()}`)
      break
    }

    const json = await res.json()
    const schools = json.results ?? []

    for (const school of schools) {
      const programs = school['latest.programs.cip_4_digit'] ?? []
      const avgNetPrice = school['latest.cost.avg_net_price.overall']

      for (const prog of programs) {
        if (String(prog.code) !== cipCode) continue
        const earnings = prog?.earnings?.highest?.['2_yr']?.overall_median_earnings
        if (typeof earnings === 'number' && typeof avgNetPrice === 'number') {
          results.push({ earnings, avgNetPrice })
        }
      }
    }

    const total = json.metadata?.total ?? 0
    const fetched = (page + 1) * perPage
    process.stdout.write(`    page ${page + 1} — ${Math.min(fetched, total)}/${total} schools\r`)

    if (fetched >= total) break
    page++

    // Polite rate limiting
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log(`\n  Found ${results.length} data points for CIP ${cipCode}`)
  return results
}

/**
 * Compute the median of a numeric array.
 */
function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function main() {
  console.log('🎓  College Scorecard Data Enrichment\n')

  const gameDataPath = join(__dirname, '../src/data/gameData.json')
  const benchmarksPath = join(__dirname, '../src/data/benchmarks.json')
  const gameData = JSON.parse(readFileSync(gameDataPath, 'utf-8'))

  let existingBenchmarks = { byCip: {} }
  try {
    existingBenchmarks = JSON.parse(readFileSync(benchmarksPath, 'utf-8'))
  } catch {
    /* first run */
  }

  const updates = {}
  const benchmarksByCip = { ...(existingBenchmarks.byCip ?? {}) }

  for (const { major_id, cipCode, label } of MAJORS) {
    console.log(`📊  ${label} (${major_id})`)

    const dataPoints = await fetchDataForCIP(cipCode)

    if (dataPoints.length === 0) {
      console.warn(`  ⚠️  No data found — keeping existing values\n`)
      continue
    }

    const medianEarnings = median(dataPoints.map((d) => d.earnings))
    // Typical 4-year program: multiply avg annual net price by 4 as debt proxy
    const medianAnnualCost = median(dataPoints.map((d) => d.avgNetPrice))
    const estimatedDebt = Math.round(medianAnnualCost * 4)

    updates[major_id] = {
      salary: medianEarnings,
      debt: estimatedDebt,
    }

    benchmarksByCip[cipCode] = {
      medianEarnings,
      medianDebt: estimatedDebt,
    }

    console.log(`  ✅  Median 2yr earnings:  $${medianEarnings.toLocaleString()}`)
    console.log(`  ✅  Estimated 4yr debt:   $${estimatedDebt.toLocaleString()}\n`)
  }

  // Apply updates to gameData
  let changed = 0
  for (const major of gameData.majors) {
    if (!updates[major.major_id]) continue

    const prev = { ...major.initial_stats }
    major.initial_stats.salary = updates[major.major_id].salary
    major.initial_stats.debt = updates[major.major_id].debt
    changed++

    console.log(`✏️   Updated ${major.title}:`)
    console.log(`    salary: $${prev.salary.toLocaleString()} → $${major.initial_stats.salary.toLocaleString()}`)
    console.log(`    debt:   $${prev.debt.toLocaleString()} → $${major.initial_stats.debt.toLocaleString()}`)
  }

  if (changed > 0) {
    writeFileSync(gameDataPath, JSON.stringify(gameData, null, 2) + '\n')
    console.log(`\n✅  gameData.json updated with real College Scorecard data.`)
    console.log(`    Source: https://collegescorecard.ed.gov`)
  } else {
    console.log('\n⚠️  No updates applied — gameData.json unchanged.')
  }

  writeFileSync(
    benchmarksPath,
    JSON.stringify({ byCip: benchmarksByCip }, null, 2) + '\n',
  )
  console.log(`\n✅  benchmarks.json written for national / CIP comparisons (${Object.keys(benchmarksByCip).length} codes).`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
