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
