# Major Reality – Career Simulation Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Vite + React career simulation game where JSON drives the math and the Google Gemini API generates structured narrative flavor text for every decision node and a final career retrospective.

**Architecture:** A pure-function Game Engine handles all stat mutations (salary, debt, happiness) from the JSON schema. A React Context + useReducer layer owns game state. Stats update *instantly* on player choice; the AI layer (Gemini via Vercel AI SDK + `@ai-sdk/google`) then fetches structured `{ title, story }` narrative asynchronously — it never touches numbers. A system-instruction persona ("cynical but honest career coach") is sent with every request.

**Tech Stack:** Vite, React 18, Tailwind CSS v3, ai (Vercel AI SDK), @ai-sdk/google, zod, Vitest, React Testing Library

---

### Task 1: Scaffold Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`
- Create: `tailwind.config.js`, `postcss.config.js`, `src/index.css`

**Step 1: Init the project**

```bash
cd /Users/ariav/major_quest
npm create vite@latest . -- --template react
npm install
```

**Step 2: Install dependencies**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install ai @ai-sdk/google zod
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 3: Configure Tailwind**

In `tailwind.config.js`, set content:
```js
content: ["./index.html", "./src/**/*.{js,jsx}"]
```

In `src/index.css`, replace with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Configure Vitest**

