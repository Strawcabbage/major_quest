import fsaSchoolHints from '../data/fsaSchoolHints.json'

// Federal student loan rate tiers (2024-25 academic year)
const DIRECT_SUB_RATE = 0.0653
const DIRECT_UNSUB_RATE = 0.0653
const GRAD_PLUS_RATE = 0.0853
const PARENT_PLUS_RATE = 0.0853

// BLS CPI-U trailing 10-year average inflation
const INFLATION_RATE = 0.029

// Income-Driven Repayment (SAVE/IBR-style) parameters
const IDR_INCOME_PCT = 0.10
const IDR_POVERTY_GUIDELINE = 15_060 // 2024 FPL for single filer
const IDR_FPL_MULTIPLIER = 1.5 // 150% of FPL is the discretionary income threshold

// Rough effective federal+state tax rate for median earners
const EFFECTIVE_TAX_RATE = 0.22

// Fraction of after-tax income saved annually
const ANNUAL_SAVINGS_RATE = 0.10

// Legacy alias kept for applyAnnualDebtInterest default
const DEBT_INTEREST_RATE = DIRECT_SUB_RATE

/** Financing packages applied after initial stats are built from Scorecard + major defaults */
export const FINANCING_OPTIONS = [
  {
    id: 'scholarships',
    label: 'Scholarships & grants first',
    blurb: 'Stack merit aid and Pell-style support; borrow only a small gap at the 6.53% Direct Subsidized rate.',
    debtMultiplier: 0.55,
    bankDelta: 2500,
    happinessDelta: 8,
    blendedRate: DIRECT_SUB_RATE,
  },
  {
    id: 'mixed',
    label: 'Balanced aid + loans',
    blurb: 'Typical mix of federal loans and some family contribution at a blended ~6.8% federal rate.',
    debtMultiplier: 0.85,
    bankDelta: 1500,
    happinessDelta: 2,
    blendedRate: 0.0680,
  },
  {
    id: 'work_study',
    label: 'Work part-time through school',
    blurb: 'Earn while you learn; less borrowing at the 6.53% Direct Subsidized rate but tighter schedules.',
    debtMultiplier: 0.92,
    bankDelta: 8000,
    happinessDelta: -5,
    blendedRate: DIRECT_SUB_RATE,
  },
  {
    id: 'loans_full',
    label: 'Mostly loans',
    blurb: 'Cover full cost of attendance with borrowing at a blended ~7.5% rate including Grad PLUS.',
    debtMultiplier: 1.08,
    bankDelta: 1000,
    happinessDelta: -3,
    blendedRate: 0.0753,
  },
]

function rateForFinancing(financingId) {
  const opt = FINANCING_OPTIONS.find((o) => o.id === financingId)
  return opt?.blendedRate ?? DIRECT_SUB_RATE
}

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
 * Rough months to pay off student debt using IDR-style payments
 * (10% of discretionary income above 150% FPL, floor $250/mo).
 * Uses the financing archetype's blended federal rate.
 */
