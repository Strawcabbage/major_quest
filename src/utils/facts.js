import benchmarks from '../data/benchmarks.json'
import { resolveTrackForCip } from '../engine/trackResolver'

const MAJOR_TO_BENCHMARK_CIP = {
  cs_001: '1101',
  nursing_001: '5138',
  english_001: '2301',
}

const SCORECARD_FOOTNOTE =
  'Figures are simplified for the game. Source: U.S. Dept. of Education College Scorecard (national aggregates in benchmarks.json; school/program from live API when available).'

export function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatPct01(x) {
  if (x == null || Number.isNaN(x)) return '—'
  return `${Math.round(x * 100)}%`
}

/**
 * Merge gameData major defaults with API-derived program and school hints.
 */
export function buildInitialStats(major, programSnapshot, schoolSnapshot) {
  const salary =
    programSnapshot?.earningsMedian ?? major.initial_stats.salary

  let debt = programSnapshot?.debtMedian
  if (debt == null && schoolSnapshot?.avgNetPrice != null) {
    debt = Math.round(schoolSnapshot.avgNetPrice * 4)
  }
  if (debt == null) debt = major.initial_stats.debt

  return {
    salary: Math.round(salary),
    debt: Math.round(Math.max(0, debt)),
    bank: major.initial_stats.bank,
    happiness: major.initial_stats.happiness,
  }
}

function benchmarkForCip(cipCode) {
  const key = String(cipCode).replace(/\D/g, '').slice(0, 4)
  const direct = benchmarks.byCip?.[key]
  if (direct) return direct
  const { trackId } = resolveTrackForCip(key)
  const anchor = MAJOR_TO_BENCHMARK_CIP[trackId]
  return anchor ? benchmarks.byCip?.[anchor] ?? null : null
}

export function buildSchoolFactLines(school) {
  const lines = []
  lines.push({ section: 'School' })
  if (school?.name) lines.push({ label: 'Institution', value: school.name })
  if (school?.city && school?.state) lines.push({ label: 'Location', value: `${school.city}, ${school.state}` })
  lines.push({ section: 'Admissions & Cost' })
  if (school?.admissionRate != null) {
    lines.push({ label: 'Admission rate', value: formatPct01(school.admissionRate) })
  } else {
    lines.push({ label: 'Admission rate', value: 'Not reported for this school' })
  }
  if (school?.avgNetPrice != null) {
    lines.push({ label: 'Avg. net price / yr', value: formatUsd(school.avgNetPrice) })
  } else {
    lines.push({ label: 'Avg. net price', value: 'Not reported — costs may use national defaults' })
  }
  return {
    title: 'Campus snapshot',
    lines,
    footnote: SCORECARD_FOOTNOTE,
  }
}

export function mergeProgramFactWithEnrichment(base, { extraLines = [], extraFootnoteParts = [] }) {
  const parts = extraFootnoteParts.filter(Boolean)
  return {
    title: base.title,
    lines: [...base.lines, ...extraLines.filter(Boolean)],
    footnote: [base.footnote, ...parts].filter(Boolean).join(' '),
  }
}

export function buildProgramFactLines(program, majorTitle) {
  const lines = []
  lines.push({ section: 'Program' })
  lines.push({ label: 'Field', value: program?.title ?? majorTitle ?? 'Selected program' })
  if (program?.cipCode) lines.push({ label: 'CIP code', value: program.cipCode })

  lines.push({ section: 'Outcomes' })
  if (program?.earningsMedian != null) {
    const src =
      program.earningsMedian2Yr != null
        ? '2 yr after completion'
        : program.earningsMedian1Yr != null
          ? '1 yr after completion'
          : 'reported cohort'
    lines.push({ label: `Median earnings (${src})`, value: formatUsd(program.earningsMedian) })
  } else {
    lines.push({ label: 'Median earnings', value: 'Not reported — using major default' })
  }
  if (program?.debtMedian != null) {
    lines.push({ label: 'Typical cumulative debt', value: formatUsd(program.debtMedian) })
  } else {
    lines.push({ label: 'Typical debt', value: 'Not reported — using net-price estimate or defaults' })
  }
  if (program?.completionRate != null) {
    lines.push({ label: 'Completion rate (4-yr, 150% time)', value: formatPct01(program.completionRate) })
  }

  const bench = program?.cipCode ? benchmarkForCip(program.cipCode) : null
  if (bench?.medianEarnings && program?.earningsMedian != null) {
    const diff = program.earningsMedian - bench.medianEarnings
    const pct = bench.medianEarnings ? Math.round((diff / bench.medianEarnings) * 100) : null
    if (pct != null) {
      lines.push({
        label: 'vs. national median',
        value: `${diff >= 0 ? '+' : ''}${pct}% (national ~${formatUsd(bench.medianEarnings)})`,
      })
    }
  } else if (bench?.medianEarnings) {
    lines.push({ label: 'National median (approx.)', value: formatUsd(bench.medianEarnings) })
  }

  return {
    title: 'Program reality check',
    lines,
    footnote: SCORECARD_FOOTNOTE,
  }
}

export function buildFinancingFactLines(financingId, statsBefore, statsAfter, financingLabel) {
  const lines = [
    { section: 'Selected Plan' },
    { label: 'Option', value: financingLabel },
    { section: 'Impact' },
    { label: 'Debt', value: `${formatUsd(statsBefore.debt)} → ${formatUsd(statsAfter.debt)}` },
    { label: 'Liquid savings', value: `${formatUsd(statsBefore.bank)} → ${formatUsd(statsAfter.bank)}` },
    { label: 'Wellbeing', value: `${statsBefore.happiness} → ${statsAfter.happiness}` },
  ]
  return {
    title: 'Financing impact',
    lines,
    footnote:
      'Multipliers are illustrative game mechanics tied to your Scorecard-based starting debt, not personalized financial advice.',
  }
}

export function debtToEarningsRatio(debt, annualSalary) {
  if (!annualSalary || annualSalary <= 0) return null
  return debt / annualSalary
}
