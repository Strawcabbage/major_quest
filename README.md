# Major Quest

A **college-to-career simulation game** built as a single-page React app. Players pick a real institution and field of study using **live U.S. Department of Education College Scorecard data**, walk through financing and location choices, see a simple **five-year outlook**, then play through **branching decision years** whose outcomes are pure arithmetic in a small game engine. The goal is to mix **realistic data cues** (earnings, debt, regional cost pressure) with **lightweight game stats** (salary, debt, bank, happiness) without pretending to give personalized financial advice.

---

## Technical summary

### Stack and tooling

| Choice | Why |
|--------|-----|
| **React 19** + **Vite 8** | Fast local dev, simple production builds, and a familiar component model for a phase-based UI (one screen at a time). |
| **Tailwind CSS** | Utility-first styling for a consistent “pixel UI” look without maintaining a large custom CSS surface. |
| **Vitest** + **Testing Library** | Unit tests for pure logic (engine, Scorecard normalization, resolvers) and light integration tests for context behavior; `jsdom` for DOM without a browser. |
| **ESLint** (flat config) | Catches common React and JS issues; keeps hooks and refresh boundaries sane. |
| **Zod** | Available for validation where schemas are useful (e.g. external inputs); the core game paths mostly use small pure functions instead of heavy runtime typing. |
| **Vercel AI SDK + `@ai-sdk/google`** | Generates the **LinkedIn-style retrospective** on the results screen from final stats and choice history. This keeps the narrative layer optional: the game is fully playable if AI fails; the summary degrades gracefully. |

The app is **JavaScript**, not TypeScript, to keep the hackathon footprint small; JSDoc typedefs in `GameContext` document phases and intent.

---

### Architecture

**Phase router.** `App.jsx` renders a single main column based on `state.phase` from React context. Phases map to screens: title, how-to-play, character, school, major, career path, city, financing, five-year outlook, playing (decision nodes), game over (final summary). A **stats sidebar** appears only during `playing` and `game_over` so setup steps stay focused.

**State management.** `GameContext.jsx` holds a `useReducer` store: player identity, selected school/program, resolved simulation major, financing choice, stats, career/city selections, outlook snapshot, modal state, and `factAfterClose` (where to navigate after dismissing the fact modal). This keeps **all transitions explicit** and easy to test compared to many scattered `useState` calls.

**Separation of concerns.**

- **`src/engine/gameEngine.js`** — Pure functions: financing multipliers, choice impacts, debt interest, net worth, debt payoff estimate, city salary multipliers, five-year toy projection, FSA snippet helper. **No React, no fetch.**
- **`src/engine/trackResolver.js`** — Maps a **4-digit CIP** from Scorecard to one of the authored **`major_id` graphs** in `gameData.json`, with a generic **`explorer_001`** fallback so every program can complete a run without hand-authoring dozens of stories.
- **`src/services/*`** — I/O: Scorecard, BLS CPI, O*NET, Google AI. Each module isolates URL construction, env differences (dev vs prod), and error swallowing where the UI should continue without enrichment.
- **`src/utils/facts.js`** — Copy and formatting for modals (USD, percentages) and **`buildInitialStats`**, which merges **major defaults** with **program medians** and **school net price** when debt is missing.

This split makes it obvious **what is deterministic** (engine + reducers) versus **what is best-effort** (live APIs and AI).

---

### Data layer: what is live vs static

The design favors **live Scorecard** for anything that must vary by **school and program**, and **static JSON** for national career context, living-wage-style floors, and demo-only FSA hints—so demos stay fast and are not blocked by third-party rate limits or CORS.

#### Live APIs

1. **College Scorecard** (`api.data.gov` → College Scorecard `schools` endpoint)  
   - **Used for:** institution search, admission rate, average net price, and **per-school program list** (CIP, titles, credential level, earnings cohorts, debt medians, completion where reported).  
   - **Why:** Official, field-of-study level data tied to real `unitid`s; avoids shipping huge program catalogs in the repo.  
   - **Wiring:** `scorecardClient.js`. In **development**, the Vite dev server **proxies** `/api/scorecard` and can append `api_key` from `.env.local` so the key is not exposed to the browser. In **production**, you either set `VITE_COLLEGE_SCORECARD_API_KEY` or front the same pattern with your own proxy.

2. **BLS Public Data API** (CPI-U time series)  
   - **Used for:** One optional sentence in the **program fact modal** comparing a Census division CPI series to the U.S. average—rough cost-of-living color after picking a major.  
   - **Why:** BLS is authoritative for inflation/regional price indexes; the game only needs a coarse comparison, not a full cost model.  
   - **Wiring:** `blsClient.js` + `constants/blsCpiRegions.js` for series IDs. Dev posts through `/api/bls` (custom Vite plugin) so registration keys stay server-side when provided.

3. **O*NET Web Services**  
   - **Used for:** A short **occupation blurb** in the program fact modal, keyed off a representative SOC per simulation track (`cipToSoc.js`).  
   - **Why:** Rich, standardized occupation descriptions without maintaining copy for every CIP.  
   - **Wiring:** `onetClient.js`; dev uses `/api/onet/...` proxy with optional `ONET_API_KEY` / `VITE_ONET_API_KEY`.

4. **Google Generative AI** (via Vercel AI SDK)  
   - **Used for:** **FinalSummary** “LinkedIn retrospective” title + story.  
   - **Why:** Lets the ending feel personal while all **numbers** remain from the engine and Scorecard seeds.  
   - **Wiring:** `aiService.js` and `VITE_GOOGLE_API_KEY`.