export function estimateDebtPayoffMonths({ debt, annualSalary, financingId }) {
  if (debt <= 0) return 0
  if (!annualSalary || annualSalary <= 0) return null
  const rate = rateForFinancing(financingId)
  const monthlyRate = rate / 12
  const fpl150 = IDR_POVERTY_GUIDELINE * IDR_FPL_MULTIPLIER
  const monthlyPayment = Math.max(250, ((annualSalary - fpl150) * IDR_INCOME_PCT) / 12)
  let balance = debt
  let months = 0
  const maxMonths = 600
  while (balance > 1 && months < maxMonths) {
    const interest = balance * monthlyRate
    const payment = Math.min(balance + interest, monthlyPayment)
    if (payment <= interest) return null
    balance = balance + interest - payment
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
 * Simulate years passing between decision nodes.
 * Each year: accrue debt interest at the financing archetype's blended federal rate,
 * apply an IDR-style payment, grow salary by BLS inflation, and save after-tax income.
 * @param {object} state
 * @param {number} years - number of years elapsed since the last decision
 * @param {string} [financingId] - player's chosen financing plan (for rate lookup)
 */
export function applyYearsBetweenNodes(state, years, financingId) {
  if (years <= 0) return { ...state }
  const rate = rateForFinancing(financingId)
  const fpl150 = IDR_POVERTY_GUIDELINE * IDR_FPL_MULTIPLIER
  let { salary, bank, debt } = state
  for (let i = 0; i < years; i++) {
    if (debt > 0) {
      debt = debt * (1 + rate)
      const idrPayment = Math.max(0, (salary - fpl150) * IDR_INCOME_PCT)
      debt = Math.max(0, debt - idrPayment)
    }
    salary = Math.round(salary * (1 + INFLATION_RATE))
    bank += Math.round(salary * (1 - EFFECTIVE_TAX_RATE) * ANNUAL_SAVINGS_RATE)
  }
  return { ...state, salary, bank, debt: Math.max(0, debt) }
}

/**
 * Accrue annual student loan interest at the financing archetype's federal rate.
 * @param {object} state
 * @param {string} [financingId] - optional financing plan for rate lookup
 */
export function applyAnnualDebtInterest(state, financingId) {
  if (state.debt <= 0) return state
  const rate = rateForFinancing(financingId)
  return {
    ...state,
    debt: state.debt * (1 + rate),
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
 * Build a mid-game crossroads node that lets the player stay or switch careers.
 * @param {string} careerTitle - current career title
 * @param {string} relatedTitle - related career the player can pivot to
 */
export function buildCrossroadsNode(careerTitle, relatedTitle) {
  return {
    node_id: 'crossroads_mid',
    year: 5,
    phase: 'Crossroads',
    ai_context: `Mid-career professional weighing whether to stay in ${careerTitle} or pivot to ${relatedTitle}`,
    isCrossroads: true,
    options: [
      {
        option_id: 'stay_course',
        label: `Double down on ${careerTitle}`,
        impact: { bank_delta: 3000, happiness_delta: 5, salary_multiplier: 1.10, debt_delta: 0 },
      },
      {
        option_id: 'switch_career',
        label: `Pivot to ${relatedTitle} (transition penalty)`,
        impact: { bank_delta: -5000, happiness_delta: -8, salary_multiplier: 0.85, debt_delta: 0 },
        switchCareer: true,
      },
    ],
  }
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
 * Uses career-specific growth + BLS inflation, archetype loan rate, and IDR payments.
 * @param {object} stats
 * @param {{ annualGrowthPct?: number, financingId?: string }} opts
 */
export function computeFiveYearOutlook(stats, opts = {}) {
  const careerGrowth = typeof opts.annualGrowthPct === 'number' ? opts.annualGrowthPct : 0.03
  const g = careerGrowth + INFLATION_RATE
  const rate = rateForFinancing(opts.financingId)
  const fpl150 = IDR_POVERTY_GUIDELINE * IDR_FPL_MULTIPLIER
  const years = []
  let salary = stats.salary
  let debt = stats.debt
  let cumulativeSavings = 0
  for (let y = 0; y <= 5; y += 1) {
    if (y > 0) {
      salary = Math.round(salary * (1 + g))
      if (debt > 0) {
        debt = debt * (1 + rate)
        const idrPayment = Math.max(0, (salary - fpl150) * IDR_INCOME_PCT)
        debt = Math.max(0, debt - idrPayment)
      }
      cumulativeSavings += Math.round(salary * (1 - EFFECTIVE_TAX_RATE) * ANNUAL_SAVINGS_RATE)
    }
    years.push({
      year: y,
      salary,
      debt: Math.round(debt),
      netWorth: Math.round(stats.bank + cumulativeSavings - debt),
    })
  }
  return { years, annualGrowthPct: careerGrowth }
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

export const BADGE_DEFS = [
  { id: 'debt_free', label: 'Debt Free', icon: '🏦', desc: 'Ended with zero debt' },
  { id: 'six_figures', label: 'Six Figures', icon: '💰', desc: 'Final salary >= $100,000' },
  { id: 'max_happiness', label: 'Max Happiness', icon: '😊', desc: 'Happiness reached 90+' },
  { id: 'penny_pincher', label: 'Penny Pincher', icon: '🐷', desc: 'Bank balance >= $100,000' },
  { id: 'millionaire', label: 'Millionaire', icon: '🤑', desc: 'Net worth >= $1,000,000' },
  { id: 'career_switcher', label: 'Career Switcher', icon: '🔀', desc: 'Switched careers at the crossroads' },
  { id: 'bright_future', label: 'Bright Future', icon: '☀️', desc: 'Picked a bright-outlook career' },
  { id: 'skill_master', label: 'Skill Master', icon: '🎯', desc: 'Maxed a career skill to 4+' },
  { id: 'against_all_odds', label: 'Against All Odds', icon: '🏔️', desc: 'Happy (75+) despite heavy debt ($50k+)' },
  { id: 'speed_run', label: 'Speed Run', icon: '⚡', desc: 'Always picked the first option' },
]

/**
 * Evaluate which badges the player earned from final game state.
 * @param {{ stats, choiceHistory, careerSkills, selectedCareerPath }} state
 * @returns {{ id: string, label: string, icon: string, desc: string }[]}
 */
export function evaluateBadges(state) {
  const { stats, choiceHistory, careerSkills, selectedCareerPath } = state
  if (!stats) return []
  const earned = []
  const netWorth = computeNetWorth(stats)

  if (stats.debt <= 0) earned.push('debt_free')
  if (stats.salary >= 100_000) earned.push('six_figures')
  if (stats.happiness >= 90) earned.push('max_happiness')
  if (stats.bank >= 100_000) earned.push('penny_pincher')
  if (netWorth >= 1_000_000) earned.push('millionaire')

  const switchedCareer = Array.isArray(choiceHistory) &&
    choiceHistory.some((c) => c.phase === 'Crossroads' && /pivot/i.test(c.label))
  if (switchedCareer) earned.push('career_switcher')

  if (selectedCareerPath?.brightOutlook) earned.push('bright_future')

  const skillValues = careerSkills ? Object.values(careerSkills) : []
  if (skillValues.some((v) => v >= 4)) earned.push('skill_master')

  if (stats.happiness >= 75 && stats.debt > 50_000) earned.push('against_all_odds')

  const allFirstOption = Array.isArray(choiceHistory) && choiceHistory.length > 0 &&
    choiceHistory.every((c, i) => {
      const label = c.label ?? ''
      return label === (state.playthroughNodes?.[i]?.options?.[0]?.label ?? label)
    })
  if (allFirstOption && choiceHistory.length >= 4) earned.push('speed_run')

  return BADGE_DEFS.filter((b) => earned.includes(b.id))
}
