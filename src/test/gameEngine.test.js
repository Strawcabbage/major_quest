import { describe, it, expect } from 'vitest'
import {
  applyChoice,
  applyAnnualDebtInterest,
  computeNetWorth,
  isGameOver,
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