#### Static JSON (bundled)

| Asset | Role |
|-------|------|
| `gameData.json` | Authored **decision trees** per `major_id` and default starting stats. |
| `benchmarks.json` | **National** median earnings/debt anchors for fact-modal comparisons. |
| `cipEnrichment.json` | **Career path** cards: example SOCs, BLS-style wages and growth, O*NET-style teasers—**CIP-keyed** so the career step works offline for covered codes. |
| `cities.json` | **Metro snapshots**: illustrative living wage floors and **regional salary multipliers**; avoids scraping MIT Living Wage Calculator in the browser and keeps licensing/refresh simple. |
| `fsaSchoolHints.json` | **Tiny demo map** of `unitid` → illustrative cohort default rate lines on the financing screen. Full FSA alignment would use OPEID and richer tables; this is intentionally scoped. |

**Offline scripts:** `scripts/fetchRealData.js` refreshes national aggregates from Scorecard for maintainer workflows; `scripts/buildCipEnrichment.js` validates `cipEnrichment.json` (extensible toward CIP–SOC crosswalk + BLS merges).

---

### Scorecard program pipeline

Raw API arrays are **normalized** (`normalizeProgram`), **deduplicated by 4-digit CIP** (`dedupeProgramsByCip`) with preference for bachelor-level rows when merging, then **ranked for display** (`rankProgramsForDisplay`) by **data completeness** (earnings, debt, completion) and then **earnings**, so schools with sparse reporting still list everything but the best-documented programs surface first. The **MajorPicker** adds **search** and **category tabs** (`cipCategories.js`) and caps the visible list with a message to search deeper—balancing payload size and UX.

---

### Game flow (technical order)

1. **School** — Scorecard search/detail.  
2. **Major** — Full program list for that school; `trackResolver` picks `gameData` major; fact modal may call BLS + O*NET; then phase → **career_path**.  
3. **Career path** — `cipEnrichment.json` when present; otherwise generic paths; `applyCareerPathNudge` can blend salary toward an example national wage.  
4. **City** — `cities.json`; `applyCityToStats` updates both `stats` and `statsBeforeFinancing` so **financing** applies to post-location baselines.  
5. **Financing** — `FINANCING_OPTIONS` in `gameEngine.js`; `applyFinancing`; optional FSA static lines; fact modal → **five_year_outlook**.  
6. **Five-year outlook** — `computeFiveYearOutlook` using career growth % when set; stores `outlookPreview` and enters **playing**.  
7. **Playing** — `DecisionNode` applies `applyChoice` + annual debt interest between nodes.  
8. **Game over** — `FinalSummary` + AI retrospective.

---

### Repository layout (high level)

```
src/
  App.jsx              # Phase router + shell (sidebar, fact modal)
  context/GameContext.jsx
  components/          # One primary screen per phase + FactModal, StatsSidebar
  engine/              # gameEngine.js, trackResolver.js
  services/            # scorecardClient, blsClient, onetClient, aiService
  utils/               # facts.js, cipEnrichment.js
  constants/           # CIP categories, CIP→major labels, CIP→O*NET SOC, BLS series maps
  data/                # gameData, benchmarks, enrichment, cities, FSA hints
  test/                # Vitest specs
scripts/               # fetchRealData, buildCipEnrichment
```

---

## Environment variables

Create `.env.local` (see `.gitignore`; never commit secrets). Typical keys:

| Variable | Purpose |
|----------|---------|
| `COLLEGE_SCORECARD_API_KEY` or `VITE_COLLEGE_SCORECARD_API_KEY` | College Scorecard (dev proxy prefers non-`VITE_` for injection). |
| `BLS_API_KEY` or `VITE_BLS_API_KEY` | Optional BLS registration key for CPI requests. |
| `ONET_API_KEY` or `VITE_ONET_API_KEY` | O*NET Web Services. |
| `VITE_GOOGLE_API_KEY` | Google AI for the final narrative. |

Without Scorecard keys, **production static builds** need `VITE_COLLEGE_SCORECARD_API_KEY` or your own proxy; **local dev** uses the Vite proxy + `.env.local`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with Scorecard proxy and BLS/O*NET middleware. |
| `npm run build` | Production bundle to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | ESLint. |
| `npm run test` / `npm run test:run` | Vitest (watch vs single run). |
| `npm run enrich` | Scorecard script to refresh national-style aggregates (`scripts/fetchRealData.js`). |
| `npm run build:cip-enrichment` | Validate/rewrite `cipEnrichment.json`. |

---

## Design tradeoffs (why it is built this way)

- **CIP → few simulation tracks:** Authoring unique narrative trees per major does not scale. The resolver maps broad CIP families to three themed tracks plus **explorer**, so the **data** is rich while **gameplay** stays maintainable.  
- **Static enrichment for careers/cities:** BLS, Census, and living-wage sources are powerful but easy to break in-browser (CORS, keys, quotas). Shipping **curated slices** keeps the hackathon demo reliable.  
- **Facts vs fiction:** Modals cite Scorecard/BLS/O*NET where used; the **five-year outlook** and **debt payoff** helpers are explicitly toy models for comparison, not forecasts.  
- **Keys in dev:** Proxies exist so developers do not have to expose `api.data.gov` keys in the client during local work.

---

## Disclaimer

Figures are **simplified for education and demonstration**. They are **not** individualized financial, career, or legal advice. Always verify decisions with primary sources and professionals.
