import { describe, it, expect } from 'vitest'
import {
  applyChoice,
  applyAnnualDebtInterest,
  applyFinancing,
  applyYearsBetweenNodes,
  computeNetWorth,
  estimateDebtPayoffMonths,
  isGameOver,
  applyCityToStats,
  applyCareerPathNudge,
  applyCareerSkillDelta,
  resolvePlaythroughNodes,
  buildCrossroadsNode,
  evaluateBadges,
  salaryToLivingWageRatio,
  computeFiveYearOutlook,
  fsaStaticFactSnippet,
} from '../engine/gameEngine'

describe('applyChoice', () => {
  it('applies bank_delta and happiness_delta to state', () => {
    const state = { salary: 75000, bank: 5000, debt: 35000, happiness: 70 }
    const impact = { bank_delta: 5000, happiness_delta: -10, salary_multiplier: 1.1, debt_delta: 0 }
    const next = applyChoice(state, impact)
    expect(next.bank).toBe(10000)
    expect(next.happiness).toBe(60)
    expect(next.salary).toBeCloseTo(82500)
    expect(next.debt).toBe(35000)
  })

  it('clamps happiness between 0 and 100', () => {
    const state = { salary: 50000, bank: 1000, debt: 10000, happiness: 5 }
    const impact = { bank_delta: 0, happiness_delta: -20, salary_multiplier: 1, debt_delta: 0 }
    const next = applyChoice(state, impact)
    expect(next.happiness).toBe(0)
  })

  it('applies debt_delta', () => {
    const state = { salary: 50000, bank: 5000, debt: 30000, happiness: 60 }
    const impact = { bank_delta: 0, happiness_delta: 0, salary_multiplier: 1, debt_delta: 12000 }
    const next = applyChoice(state, impact)
    expect(next.debt).toBe(42000)
  })
})

describe('applyAnnualDebtInterest', () => {
  it('adds interest at the default Direct Sub rate (6.53%)', () => {
    const state = { salary: 60000, bank: 5000, debt: 30000, happiness: 70 }
    const next = applyAnnualDebtInterest(state)
    expect(next.debt).toBeCloseTo(30000 * 1.0653)
  })

  it('uses the blended rate for a given financing plan', () => {
    const state = { salary: 60000, bank: 5000, debt: 30000, happiness: 70 }
    const next = applyAnnualDebtInterest(state, 'loans_full')
    expect(next.debt).toBeCloseTo(30000 * 1.0753)
  })

  it('does not change debt when debt is 0', () => {
    const state = { salary: 60000, bank: 5000, debt: 0, happiness: 70 }
    const next = applyAnnualDebtInterest(state)
    expect(next.debt).toBe(0)
  })
})

describe('computeNetWorth', () => {
  it('returns bank minus debt', () => {
    expect(computeNetWorth({ bank: 50000, debt: 35000 })).toBe(15000)
  })
})

describe('isGameOver', () => {
  it('returns true when all nodes are exhausted', () => {
    expect(isGameOver(4, 4)).toBe(true)
  })
  it('returns false when nodes remain', () => {
    expect(isGameOver(2, 4)).toBe(false)
  })
})

describe('applyFinancing', () => {
  it('scales debt and adjusts bank for scholarships path', () => {
    const state = { salary: 60000, bank: 2000, debt: 40000, happiness: 70 }
    const next = applyFinancing(state, 'scholarships')
    expect(next.debt).toBe(Math.round(40000 * 0.55))
    expect(next.bank).toBe(4500)
    expect(next.happiness).toBe(78)
  })
})

describe('applyYearsBetweenNodes', () => {
  it('grows salary by inflation, saves after-tax income, and reduces debt via IDR', () => {
    const state = { salary: 60000, bank: 0, debt: 30000, happiness: 70 }
    const next = applyYearsBetweenNodes(state, 3, 'scholarships')
    expect(next.salary).toBeGreaterThan(60000)
    expect(next.bank).toBeGreaterThan(0)
    expect(next.debt).toBeLessThan(30000)
  })
  it('does not go negative on debt', () => {
    const state = { salary: 200000, bank: 0, debt: 1000, happiness: 70 }
    const next = applyYearsBetweenNodes(state, 5)
    expect(next.debt).toBe(0)
  })
  it('returns unchanged state when years <= 0', () => {
    const state = { salary: 50000, bank: 1000, debt: 20000, happiness: 60 }
    const next = applyYearsBetweenNodes(state, 0)
    expect(next.salary).toBe(50000)
    expect(next.bank).toBe(1000)
  })
})

