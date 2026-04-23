import { createContext, useContext, useReducer, useCallback } from 'react'
import {
  applyChoice,
  applyYearsBetweenNodes,
  applyFinancing,
  isGameOver,
  applyCityToStats,
  applyCareerPathNudge,
  applyCareerSkillDelta,
  resolvePlaythroughNodes,
  buildCrossroadsNode,
  computeNetWorth,
  evaluateBadges,
} from '../engine/gameEngine'
import { buildInitialStats } from '../utils/facts'
import careerBranches from '../data/careerBranches.json'

const GameContext = createContext(null)

/** @typedef {'title'|'how_to_play'|'data_sources'|'character'|'school'|'major'|'career_path'|'city'|'financing'|'five_year_outlook'|'playing'|'game_over'} GamePhase */

const STORAGE_KEY = 'major_quest_save'

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.phase !== 'string') return null
    parsed.factModal = null
    parsed.factAfterClose = null
    parsed.scenarioText = null
    parsed.retrospective = null
    return parsed
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    const { factModal, factAfterClose, scenarioText, retrospective, ...rest } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch { /* quota exceeded or unavailable */ }
}

function clearSave() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// eslint-disable-next-line react-refresh/only-export-components -- utility for TitleScreen
export function hasSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.phase === 'string' && parsed.phase !== 'title'
  } catch {
    return false
  }
}

const HISTORY_KEY = 'major_quest_history'
const MAX_HISTORY = 20

function saveRunToHistory(state) {
  try {
    const history = getRunHistory()
    const last = history[0]
    if (last && Date.now() - last.id < 2000) return
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      major: state.selectedMajor ? `${state.selectedMajor.emoji} ${state.selectedMajor.title}` : 'Unknown',
      school: state.school?.name ?? null,
      career: state.selectedCareerPath?.title ?? null,
      salary: state.stats?.salary ?? 0,
      debt: state.stats?.debt ?? 0,
      happiness: state.stats?.happiness ?? 0,
      netWorth: computeNetWorth(state.stats),
      badges: evaluateBadges(state).map((b) => b.id),
    }
    history.unshift(entry)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
  } catch { /* quota exceeded or unavailable */ }
}

// eslint-disable-next-line react-refresh/only-export-components -- utility for TitleScreen
export function getRunHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- utility for TitleScreen
export function clearRunHistory() {
  try { localStorage.removeItem(HISTORY_KEY) } catch { /* ignore */ }
}

