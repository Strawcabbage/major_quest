import { describe, it, expect } from 'vitest'
import {
  applyChoice,
  applyAnnualDebtInterest,
  applyFinancing,
  computeNetWorth,
  estimateDebtPayoffMonths,
  isGameOver,
  applyCityToStats,
  applyCareerPathNudge,
  applyCareerSkillDelta,
  resolvePlaythroughNodes,
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
  it('adds 6% interest to debt', () => {
    const state = { salary: 60000, bank: 5000, debt: 30000, happiness: 70 }
    const next = applyAnnualDebtInterest(state)
    expect(next.debt).toBeCloseTo(31800)
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

describe('estimateDebtPayoffMonths', () => {
  it('returns 0 when debt is paid', () => {
    expect(estimateDebtPayoffMonths({ debt: 0, annualSalary: 50000 })).toBe(0)
  })
  it('returns a positive month count for typical inputs', () => {
    const m = estimateDebtPayoffMonths({ debt: 30000, annualSalary: 60000 })
    expect(m).toBeGreaterThan(0)
    expect(m).toBeLessThan(400)
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
  it('returns six rows (years 0–5)', () => {
    const o = computeFiveYearOutlook({ salary: 60000, debt: 20000, bank: 5000, happiness: 70 }, { annualGrowthPct: 0.03 })
    expect(o.years).toHaveLength(6)
    expect(o.years[5].salary).toBeGreaterThan(o.years[0].salary)
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