describe('estimateDebtPayoffMonths', () => {
  it('returns 0 when debt is paid', () => {
    expect(estimateDebtPayoffMonths({ debt: 0, annualSalary: 50000 })).toBe(0)
  })
  it('returns a positive month count for typical inputs', () => {
    const m = estimateDebtPayoffMonths({ debt: 30000, annualSalary: 60000 })
    expect(m).toBeGreaterThan(0)
    expect(m).toBeLessThan(500)
  })
  it('returns null when salary is too low for payment to cover interest', () => {
    const m = estimateDebtPayoffMonths({ debt: 100000, annualSalary: 15000 })
    expect(m).toBeNull()
  })
  it('repays small debt even at low salary thanks to $250 floor', () => {
    const m = estimateDebtPayoffMonths({ debt: 5000, annualSalary: 20000 })
    expect(m).toBeGreaterThan(0)
  })
  it('uses the financing plan blended rate when provided', () => {
    const base = estimateDebtPayoffMonths({ debt: 30000, annualSalary: 60000 })
    const higher = estimateDebtPayoffMonths({ debt: 30000, annualSalary: 60000, financingId: 'loans_full' })
    expect(higher).toBeGreaterThan(base)
  })
})

describe('applyCityToStats', () => {
  it('scales salary and adjusts happiness', () => {
    const s = { salary: 100000, bank: 2000, debt: 30000, happiness: 70 }
    const next = applyCityToStats(s, { regionalSalaryMultiplier: 1.1, happinessDelta: -2 })
    expect(next.salary).toBe(110000)
    expect(next.happiness).toBe(68)
  })
})

describe('applyCareerPathNudge', () => {
  it('does nothing without median wage', () => {
    const s = { salary: 50000, bank: 0, debt: 0, happiness: 50 }
    expect(applyCareerPathNudge(s, {}).salary).toBe(50000)
  })
  it('raises salary toward example wage', () => {
    const s = { salary: 40000, bank: 0, debt: 0, happiness: 50 }
    const next = applyCareerPathNudge(s, { medianWage: 100000 })
    expect(next.salary).toBeGreaterThan(40000)
  })
  it('applies statModifiers on top of median-wage blend', () => {
    const s = { salary: 50000, bank: 1000, debt: 0, happiness: 60 }
    const next = applyCareerPathNudge(s, { medianWage: 100000 }, {
      salaryMultiplier: 1.1,
      happinessDelta: -5,
      bankDelta: 2000,
    })
    expect(next.salary).toBeGreaterThan(50000 * 1.1)
    expect(next.happiness).toBe(55)
    expect(next.bank).toBe(3000)
  })
  it('clamps happiness inside 0..100 when statModifiers push past bounds', () => {
    const s = { salary: 50000, bank: 0, debt: 0, happiness: 98 }
    const next = applyCareerPathNudge(s, {}, { happinessDelta: 25 })
    expect(next.happiness).toBe(100)
  })
})

describe('applyCareerSkillDelta', () => {
  it('accumulates deltas across calls', () => {
    const a = applyCareerSkillDelta({}, { Programming: 2 })
    const b = applyCareerSkillDelta(a, { Programming: 1, 'Complex Problem Solving': 3 })
    expect(b).toEqual({ Programming: 3, 'Complex Problem Solving': 3 })
  })
  it('handles missing delta', () => {
    const a = applyCareerSkillDelta({ X: 1 }, null)
    expect(a).toEqual({ X: 1 })
  })
  it('ignores non-numeric entries', () => {
    const a = applyCareerSkillDelta({}, { Programming: 'two' })
    expect(a).toEqual({})
  })
})

describe('resolvePlaythroughNodes', () => {
  const base = [
    { node_id: 'n1', year: 1, phase: 'Early Career' },
    { node_id: 'n3', year: 3, phase: 'Early Career' },
    { node_id: 'n6', year: 6, phase: 'The Pivot' },
    { node_id: 'n10', year: 10, phase: 'Established Professional' },
  ]
  it('returns a shallow copy of base when no overrides', () => {
    const out = resolvePlaythroughNodes(base, [])
    expect(out).toHaveLength(4)
    expect(out[0]).not.toBe(base[0])
    expect(out[0].node_id).toBe('n1')
  })
  it('replaces a node by year', () => {
    const out = resolvePlaythroughNodes(base, [
      { replaceYear: 3, node: { node_id: 'override_3', year: 3, phase: 'Early Career' } },
    ])
    const y3 = out.find((n) => n.year === 3)
    expect(y3.node_id).toBe('override_3')
    expect(out).toHaveLength(4)
  })
  it('inserts a node after a given year and keeps sort order', () => {
    const out = resolvePlaythroughNodes(base, [
      { insertAfterYear: 6, node: { node_id: 'extra_7', year: 7, phase: 'The Pivot' } },
    ])
    expect(out.map((n) => n.year)).toEqual([1, 3, 6, 7, 10])
  })
  it('appends when insertAfterYear target is missing', () => {
    const out = resolvePlaythroughNodes(base, [
      { insertAfterYear: 99, node: { node_id: 'appended', year: 12 } },
    ])
    expect(out[out.length - 1].node_id).toBe('appended')
  })
})