const initialState = {
  phase: /** @type {GamePhase} */ ('title'),
  playerName: '',
  avatarId: 'av_1',
  school: null,
  program: null,
  financingId: null,
  selectedMajor: null,
  stats: null,
  currentNodeIndex: 0,
  choiceHistory: [],
  scenarioText: null,
  retrospective: null,
  factModal: null,
  /** When set, CLOSE_FACT advances the adventure to this phase (or starts `playing`). */
  factAfterClose: null,
  /** Stats after program selection, before financing — for fact copy */
  statsBeforeFinancing: null,
  selectedCareerPath: null,
  selectedCity: null,
  outlookPreview: null,
  dataQualityFlags: { career: 'scorecard_only', city: 'default' },
  /** Nodes the playing phase walks through; seeded from selectedMajor + career overrides. */
  playthroughNodes: [],
  /** Running skill tallies from career-flavored option skillDelta values. */
  careerSkills: {},
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'GO_PHASE':
      return { ...state, phase: action.phase }

    case 'SET_PLAYER':
      return {
        ...state,
        playerName: action.name,
        avatarId: action.avatarId,
      }

    case 'SET_SCHOOL':
      return {
        ...state,
        school: action.school,
        program: null,
        selectedMajor: null,
        stats: null,
        statsBeforeFinancing: null,
        financingId: null,
        selectedCareerPath: null,
        selectedCity: null,
        outlookPreview: null,
        dataQualityFlags: { career: 'scorecard_only', city: 'default' },
        playthroughNodes: [],
        careerSkills: {},
      }

    case 'SET_PROGRAM_AND_MAJOR': {
      const base = buildInitialStats(action.major, action.program, state.school)
      return {
        ...state,
        program: action.program,
        selectedMajor: action.major,
        statsBeforeFinancing: base,
        stats: base,
        selectedCareerPath: null,
        selectedCity: null,
        outlookPreview: null,
        financingId: null,
        dataQualityFlags: { career: 'scorecard_only', city: 'default' },
        playthroughNodes: [...(action.major?.nodes ?? [])],
        careerSkills: {},
      }
    }

    case 'SET_CAREER_PATH': {
      if (!state.stats || !state.statsBeforeFinancing) return state
      const career = action.career
      const branch = career?.soc ? careerBranches.bySoc?.[career.soc] ?? null : null
      const statMods = branch?.statModifiers ?? null
      const nextStats = applyCareerPathNudge(state.stats, career, statMods)
      const nextBefore = applyCareerPathNudge(state.statsBeforeFinancing, career, statMods)
      const baseNodes = state.selectedMajor?.nodes ?? []
      const overrides = branch?.nodeOverrides ?? []
      let playthroughNodes = resolvePlaythroughNodes(baseNodes, overrides)
      if (career.relatedCareer?.title) {
        const crossroads = buildCrossroadsNode(career.title, career.relatedCareer.title)
        playthroughNodes.push(crossroads)
        playthroughNodes.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
      }
      const seedSkills = Array.isArray(branch?.skills)
        ? branch.skills.reduce((acc, name) => ({ ...acc, [name]: 0 }), {})
        : {}
      return {
        ...state,
        selectedCareerPath: { ...career, mechanicsApplied: Boolean(branch) },
        stats: nextStats,
        statsBeforeFinancing: nextBefore,
        dataQualityFlags: {
          ...state.dataQualityFlags,
          career: action.dataQuality ?? 'full',
        },
        playthroughNodes,
        careerSkills: seedSkills,
      }
    }

    case 'APPLY_CITY_TO_STATS': {
      if (!state.stats || !state.statsBeforeFinancing) return state
      const city = action.city
      return {
        ...state,
        selectedCity: city,
        stats: applyCityToStats(state.stats, city),
        statsBeforeFinancing: applyCityToStats(state.statsBeforeFinancing, city),
        dataQualityFlags: { ...state.dataQualityFlags, city: 'full' },
      }
    }

    case 'START_PLAYING_AFTER_OUTLOOK':
      return {
        ...state,
        outlookPreview: action.outlookPreview ?? null,
        phase: 'playing',
        currentNodeIndex: 0,
        choiceHistory: [],
        scenarioText: null,
        retrospective: null,
      }

    case 'OPEN_FACT': {
      const p = action.payload
      return {
        ...state,
        factModal: {
          title: p.title,
          lines: p.lines,
          footnote: p.footnote,
          backPhase: p.backPhase ?? null,
        },
        factAfterClose: p.afterClose ?? null,
      }
    }

    case 'CLOSE_FACT_BACK':
      return { ...state, factModal: null, factAfterClose: null, phase: action.phase }

    case 'CLOSE_FACT': {
      const dest = state.factAfterClose
      const base = { ...state, factModal: null, factAfterClose: null }
      if (!dest) return base
      if (dest === 'playing') {
        return {
          ...base,
          phase: 'playing',
          currentNodeIndex: 0,
          choiceHistory: [],
          scenarioText: null,
          retrospective: null,
        }
      }
      return { ...base, phase: dest }
    }

    case 'SET_FINANCING_START': {
      const { financingId } = action
      if (!state.statsBeforeFinancing) return state
      const after = applyFinancing(state.statsBeforeFinancing, financingId)
      return {
        ...state,
        financingId,
        stats: after,
      }
    }

    case 'SET_SCENARIO_TEXT':
      return { ...state, scenarioText: action.text }

    case 'MAKE_CHOICE': {
      const { option, node } = action
      const afterChoice = applyChoice(state.stats, option.impact)
      const playthrough = state.playthroughNodes?.length
        ? state.playthroughNodes
        : state.selectedMajor?.nodes ?? []
      const prevNode = state.currentNodeIndex > 0 ? playthrough[state.currentNodeIndex - 1] : null
      const yearsBetween = Math.max(1, (node.year ?? 1) - (prevNode?.year ?? 0))
      const afterYears = applyYearsBetweenNodes(afterChoice, yearsBetween, state.financingId)
      const nextIndex = state.currentNodeIndex + 1
      const totalNodes = playthrough.length
      const gameOver = isGameOver(nextIndex, totalNodes)
      const branchSkills = state.careerSkills ? Object.keys(state.careerSkills) : []
      const effectiveDelta = option.skillDelta
        ?? (branchSkills.length > 0 ? { [branchSkills[node.year % branchSkills.length]]: 1 } : null)
      let nextSkills = applyCareerSkillDelta(state.careerSkills, effectiveDelta)

      let nextCareerPath = state.selectedCareerPath
      let nextDataFlags = state.dataQualityFlags
      if (option.switchCareer && state.selectedCareerPath?.relatedCareer) {
        const related = state.selectedCareerPath.relatedCareer
        const newBranch = careerBranches.bySoc?.[related.soc] ?? null
        nextCareerPath = { ...related, mechanicsApplied: Boolean(newBranch) }
        nextDataFlags = { ...nextDataFlags, career: newBranch ? 'full' : 'catalog_only' }
        nextSkills = Array.isArray(newBranch?.skills)
          ? newBranch.skills.reduce((acc, name) => ({ ...acc, [name]: 0 }), {})
          : {}
      }

      return {
        ...state,
        stats: afterYears,
        currentNodeIndex: nextIndex,
        scenarioText: null,
        selectedCareerPath: nextCareerPath,
        dataQualityFlags: nextDataFlags,
        choiceHistory: [
          ...state.choiceHistory,
          {
            year: node.year,
            phase: node.phase,
            label: option.label,
            impact: `bank ${option.impact.bank_delta >= 0 ? '+' : ''}${option.impact.bank_delta}, happiness ${option.impact.happiness_delta >= 0 ? '+' : ''}${option.impact.happiness_delta}`,
          },
        ],
        careerSkills: nextSkills,
        phase: gameOver ? 'game_over' : 'playing',
      }
    }

    case 'SET_RETROSPECTIVE':
      return { ...state, retrospective: action.text }

    case 'RESTART':
      return { ...initialState }

    /** @deprecated for app UI — kept for tests */
    case 'SELECT_MAJOR':
      return {
        ...initialState,
        phase: 'playing',
        playerName: 'Player',
        avatarId: 'av_1',
        selectedMajor: action.major,
        stats: { ...action.major.initial_stats },
        statsBeforeFinancing: { ...action.major.initial_stats },
        currentNodeIndex: 0,
        playthroughNodes: [...(action.major?.nodes ?? [])],
      }

    /** Direct entry for tests */
    case 'TEST_BEGIN_PLAYING':
      return {
        ...initialState,
        phase: 'playing',
        playerName: 'Tester',
        avatarId: 'av_1',
        selectedMajor: action.major,
        stats: { ...action.stats },
        statsBeforeFinancing: { ...action.stats },
        currentNodeIndex: 0,
        playthroughNodes: [...(action.major?.nodes ?? [])],
      }

    default:
      return state
  }
}

