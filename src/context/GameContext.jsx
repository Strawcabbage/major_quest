import { createContext, useContext, useReducer, useCallback } from 'react'
import { applyChoice, applyAnnualDebtInterest, isGameOver } from '../engine/gameEngine'

const GameContext = createContext(null)

const initialState = {
  phase: 'major_selection', // 'major_selection' | 'playing' | 'game_over'
  selectedMajor: null,
  stats: null,
  currentNodeIndex: 0,
  choiceHistory: [],
  scenarioText: null,   // AI-generated { title, story } for current node
  retrospective: null,  // AI-generated { title, story } final summary
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'SELECT_MAJOR':
      return {
        ...initialState,
        phase: 'playing',
        selectedMajor: action.major,
        stats: { ...action.major.initial_stats },
        currentNodeIndex: 0,
      }

    case 'SET_SCENARIO_TEXT':
      return { ...state, scenarioText: action.text }

    case 'MAKE_CHOICE': {
      const { option, node } = action
      const afterChoice = applyChoice(state.stats, option.impact)
      const afterInterest = applyAnnualDebtInterest(afterChoice)
      const nextIndex = state.currentNodeIndex + 1
      const totalNodes = state.selectedMajor.nodes.length
      const gameOver = isGameOver(nextIndex, totalNodes)

      return {
        ...state,
        stats: afterInterest,
        currentNodeIndex: nextIndex,
        scenarioText: null,
        choiceHistory: [
          ...state.choiceHistory,
          {
            year: node.year,
            phase: node.phase,
            label: option.label,
            impact: `bank ${option.impact.bank_delta >= 0 ? '+' : ''}${option.impact.bank_delta}, happiness ${option.impact.happiness_delta >= 0 ? '+' : ''}${option.impact.happiness_delta}`,
          },
        ],
        phase: gameOver ? 'game_over' : 'playing',
      }
    }

    case 'SET_RETROSPECTIVE':
      return { ...state, retrospective: action.text }

    case 'RESTART':
      return { ...initialState }

    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const selectMajor = useCallback((major) => {
    dispatch({ type: 'SELECT_MAJOR', major })
  }, [])

  const makeChoice = useCallback((option, node) => {
    dispatch({ type: 'MAKE_CHOICE', option, node })
  }, [])

  const setScenarioText = useCallback((text) => {
    dispatch({ type: 'SET_SCENARIO_TEXT', text })
  }, [])

  const setRetrospective = useCallback((text) => {
    dispatch({ type: 'SET_RETROSPECTIVE', text })
  }, [])

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' })
  }, [])

  return (
    <GameContext.Provider value={{ state, selectMajor, makeChoice, setScenarioText, setRetrospective, restart }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
