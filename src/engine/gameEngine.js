const DEBT_INTEREST_RATE = 0.06

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