function persistedReducer(state, action) {
  const nextState = gameReducer(state, action)
  if (action.type === 'RESTART') {
    clearSave()
  } else if (action.type !== 'TEST_BEGIN_PLAYING' && action.type !== 'SELECT_MAJOR') {
    saveState(nextState)
  }
  if (nextState.phase === 'game_over' && state.phase !== 'game_over') {
    saveRunToHistory(nextState)
  }
  return nextState
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(persistedReducer, initialState, () => loadSavedState() ?? initialState)

  const goPhase = useCallback((phase) => {
    dispatch({ type: 'GO_PHASE', phase })
  }, [])

  const setPlayer = useCallback((name, avatarId) => {
    dispatch({ type: 'SET_PLAYER', name, avatarId })
  }, [])

  const setSchool = useCallback((school) => {
    dispatch({ type: 'SET_SCHOOL', school })
  }, [])

  const setProgramAndMajor = useCallback((program, major) => {
    dispatch({ type: 'SET_PROGRAM_AND_MAJOR', program, major })
  }, [])

  const setCareerPath = useCallback((career, dataQuality) => {
    dispatch({ type: 'SET_CAREER_PATH', career, dataQuality })
  }, [])

  const applySelectedCity = useCallback((city) => {
    dispatch({ type: 'APPLY_CITY_TO_STATS', city })
  }, [])

  const startPlayingAfterOutlook = useCallback((outlookPreview) => {
    dispatch({ type: 'START_PLAYING_AFTER_OUTLOOK', outlookPreview })
  }, [])

  const openFact = useCallback((payload) => {
    dispatch({ type: 'OPEN_FACT', payload })
  }, [])

  const closeFact = useCallback(() => {
    dispatch({ type: 'CLOSE_FACT' })
  }, [])

  const backFact = useCallback((phase) => {
    dispatch({ type: 'CLOSE_FACT_BACK', phase })
  }, [])

  const setFinancingStart = useCallback((financingId) => {
    dispatch({ type: 'SET_FINANCING_START', financingId })
  }, [])

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

  const testBeginPlaying = useCallback((major, stats) => {
    dispatch({ type: 'TEST_BEGIN_PLAYING', major, stats })
  }, [])

  return (
    <GameContext.Provider
      value={{
        state,
        goPhase,
        setPlayer,
        setSchool,
        setProgramAndMajor,
        setCareerPath,
        applySelectedCity,
        startPlayingAfterOutlook,
        openFact,
        closeFact,
        backFact,
        setFinancingStart,
        selectMajor,
        makeChoice,
        setScenarioText,
        setRetrospective,
        restart,
        testBeginPlaying,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook live together
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
