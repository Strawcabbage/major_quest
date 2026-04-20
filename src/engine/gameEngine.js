import fsaSchoolHints from '../data/fsaSchoolHints.json'

const DEBT_INTEREST_RATE = 0.06

/** Financing packages applied after initial stats are built from Scorecard + major defaults */
export const FINANCING_OPTIONS = [
  {
    id: 'scholarships',
    label: 'Scholarships & grants first',
    blurb: 'Stack merit aid and Pell-style support; borrow only a small gap.',
    debtMultiplier: 0.55,
    bankDelta: 2500,
    happinessDelta: 8,
  },
  {
    id: 'mixed',
    label: 'Balanced aid + loans',
    blurb: 'Typical mix of federal loans and some family contribution.',
    debtMultiplier: 0.85,
    bankDelta: 1500,
    happinessDelta: 2,
  },
  {
    id: 'work_study',
    label: 'Work part-time through school',
    blurb: 'Earn while you learn; less borrowing but tighter schedules.',
    debtMultiplier: 0.92,
    bankDelta: 8000,
    happinessDelta: -5,
  },
  {
    id: 'loans_full',
    label: 'Mostly loans',
    blurb: 'Cover full cost of attendance with borrowing.',
    debtMultiplier: 1.08,
    bankDelta: 1000,
    happinessDelta: -3,
  },
]

/**
 * Adjust starting finances based on how the player funded college.
 */
export function applyFinancing(stats, financingId) {
  const opt = FINANCING_OPTIONS.find((o) => o.id === financingId)
  if (!opt) return { ...stats }
  const newDebt = Math.max(0, Math.round(stats.debt * opt.debtMultiplier))
  const newBank = stats.bank + opt.bankDelta
  const newHappiness = Math.min(100, Math.max(0, stats.happiness + opt.happinessDelta))
  return {
    ...stats,
    debt: newDebt,
    bank: newBank,
    happiness: newHappiness,
  }
}

/**
 * Rough months to pay off student debt if the player dedicates ~10% of gross salary monthly
 * at `annualRate` APR (simplified; for UI copy only).
 */
export function estimateDebtPayoffMonths({ debt, annualSalary, annualRate = 0.06 }) {
  if (debt <= 0) return 0
  if (!annualSalary || annualSalary <= 0) return null
  const monthlyTowardDebt = Math.max(250, (annualSalary * 0.1) / 12)
  const monthlyRate = annualRate / 12
  let balance = debt
  let months = 0
  const maxMonths = 600
  while (balance > 1 && months < maxMonths) {
    const interest = balance * monthlyRate
    const principal = Math.min(balance, monthlyTowardDebt - interest)
    if (principal <= 0) return null
    balance = balance + interest - monthlyTowardDebt
    months += 1
  }
  return months >= maxMonths ? null : months
}

/**
 * Apply a player's choice impact to the current game state.
 * All math lives here — no AI, no React.
 */
export function applyChoice(state, impact) {
  const newSalary = state.salary * impact.salary_multiplier
  const newBank = state.bank + impact.bank_delta
  const newDebt = Math.max(0, state.debt + impact.debt_delta)
  const newHappiness = Math.min(100, Math.max(0, state.happiness + impact.happiness_delta))

  return {
    ...state,
    salary: newSalary,
    bank: newBank,
    debt: newDebt,
    happiness: newHappiness,
  }
}

/**
 * Accrue annual student loan interest at 6% APR.
 */
export function applyAnnualDebtInterest(state) {
  if (state.debt <= 0) return state
  return {
    ...state,
    debt: state.debt * (1 + DEBT_INTEREST_RATE),
  }
}

/**
 * Net worth = bank savings minus remaining debt.
 */
export function computeNetWorth(state) {
  return state.bank - state.debt
}

/**
 * True when the player has played through all decision nodes.
 */
export function isGameOver(currentNodeIndex, totalNodes) {
  return currentNodeIndex >= totalNodes
}

/**
 * Apply regional pay + small wellbeing nudge from chosen city (static table).
 * @param {object} stats
 * @param {{ regionalSalaryMultiplier?: number, happinessDelta?: number }} city
 */
/**
 * Nudge modeled salary toward a national example occupation wage (static JSON / BLS extract)
 * and apply optional per-SOC statModifiers from careerBranches.json.
 * @param {object} stats
 * @param {{ medianWage?: number|null }} career
 * @param {{ salaryMultiplier?: number, happinessDelta?: number, bankDelta?: number } | null} [statModifiers]
 */