describe('salaryToLivingWageRatio', () => {
  it('returns salary divided by living wage', () => {
    expect(salaryToLivingWageRatio(90000, 45000)).toBe(2)
  })
})

describe('computeFiveYearOutlook', () => {
  it('returns six rows (years 0–5) with salary growing by career growth + inflation', () => {
    const o = computeFiveYearOutlook({ salary: 60000, debt: 20000, bank: 5000, happiness: 70 }, { annualGrowthPct: 0.03 })
    expect(o.years).toHaveLength(6)
    expect(o.years[5].salary).toBeGreaterThan(o.years[0].salary)
    // Growth should compound career (3%) + inflation (2.9%) = ~5.9% per year
    expect(o.years[1].salary).toBeCloseTo(60000 * 1.059, -2)
  })
  it('reduces debt via IDR payments each year', () => {
    const o = computeFiveYearOutlook({ salary: 80000, debt: 40000, bank: 0, happiness: 70 }, { annualGrowthPct: 0.02 })
    expect(o.years[5].debt).toBeLessThan(40000)
  })
})

describe('buildCrossroadsNode', () => {
  it('returns a node with year 5 and isCrossroads flag', () => {
    const node = buildCrossroadsNode('Software Developer', 'Data Scientist')
    expect(node.year).toBe(5)
    expect(node.isCrossroads).toBe(true)
    expect(node.node_id).toBe('crossroads_mid')
  })
  it('has two options: stay and switch', () => {
    const node = buildCrossroadsNode('Nurse', 'Health Educator')
    expect(node.options).toHaveLength(2)
    expect(node.options[0].option_id).toBe('stay_course')
    expect(node.options[1].option_id).toBe('switch_career')
    expect(node.options[1].switchCareer).toBe(true)
  })
  it('embeds career titles into labels and ai_context', () => {
    const node = buildCrossroadsNode('Accountant', 'Financial Analyst')
    expect(node.ai_context).toContain('Accountant')
    expect(node.ai_context).toContain('Financial Analyst')
    expect(node.options[0].label).toContain('Accountant')
    expect(node.options[1].label).toContain('Financial Analyst')
  })
  it('stay option gives positive impact, switch gives penalty', () => {
    const node = buildCrossroadsNode('A', 'B')
    expect(node.options[0].impact.happiness_delta).toBeGreaterThan(0)
    expect(node.options[1].impact.happiness_delta).toBeLessThan(0)
    expect(node.options[0].impact.salary_multiplier).toBeGreaterThan(1)
    expect(node.options[1].impact.salary_multiplier).toBeLessThan(1)
  })
})

describe('evaluateBadges', () => {
  const baseState = {
    stats: { salary: 55000, debt: 30000, bank: 5000, happiness: 60 },
    choiceHistory: [],
    careerSkills: { 'Critical Thinking': 2, 'Active Learning': 1 },
    selectedCareerPath: { title: 'Analyst', brightOutlook: false },
    playthroughNodes: [],
  }

  it('returns empty array when no conditions are met', () => {
    expect(evaluateBadges(baseState)).toEqual([])
  })

  it('awards Debt Free when debt <= 0', () => {
    const state = { ...baseState, stats: { ...baseState.stats, debt: 0 } }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('debt_free')
  })

  it('awards Six Figures when salary >= 100k', () => {
    const state = { ...baseState, stats: { ...baseState.stats, salary: 105000 } }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('six_figures')
  })

  it('awards Max Happiness when happiness >= 90', () => {
    const state = { ...baseState, stats: { ...baseState.stats, happiness: 95 } }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('max_happiness')
  })

  it('awards Career Switcher when crossroads pivot is in history', () => {
    const state = {
      ...baseState,
      choiceHistory: [{ year: 5, phase: 'Crossroads', label: 'Pivot to Data Scientist (transition penalty)', impact: '' }],
    }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('career_switcher')
  })

  it('awards Bright Future for bright-outlook career', () => {
    const state = { ...baseState, selectedCareerPath: { title: 'Nurse', brightOutlook: true } }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('bright_future')
  })

  it('awards Skill Master when a skill reaches 4+', () => {
    const state = { ...baseState, careerSkills: { 'Critical Thinking': 4, 'Active Learning': 2 } }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('skill_master')
  })

  it('awards Against All Odds for high happiness with heavy debt', () => {
    const state = { ...baseState, stats: { ...baseState.stats, happiness: 80, debt: 60000 } }
    const ids = evaluateBadges(state).map((b) => b.id)
    expect(ids).toContain('against_all_odds')
  })

  it('returns empty for null stats', () => {
    expect(evaluateBadges({ stats: null })).toEqual([])
  })
})

describe('fsaStaticFactSnippet', () => {
  it('returns lines for known unit ids', () => {
    const sn = fsaStaticFactSnippet('166027')
    expect(sn?.lines?.length).toBeGreaterThan(0)
  })
  it('returns null for unknown school', () => {
    expect(fsaStaticFactSnippet('000000')).toBeNull()
  })
})