In `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

Create `src/test/setup.js`:
```js
import '@testing-library/jest-dom'
```

**Step 5: Add test script to package.json**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

**Step 6: Verify scaffold works**

```bash
npm run dev
# Should open on localhost:5173
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind + Vitest"
```

---

### Task 2: Build game data JSON (The Rails)

**Files:**
- Create: `src/data/gameData.json`

**Step 1: Write the schema**

```json
{
  "majors": [
    {
      "major_id": "cs_001",
      "title": "Computer Science",
      "emoji": "💻",
      "initial_stats": {
        "salary": 75000,
        "debt": 35000,
        "happiness": 70,
        "bank": 5000
      },
      "nodes": [
        {
          "node_id": "cs_y1",
          "year": 1,
          "phase": "Early Career",
          "ai_context": "CS grad, first job decision",
          "options": [
            {
              "option_id": "startup",
              "label": "Startup (High Risk)",
              "impact": {
                "bank_delta": -5000,
                "happiness_delta": 10,
                "salary_multiplier": 1.5,
                "debt_delta": 0
              }
            },
            {
              "option_id": "bank_job",
              "label": "Bank (Stable)",
              "impact": {
                "bank_delta": 5000,
                "happiness_delta": -10,
                "salary_multiplier": 1.1,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "cs_y3",
          "year": 3,
          "phase": "Early Career",
          "ai_context": "Mid-level engineer, burnout vs. promotion",
          "options": [
            {
              "option_id": "grind",
              "label": "Grind for promotion",
              "impact": {
                "bank_delta": 10000,
                "happiness_delta": -20,
                "salary_multiplier": 1.3,
                "debt_delta": 0
              }
            },
            {
              "option_id": "balance",
              "label": "Set work-life limits",
              "impact": {
                "bank_delta": 2000,
                "happiness_delta": 15,
                "salary_multiplier": 1.05,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "cs_y6",
          "year": 6,
          "phase": "The Pivot",
          "ai_context": "Senior engineer, stay technical or go management",
          "options": [
            {
              "option_id": "management",
              "label": "Move into Engineering Manager",
              "impact": {
                "bank_delta": 15000,
                "happiness_delta": -5,
                "salary_multiplier": 1.4,
                "debt_delta": 0
              }
            },
            {
              "option_id": "staff_eng",
              "label": "Stay as Staff Engineer",
              "impact": {
                "bank_delta": 8000,
                "happiness_delta": 10,
                "salary_multiplier": 1.2,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "cs_y10",
          "year": 10,
          "phase": "Established Professional",
          "ai_context": "10-year career milestone, startup equity vs. stability",
          "options": [
            {
              "option_id": "startup_equity",
              "label": "Join late-stage startup for equity",
              "impact": {
                "bank_delta": -10000,
                "happiness_delta": 5,
                "salary_multiplier": 1.6,
                "debt_delta": 0
              }
            },
            {
              "option_id": "faang",
              "label": "Accept FAANG offer",
              "impact": {
                "bank_delta": 50000,
                "happiness_delta": -15,
                "salary_multiplier": 1.5,
                "debt_delta": 0
              }
            }
          ]
        }
      ]
    },
    {
      "major_id": "nursing_001",
      "title": "Nursing",
      "emoji": "🩺",
      "initial_stats": {
        "salary": 58000,
        "debt": 28000,
        "happiness": 75,
        "bank": 3000
      },
      "nodes": [
        {
          "node_id": "nursing_y1",
          "year": 1,
          "phase": "Early Career",
          "ai_context": "New RN, first hospital placement decision",
          "options": [
            {
              "option_id": "icu",
              "label": "ICU (High Stress, High Pay)",
              "impact": {
                "bank_delta": 8000,
                "happiness_delta": -15,
                "salary_multiplier": 1.25,
                "debt_delta": 0
              }
            },
            {
              "option_id": "community",
              "label": "Community Clinic (Balanced)",
              "impact": {
                "bank_delta": 1000,
                "happiness_delta": 10,
                "salary_multiplier": 1.05,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "nursing_y4",
          "year": 4,
          "phase": "Early Career",
          "ai_context": "RN with 4 years experience, considering specialization",
          "options": [
            {
              "option_id": "specialize",
              "label": "Pursue NP certification",
              "impact": {
                "bank_delta": -5000,
                "happiness_delta": 5,
                "salary_multiplier": 1.5,
                "debt_delta": 12000
              }
            },
            {
              "option_id": "travel_nurse",
              "label": "Become a travel nurse",
              "impact": {
                "bank_delta": 20000,
                "happiness_delta": -5,
                "salary_multiplier": 1.3,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "nursing_y7",
          "year": 7,
          "phase": "The Pivot",
          "ai_context": "Experienced nurse, burnout is real",
          "options": [
            {
              "option_id": "admin",
              "label": "Move into hospital administration",
              "impact": {
                "bank_delta": 5000,
                "happiness_delta": 10,
                "salary_multiplier": 1.2,
                "debt_delta": 0
              }
            },
            {
              "option_id": "bedside",
              "label": "Stay at bedside",
              "impact": {
                "bank_delta": 2000,
                "happiness_delta": -10,
                "salary_multiplier": 1.1,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "nursing_y10",
          "year": 10,
          "phase": "Established Professional",
          "ai_context": "Decade-long nursing career, leadership opportunity",
          "options": [
            {
              "option_id": "director",
              "label": "Accept Nursing Director role",
              "impact": {
                "bank_delta": 20000,
                "happiness_delta": -10,
                "salary_multiplier": 1.4,
                "debt_delta": 0
              }
            },
            {
              "option_id": "private_practice",
              "label": "Open private wellness practice",
              "impact": {
                "bank_delta": -15000,
                "happiness_delta": 25,
                "salary_multiplier": 1.1,
                "debt_delta": 8000
              }
            }
          ]
        }
      ]
    },
    {
      "major_id": "english_001",
      "title": "English",
      "emoji": "📚",
      "initial_stats": {
        "salary": 38000,
        "debt": 30000,
        "happiness": 80,
        "bank": 1000
      },
      "nodes": [
        {
          "node_id": "eng_y1",
          "year": 1,
          "phase": "Early Career",
          "ai_context": "English grad, first career move",
          "options": [
            {
              "option_id": "content",
              "label": "Content Marketing at a startup",
              "impact": {
                "bank_delta": 2000,
                "happiness_delta": -5,
                "salary_multiplier": 1.2,
                "debt_delta": 0
              }
            },
            {
              "option_id": "teaching",
              "label": "High school English teacher",
              "impact": {
                "bank_delta": 500,
                "happiness_delta": 20,
                "salary_multiplier": 1.05,
                "debt_delta": -5000
              }
            }
          ]
        },
        {
          "node_id": "eng_y4",
          "year": 4,
          "phase": "Early Career",
          "ai_context": "English professional, pivoting or doubling down",
          "options": [
            {
              "option_id": "ux_writing",
              "label": "Pivot to UX Writing (tech adjacent)",
              "impact": {
                "bank_delta": 8000,
                "happiness_delta": 5,
                "salary_multiplier": 1.5,
                "debt_delta": 0
              }
            },
            {
              "option_id": "grad_school",
              "label": "Pursue MFA",
              "impact": {
                "bank_delta": -10000,
                "happiness_delta": 15,
                "salary_multiplier": 1.1,
                "debt_delta": 40000
              }
            }
          ]
        },
        {
          "node_id": "eng_y7",
          "year": 7,
          "phase": "The Pivot",
          "ai_context": "Mid-career English professional, building leverage",
          "options": [
            {
              "option_id": "director_content",
              "label": "Director of Content at SaaS company",
              "impact": {
                "bank_delta": 12000,
                "happiness_delta": -10,
                "salary_multiplier": 1.35,
                "debt_delta": 0
              }
            },
            {
              "option_id": "freelance",
              "label": "Go fully freelance",
              "impact": {
                "bank_delta": -3000,
                "happiness_delta": 20,
                "salary_multiplier": 1.15,
                "debt_delta": 0
              }
            }
          ]
        },
        {
          "node_id": "eng_y10",
          "year": 10,
          "phase": "Established Professional",
          "ai_context": "Decade of English career, final major choice",
          "options": [
            {
              "option_id": "publish",
              "label": "Finally write that novel",
              "impact": {
                "bank_delta": -8000,
                "happiness_delta": 30,
                "salary_multiplier": 0.8,
                "debt_delta": 0
              }
            },
            {
              "option_id": "vp_marketing",
              "label": "Accept VP of Marketing offer",
              "impact": {
                "bank_delta": 40000,
                "happiness_delta": -20,
                "salary_multiplier": 1.6,
                "debt_delta": 0
              }
            }
          ]
        }
      ]
    }
  ]
}
```

**Step 2: Commit**

```bash
git add src/data/gameData.json
git commit -m "feat: add game data JSON for CS, Nursing, English majors"
```

---

### Task 3: Build the pure Game Engine (no React)

**Files:**
- Create: `src/engine/gameEngine.js`
- Create: `src/test/gameEngine.test.js`

**Step 1: Write the failing tests first**

```js
// src/test/gameEngine.test.js
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
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test:run
# Expected: FAIL — "Cannot find module '../engine/gameEngine'"
```

**Step 3: Implement the Game Engine**

```js
// src/engine/gameEngine.js

const DEBT_INTEREST_RATE = 0.06

/**
 * Apply a player's choice impact to the current game state.
 * All math lives here — no AI, no React.
 */
export function applyChoice(state, impact) {
  const newSalary = state.salary * impact.salary_multiplier
  const newBank = state.bank + impact.bank_delta + (newSalary - state.salary) / 12
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
```

**Step 4: Run tests to confirm they pass**

```bash
npm run test:run
# Expected: PASS — all 6 tests
```

**Step 5: Commit**

```bash
git add src/engine/gameEngine.js src/test/gameEngine.test.js
git commit -m "feat: pure game engine with applyChoice, debt interest, net worth"
```

---

### Task 4: Build the AI service (narrative layer — Gemini + structured output)

**Files:**
- Create: `src/services/aiService.js`
- Create: `.env.local.example` (template only — no real key)
- Modify: `.gitignore` to exclude `.env.local`

**Step 1: Create `.env.local.example` template**

```
# Rename to .env.local and add your Google Gemini API key
VITE_GOOGLE_API_KEY=your_key_here
```

**Step 2: Add to `.gitignore`**

```
.env.local
```

**Step 3: Implement the AI service**

Use Vercel AI SDK's `generateObject` with `@ai-sdk/google` and a Zod schema.
Every request includes a **system instruction** that gives Gemini a permanent "cynical but honest career coach" persona.
The AI always returns structured JSON `{ title, story }` — never raw text that needs parsing.

```js
// src/services/aiService.js
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
})

const COACH_PERSONA =
  'You are a cynical but honest career coach narrating a career simulation game. ' +
  'Your goal is to tell the player the unvarnished truth about their career choices based on the data. ' +
  'Keep it grounded, specific to their industry, and slightly witty. Never moralize or be preachy. ' +
  'Never mention exact dollar amounts.'

const scenarioSchema = z.object({
  title: z.string().describe('A punchy 4-7 word title for this career moment'),
  story: z.string().describe('2 sentences of vivid, grounded narrative for this moment'),
})

const retroSchema = z.object({
  title: z.string().describe('A LinkedIn-style headline for their career (10-12 words)'),
  story: z.string().describe('3-4 sentences: what they gained, what they sacrificed, and a final verdict'),
})

/**
 * Generate structured scenario narrative for a decision node.
 * Stats update happens before this is called — AI only handles flavor.
 */
export async function generateScenarioText({ major, year, phase, nodeContext, stats, chosenLabel = null }) {
  const userPrompt = `Context Packet:
- Major: ${major}
- Year: ${year} (Phase: ${phase})
- Current salary: $${Math.round(stats.salary).toLocaleString()}
- Happiness: ${stats.happiness}/100
- Situation: ${nodeContext}
${chosenLabel ? `- Player just chose: "${chosenLabel}"` : ''}

Write a scenario title and 2-sentence story for this career moment.`

  try {
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      output: Output.object({ schema: scenarioSchema }),
      system: COACH_PERSONA,
      prompt: userPrompt,
    })
    return result.output   // typed { title: string, story: string }
  } catch (err) {
    console.error('AI scenario generation failed:', err)
    return null
  }
}

/**
 * Generate the final "LinkedIn Retrospective" once all nodes are complete.
 * Receives the player's full choice history and final stats.
 */
export async function generateCareerRetrospective({ major, finalStats, choiceHistory }) {
  const choicesSummary = choiceHistory
    .map((c) => `Year ${c.year}: chose "${c.label}" (${c.impact})`)
    .join('\n')

  const userPrompt = `Player finished a "${major}" career simulation.

10-year journey:
${choicesSummary}

Final stats:
- Salary: $${Math.round(finalStats.salary).toLocaleString()}
- Net worth: $${Math.round(finalStats.bank - finalStats.debt).toLocaleString()}
- Happiness: ${finalStats.happiness}/100

Write their LinkedIn Retrospective headline and story.`

  try {
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      output: Output.object({ schema: retroSchema }),
      system: COACH_PERSONA,
      prompt: userPrompt,
    })
    return result.output   // typed { title: string, story: string }
  } catch (err) {
    console.error('AI retrospective generation failed:', err)
    return {
      title: 'A decade in the books.',
      story: 'Your career unfolded in ways even the data cannot fully capture. Was it worth it? Only you know.',
    }
  }
}
```

**Step 4: Commit**

```bash
git add src/services/aiService.js .env.local.example .gitignore
git commit -m "feat: AI service — Gemini structured output with career coach persona"
```

---

### Task 5: Build GameContext (state management)

**Files:**
- Create: `src/context/GameContext.jsx`
- Create: `src/test/GameContext.test.jsx`

**Step 1: Write the failing tests**

```jsx
// src/test/GameContext.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider, useGame } from '../context/GameContext'
import gameData from '../data/gameData.json'

function TestConsumer() {
  const { state, selectMajor, makeChoice } = useGame()
  const major = gameData.majors[0] // CS
  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="bank">{state.stats?.bank}</span>
      <button onClick={() => selectMajor(major)}>Select CS</button>
      <button
        onClick={() =>
          makeChoice(major.nodes[0].options[1])
        }
      >
        Make Choice
      </button>
    </div>
  )
}

describe('GameContext', () => {
  it('starts in major_selection phase', () => {
    render(<GameProvider><TestConsumer /></GameProvider>)
    expect(screen.getByTestId('phase').textContent).toBe('major_selection')
  })

  it('moves to playing phase after major selection', async () => {
    render(<GameProvider><TestConsumer /></GameProvider>)
    await userEvent.click(screen.getByText('Select CS'))
    expect(screen.getByTestId('phase').textContent).toBe('playing')
  })

  it('updates bank after a choice', async () => {
    render(<GameProvider><TestConsumer /></GameProvider>)
    await userEvent.click(screen.getByText('Select CS'))
    const initialBank = Number(screen.getByTestId('bank').textContent)
    await userEvent.click(screen.getByText('Make Choice'))
    const updatedBank = Number(screen.getByTestId('bank').textContent)
    // Bank job gives +5000 bank_delta
    expect(updatedBank).toBeGreaterThan(initialBank)
  })
})
```

**Step 2: Run to confirm fail**

```bash
npm run test:run
# Expected: FAIL — "Cannot find module '../context/GameContext'"
```

**Step 3: Implement GameContext**

```jsx
// src/context/GameContext.jsx
import { createContext, useContext, useReducer, useCallback } from 'react'
import { applyChoice, applyAnnualDebtInterest, isGameOver } from '../engine/gameEngine'

const GameContext = createContext(null)

const initialState = {
  phase: 'major_selection', // 'major_selection' | 'playing' | 'game_over'
  selectedMajor: null,
  stats: null,
  currentNodeIndex: 0,
  choiceHistory: [],
  scenarioText: null,   // AI-generated flavor text for current node
  retrospective: null,  // AI-generated final summary
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
```

**Step 4: Run tests**

```bash
npm run test:run
# Expected: PASS — all 3 GameContext tests
```

**Step 5: Commit**

```bash
git add src/context/GameContext.jsx src/test/GameContext.test.jsx
git commit -m "feat: GameContext with useReducer — select major, make choice, state phases"
```

---

### Task 6: Build StatsSidebar component

**Files:**
- Create: `src/components/StatsSidebar.jsx`

**Step 1: Implement**

```jsx
// src/components/StatsSidebar.jsx
import { useGame } from '../context/GameContext'
import { computeNetWorth } from '../engine/gameEngine'

function StatBar({ label, value, max = 100, colorClass }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MoneyRow({ label, value, positive = true }) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

  const color = value >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-mono font-bold ${color}`}>
        {value < 0 ? '-' : ''}{formatted}
      </span>
    </div>
  )
}

export default function StatsSidebar() {
  const { state } = useGame()
  const { stats, selectedMajor, currentNodeIndex, choiceHistory, phase } = state

  if (!stats) return null

  const totalNodes = selectedMajor?.nodes.length ?? 0
  const yearProgress = totalNodes > 0 ? (currentNodeIndex / totalNodes) * 100 : 0
  const netWorth = computeNetWorth(stats)

  return (
    <aside className="w-72 shrink-0 bg-gray-900 border-l border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Major Badge */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{selectedMajor?.emoji}</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Major</p>
          <p className="text-white font-semibold">{selectedMajor?.title}</p>
        </div>
      </div>

      {/* Year Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Year {choiceHistory.length === 0 ? 1 : choiceHistory[choiceHistory.length - 1]?.year ?? 1}</span>
          <span>Year 10</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${yearProgress}%` }}
          />
        </div>
      </div>

      {/* Money Stats */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Finances</p>
        <MoneyRow label="Annual Salary" value={stats.salary} />
        <MoneyRow label="Bank Account" value={stats.bank} />
        <MoneyRow label="Student Debt" value={-stats.debt} />
        <div className="flex justify-between items-center pt-2 mt-1">
          <span className="text-sm font-semibold text-white">Net Worth</span>
          <span className={`font-mono font-bold text-lg ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(netWorth)}
          </span>
        </div>
      </div>

      {/* Wellbeing */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Wellbeing</p>
        <StatBar label="Happiness" value={stats.happiness} max={100} colorClass={stats.happiness > 60 ? 'bg-emerald-500' : stats.happiness > 30 ? 'bg-yellow-500' : 'bg-red-500'} />
      </div>

      {/* Choice History */}
      {choiceHistory.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">History</p>
          <ul className="space-y-1">
            {choiceHistory.map((c, i) => (
              <li key={i} className="text-xs text-gray-400">
                <span className="text-indigo-400">Yr {c.year}:</span> {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/StatsSidebar.jsx
git commit -m "feat: StatsSidebar with salary, bank, debt, net worth, happiness bar"
```

---

### Task 7: Build MajorSelection screen

**Files:**
- Create: `src/components/MajorSelection.jsx`

**Step 1: Implement**

```jsx
// src/components/MajorSelection.jsx
import { useGame } from '../context/GameContext'
import gameData from '../data/gameData.json'

export default function MajorSelection() {
  const { selectMajor } = useGame()

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">Major Reality</h1>
      <p className="text-gray-400 mb-12 max-w-md">
        10 years. Real numbers. Your choices.<br />
        Pick a major and see where life takes you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {gameData.majors.map((major) => (
          <button
            key={major.major_id}
            onClick={() => selectMajor(major)}
            className="group bg-gray-800 hover:bg-indigo-900 border border-gray-700 hover:border-indigo-500 rounded-2xl p-6 text-left transition-all duration-200 cursor-pointer"
          >
            <span className="text-4xl block mb-3">{major.emoji}</span>
            <h2 className="text-white font-semibold text-lg group-hover:text-indigo-300">{major.title}</h2>
            <p className="text-gray-500 text-sm mt-1">
              Starting salary: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(major.initial_stats.salary)}
            </p>
            <p className="text-gray-500 text-sm">
              Starting debt: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(major.initial_stats.debt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/MajorSelection.jsx
git commit -m "feat: MajorSelection screen with major cards"
```

---

### Task 8: Build DecisionNode component (AI-powered)

**Files:**
- Create: `src/components/DecisionNode.jsx`

**Step 1: Implement**

```jsx
// src/components/DecisionNode.jsx
import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { generateScenarioText } from '../services/aiService'

export default function DecisionNode() {
  const { state, makeChoice, setScenarioText } = useGame()
  const { selectedMajor, currentNodeIndex, stats, scenarioText } = state
  const [loadingAI, setLoadingAI] = useState(false)
  const [choosing, setChoosing] = useState(false)

  const node = selectedMajor?.nodes[currentNodeIndex]

  // Fetch AI flavor text whenever node changes
  useEffect(() => {
    if (!node) return
    setLoadingAI(true)
    generateScenarioText({
      major: selectedMajor.title,
      year: node.year,
      phase: node.phase,
      nodeContext: node.ai_context,
      stats,
    }).then((text) => {
      setScenarioText(text)
      setLoadingAI(false)
    })
  }, [node?.node_id])

  async function handleChoice(option) {
    if (choosing) return
    setChoosing(true)
    makeChoice(option, node)
    setChoosing(false)
  }

  if (!node) return null

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      {/* Phase + Year badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-900/40 px-3 py-1 rounded-full">
          {node.phase}
        </span>
        <span className="text-xs text-gray-500">Year {node.year}</span>
      </div>

      {/* AI Scenario Text — title + story returned as structured object */}
      <div className="min-h-[80px]">
        {loadingAI ? (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">●</span>
            <span className="text-sm">Generating your story…</span>
          </div>
        ) : scenarioText ? (
          <>
            <h2 className="text-white font-bold text-xl mb-2">{scenarioText.title}</h2>
            <p className="text-gray-300 leading-relaxed">{scenarioText.story}</p>
          </>
        ) : (
          <p className="text-gray-500 italic text-sm">{node.ai_context}</p>
        )}
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-3">
        {node.options.map((option) => {
          const wealthDelta = option.impact.bank_delta
          const happinessDelta = option.impact.happiness_delta
          return (
            <button
              key={option.option_id}
              onClick={() => handleChoice(option)}
              disabled={loadingAI || choosing}
              className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-xl p-5 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <p className="text-white font-medium mb-2">{option.label}</p>
              <div className="flex gap-4 text-xs">
                <span className={wealthDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {wealthDelta >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(wealthDelta)} bank
                </span>
                <span className={happinessDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {happinessDelta >= 0 ? '+' : ''}{happinessDelta} happiness
                </span>
                <span className="text-indigo-400">
                  ×{option.impact.salary_multiplier.toFixed(1)} salary
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/DecisionNode.jsx
git commit -m "feat: DecisionNode with AI scenario text and choice impacts"
```

---

### Task 9: Build FinalSummary screen (AI retrospective)

**Files:**
- Create: `src/components/FinalSummary.jsx`

**Step 1: Implement**

```jsx
// src/components/FinalSummary.jsx
import { useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { computeNetWorth } from '../engine/gameEngine'
import { generateCareerRetrospective } from '../services/aiService'

export default function FinalSummary() {
  const { state, setRetrospective, restart } = useGame()
  const { stats, selectedMajor, choiceHistory, retrospective } = state

  const netWorth = computeNetWorth(stats)

  useEffect(() => {
    if (retrospective) return
    generateCareerRetrospective({
      major: selectedMajor.title,
      finalStats: stats,
      choiceHistory,
    }).then(setRetrospective)
  }, [])

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">10-Year Reality Check</p>
        <h2 className="text-3xl font-bold text-white mb-1">{selectedMajor.emoji} {selectedMajor.title}</h2>
        <p className="text-gray-400">Here's where your choices landed you.</p>
      </div>

      {/* Final Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Final Salary', value: fmt(stats.salary), color: 'text-emerald-400' },
          { label: 'Net Worth', value: fmt(netWorth), color: netWorth >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Happiness', value: `${stats.happiness}/100`, color: stats.happiness > 60 ? 'text-emerald-400' : 'text-yellow-400' },
          { label: 'Remaining Debt', value: fmt(stats.debt), color: stats.debt > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map((item) => (
          <div key={item.label} className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* AI Retrospective */}
      {/* AI Retrospective — structured { title, story } */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">LinkedIn Retrospective</p>
        {retrospective ? (
          <>
            <p className="text-white font-semibold mb-2">{retrospective.title}</p>
            <p className="text-gray-300 leading-relaxed italic">"{retrospective.story}"</p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">●</span>
            <span className="text-sm">Writing your story…</span>
          </div>
        )}
      </div>

      <button
        onClick={restart}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
      >
        Play Again
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/FinalSummary.jsx
git commit -m "feat: FinalSummary with AI retrospective and final stats grid"
```

---

### Task 10: Wire everything into App.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`

**Step 1: Update App.jsx**

```jsx
// src/App.jsx
import { useGame } from './context/GameContext'
import MajorSelection from './components/MajorSelection'
import DecisionNode from './components/DecisionNode'
import FinalSummary from './components/FinalSummary'
import StatsSidebar from './components/StatsSidebar'

function GameScreen() {
  const { state } = useGame()
  const { phase } = state

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        {phase === 'major_selection' && <MajorSelection />}
        {phase === 'playing' && <DecisionNode />}
        {phase === 'game_over' && <FinalSummary />}
      </main>

      {/* Sidebar — only shown when a major is active */}
      {phase !== 'major_selection' && <StatsSidebar />}
    </div>
  )
}

export default function App() {
  return <GameScreen />
}
```

**Step 2: Update main.jsx to include GameProvider**

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GameProvider } from './context/GameContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>
)
```

**Step 3: Run all tests**

```bash
npm run test:run
# Expected: all tests PASS
```

**Step 4: Run dev server and verify the full flow manually**

```bash
npm run dev
```

Verify:
- [ ] Major selection screen shows 3 cards
- [ ] Clicking a major transitions to game view with sidebar
- [ ] Sidebar shows salary, bank, debt, net worth, happiness
- [ ] AI flavor text loads (spinner → text)
- [ ] Choosing an option updates sidebar stats
- [ ] After 4 choices, transitions to Final Summary
- [ ] AI retrospective loads in Final Summary
- [ ] "Play Again" restarts

**Step 5: Commit**

```bash
git add src/App.jsx src/main.jsx
git commit -m "feat: wire all components into App — full game flow complete"
```