export function applyCareerPathNudge(stats, career, statModifiers) {
  if (!stats) return stats
  let next = { ...stats }
  if (career?.medianWage && career.medianWage > 0) {
    const blended = Math.round(next.salary * 0.65 + career.medianWage * 0.35)
    next.salary = Math.max(next.salary, blended)
  }
  if (statModifiers) {
    if (typeof statModifiers.salaryMultiplier === 'number') {
      next.salary = Math.round(next.salary * statModifiers.salaryMultiplier)
    }
    if (typeof statModifiers.happinessDelta === 'number') {
      next.happiness = Math.min(100, Math.max(0, next.happiness + statModifiers.happinessDelta))
    }
    if (typeof statModifiers.bankDelta === 'number') {
      next.bank = next.bank + statModifiers.bankDelta
    }
  }
  return next
}

/**
 * Merge career-branch node overrides into a base list of decision nodes.
 * - `replaceYear`: swap the node whose `year` matches.
 * - `insertAfterYear`: inject a new node after the last node with that year.
 * Nodes are kept sorted by year.
 * @param {Array<object>} baseNodes
 * @param {Array<{ replaceYear?: number, insertAfterYear?: number, node: object }>} [overrides]
 */
export function resolvePlaythroughNodes(baseNodes, overrides) {
  const list = Array.isArray(baseNodes) ? baseNodes.map((n) => ({ ...n })) : []
  if (!Array.isArray(overrides) || overrides.length === 0) return list
  for (const ov of overrides) {
    if (!ov?.node) continue
    if (typeof ov.replaceYear === 'number') {
      const idx = list.findIndex((n) => n.year === ov.replaceYear)
      if (idx >= 0) {
        list[idx] = { ...ov.node }
      } else {
        list.push({ ...ov.node })
      }
    } else if (typeof ov.insertAfterYear === 'number') {
      let idx = -1
      for (let i = list.length - 1; i >= 0; i -= 1) {
        if (list[i].year === ov.insertAfterYear) {
          idx = i
          break
        }
      }
      const insertAt = idx >= 0 ? idx + 1 : list.length
      list.splice(insertAt, 0, { ...ov.node })
    } else {
      list.push({ ...ov.node })
    }
  }
  return list.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
}

/**
 * Merge a `{ skill: delta }` map into the existing careerSkills state.
 * @param {Record<string, number>} current
 * @param {Record<string, number> | null | undefined} delta
 * @returns {Record<string, number>}
 */
export function applyCareerSkillDelta(current, delta) {
  if (!delta || typeof delta !== 'object') return { ...(current ?? {}) }
  const next = { ...(current ?? {}) }
  for (const [skill, d] of Object.entries(delta)) {
    if (typeof d !== 'number') continue
    next[skill] = (next[skill] ?? 0) + d
  }
  return next
}

export function applyCityToStats(stats, city) {
  if (!stats || !city) return { ...stats }
  const mult = typeof city.regionalSalaryMultiplier === 'number' ? city.regionalSalaryMultiplier : 1
  const hd = typeof city.happinessDelta === 'number' ? city.happinessDelta : 0
  return {
    ...stats,
    salary: Math.round(stats.salary * mult),
    happiness: Math.min(100, Math.max(0, stats.happiness + hd)),
  }
}

/**
 * Salary vs living wage (annual); >1 means median salary covers the modeled floor.
 */
export function salaryToLivingWageRatio(annualSalary, livingWageAnnual) {
  if (!annualSalary || annualSalary <= 0 || !livingWageAnnual || livingWageAnnual <= 0) return null
  return annualSalary / livingWageAnnual
}

/**
 * Toy 5-year forward view for UI (not actuarial advice).
 * @param {object} stats
 * @param {{ annualGrowthPct?: number }} opts
 */
export function computeFiveYearOutlook(stats, opts = {}) {
  const g = typeof opts.annualGrowthPct === 'number' ? opts.annualGrowthPct : 0.03
  const years = []
  let salary = stats.salary
  let debt = stats.debt
  const bank = stats.bank
  for (let y = 0; y <= 5; y += 1) {
    if (y > 0) {
      salary = Math.round(salary * (1 + g))
      debt = Math.max(0, Math.round(debt * 0.92))
    }
    years.push({
      year: y,
      salary,
      debt,
      netWorth: Math.round(bank + y * 1500 - debt),
    })
  }
  return { years, annualGrowthPct: g }
}

/**
 * @param {string|number|null|undefined} unitId
 * @returns {{ lines: string[], footnote?: string } | null}
 */
export function fsaStaticFactSnippet(unitId) {
  const key = unitId != null ? String(unitId) : ''
  const row = fsaSchoolHints.byUnitId?.[key]
  if (!row) return null
  const pct = typeof row.cohortDefaultRate3yr === 'number' ? row.cohortDefaultRate3yr * 100 : null
  const lines = []
  if (pct != null) lines.push(`Illustrative cohort default rate (static FSA-style demo): ${pct.toFixed(1)}%.`)
  if (row.note) lines.push(row.note)
  return {
    lines,
    footnote: fsaSchoolHints.footnote,
  }
}
