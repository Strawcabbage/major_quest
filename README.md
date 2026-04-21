# Major Quest

A **college-to-career simulation game** built as a single-page React app, powered by **6 live federal and third-party APIs** and **92,000+ lines of real government data**. Players pick a real institution and field of study using **live U.S. Department of Education College Scorecard data**, explore career paths backed by **O\*NET occupation profiles**, walk through financing and location choices with **realistic federal loan rates and IDR repayment mechanics**, see a **five-year financial outlook chart**, then play through **branching decision years** whose outcomes are driven by a pure-arithmetic game engine. The goal is to mix **realistic data cues** (earnings, debt, regional cost pressure) with **lightweight game stats** (salary, debt, bank, happiness) without pretending to give personalized financial advice.

---

## Key numbers

| Metric | Value |
|--------|-------|
| Live API integrations | **6** (College Scorecard, O\*NET, BLS, Adzuna, USAJOBS, Google Gemini) |
| O\*NET career profiles | **826** with descriptions, work activities, tasks, skills, and growth data |
| Academic fields mapped (CIP-to-SOC) | **415** CIP entries → **825+** unique SOC codes |
| Careers with gameplay mechanics | **738** auto-generated + **14** hand-crafted branch overrides |
| Story tracks | **8** (CS, Nursing, English, Business, Engineering, Education, Arts, Health Sciences) + generic explorer fallback |
| Decision nodes | **36** authored nodes + dynamic mid-game career crossroads |
| Achievement badges | **10** earnable badges evaluated from final game state |
| Financing archetypes | **4** with real 2024-25 federal loan rate tiers |
| Automated tests | **99** across **13** test files |
| Handwritten source code | **~6,000 lines** |
| Generated data files | **~92,000 lines** |

---

## Technical summary

### Stack and tooling

| Choice | Why |
|--------|-----|
| **React 19** + **Vite 8** | Fast local dev, simple production builds, and a familiar component model for a phase-based UI (one screen at a time). |
| **Tailwind CSS** | Utility-first styling for a consistent "pixel UI" look without maintaining a large custom CSS surface. |
| **Vitest** + **Testing Library** | Unit tests for pure logic (engine, Scorecard normalization, resolvers) and light integration tests for context behavior; `jsdom` for DOM without a browser. |
| **ESLint** (flat config) | Catches common React and JS issues; keeps hooks and refresh boundaries sane. |
| **Zod** | Available for validation where schemas are useful (e.g. external inputs); the core game paths mostly use small pure functions instead of heavy runtime typing. |
| **Vercel AI SDK + `@ai-sdk/google`** | Generates the **LinkedIn-style retrospective** on the results screen from final stats and choice history. This keeps the narrative layer optional: the game is fully playable if AI fails; the summary degrades gracefully with a 15-second timeout fallback. |

The app is **JavaScript**, not TypeScript, to keep the hackathon footprint small; JSDoc typedefs in `GameContext` document phases and intent.

---

### Architecture

**Phase router.** `App.jsx` renders a single main column based on `state.phase` from React context. Phases map to screens: title, how-to-play, about the data, character, school, major, career path, city, financing, five-year outlook, playing (decision nodes), game over (final summary). A **stats sidebar** appears during `playing` and `game_over` — on desktop as a fixed right column, on mobile as a collapsible bottom drawer with backdrop.

**State management.** `GameContext.jsx` holds a `useReducer` store with a **persisted wrapper** that serializes state to `localStorage` on every dispatch and hydrates on load for save/resume. The store tracks: player identity, selected school/program, resolved simulation major, financing choice, stats, career/city selections, outlook snapshot, modal state, playthrough nodes, career skills, and choice history. A separate **playthrough history** system stores completed runs for the comparison table on the title screen.

**Separation of concerns.**

- **`src/engine/gameEngine.js`** — Pure functions: financing multipliers (with real federal loan rate tiers), choice impacts, debt interest (IDR-based), net worth, debt payoff estimate, city salary multipliers, five-year outlook projection, career crossroads node builder, badge evaluation, FSA snippet helper. **No React, no fetch.**
- **`src/engine/trackResolver.js`** — Maps a **4-digit CIP** from Scorecard to one of **8 authored story tracks** in `gameData.json`, with a generic **`explorer_001`** fallback so every program can complete a run.
- **`src/services/*`** — I/O: Scorecard, BLS CPI, O\*NET, Adzuna, USAJOBS, Google AI. Each module isolates URL construction, env differences (dev vs prod), and error swallowing where the UI should continue without enrichment.
- **`src/utils/facts.js`** — Copy and formatting for modals (USD, percentages) and **`buildInitialStats`**, which merges **major defaults** with **program medians** and **school net price** when debt is missing.
- **`src/utils/useCareerCatalog.js`** — Lazy-loading hook for the 826-profile career catalog to reduce initial bundle size, with a `preloadCareerCatalog()` export for background loading.

This split makes it obvious **what is deterministic** (engine + reducers) versus **what is best-effort** (live APIs and AI).

---

### Data layer: what is live vs static

The design favors **live Scorecard** for anything that must vary by **school and program**, and **static JSON** for national career context, living-wage-style floors, and demo-only FSA hints — so demos stay fast and are not blocked by third-party rate limits or CORS.

#### Live APIs

1. **College Scorecard** (`api.data.gov` → College Scorecard `schools` endpoint)
   - **Used for:** institution search, admission rate, average net price, and **per-school program list** (CIP, titles, credential level, earnings cohorts, debt medians, completion where reported).
   - **Why:** Official, field-of-study level data tied to real `unitid`s; avoids shipping huge program catalogs in the repo.
   - **Wiring:** `scorecardClient.js`. In **development**, the Vite dev server **proxies** `/api/scorecard` and can append `api_key` from `.env.local` so the key is not exposed to the browser. In **production**, set `VITE_COLLEGE_SCORECARD_API_KEY` or front the same pattern with your own proxy.

2. **BLS Public Data API** (CPI-U time series)
   - **Used for:** One optional sentence in the **program fact modal** comparing a Census division CPI series to the U.S. average — rough cost-of-living color after picking a major. The BLS 2.9% CPI inflation rate is also used in the financial model for salary growth and debt projection.
   - **Why:** BLS is authoritative for inflation/regional price indexes.
   - **Wiring:** `blsClient.js` + `constants/blsCpiRegions.js` for series IDs. Dev posts through `/api/bls` (custom Vite plugin) so registration keys stay server-side when provided.

3. **O\*NET Web Services**
   - **Used for:** Occupation detail, **Detailed Work Activities**, skills, related occupations, job zones, bright outlook flags, and **CIP-to-SOC crosswalk lookups** for majors not in the static catalog. Powers the career path picker's rich detail pane and the program fact modal.
   - **Why:** Rich, standardized occupation data without maintaining copy for every SOC. Also the source for the 826-profile career catalog and 738-career branch mechanics (generated via build scripts).
   - **Wiring:** `onetClient.js` (`fetchOnetFactLines`, `fetchOccupationDetail`, `fetchDetailedWorkActivities`, `fetchCrosswalkSocsForCip`); dev uses the `/api/onet/...` proxy with optional `ONET_API_KEY` / `VITE_ONET_API_KEY`.

4. **Adzuna Jobs API**
   - **Used for:** Live **civilian job postings** displayed side-by-side in the career path picker for the currently selected occupation.
   - **Why:** Gives the career card real-world context (titles, employers, salary bands) instead of only national medians.
   - **Wiring:** `adzunaClient.js`; dev uses the `/api/adzuna/...` proxy that appends `app_id` / `app_key` server-side from `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`.

5. **USAJobs Search API**
   - **Used for:** Live **federal job postings** shown alongside Adzuna results, filtered by occupation keyword and (when known) the OPM series from `careerCatalog.json`.
   - **Why:** Federal roles are a meaningful outcome for many majors and USAJobs is the authoritative source.
   - **Wiring:** `usajobsClient.js`; always routed through `/api/usajobs/...` — handled by the Vite dev proxy in development and a **Vercel serverless function** (`api/usajobs.js`) in production, because USAJobs requires a `User-Agent` header (forbidden in browsers) and does not support CORS. Env: `USAJOBS_EMAIL`, `USAJOBS_API_KEY`.

6. **Google Generative AI** (via Vercel AI SDK)
   - **Used for:** **DecisionNode** scenario text and **FinalSummary** "LinkedIn retrospective" title + story. Falls back gracefully with "AI unavailable" indicators and hardcoded default text after a 15-second timeout.
   - **Why:** Lets the narrative feel personal while all **numbers** remain from the engine and Scorecard seeds.
   - **Wiring:** `aiService.js` and `VITE_GOOGLE_API_KEY`.

#### Static JSON (bundled)

| Asset | Role |
|-------|------|
| `gameData.json` | **8 authored story tracks** with 36 decision nodes and default starting stats. |
| `benchmarks.json` | **National** median earnings/debt anchors for fact-modal comparisons. |
| `cipEnrichment.json` | Auto-generated **career path** cards: example SOCs, BLS-style wages and growth, O\*NET-style teasers — **CIP-keyed** so the career step works offline for covered codes. |
| `cipToSocCatalog.json` | **415 CIP-4 → SOC mappings** (825+ unique SOCs) from the NCES crosswalk, powering the expanded career picker. |
| `careerCatalog.json` | **826 per-SOC profiles** (O\*NET description, DWAs, tasks, skills, related occupations, BLS wage/growth, OPM series, Adzuna keywords). Lazy-loaded at runtime. |
| `careerBranches.json` | **738 career-specific mechanics**: per-SOC `statModifiers` (salary/happiness nudges from O\*NET data), skill tags, flavor text, and `nodeOverrides` for hand-crafted branches. |
| `cities.json` | **Metro snapshots**: illustrative living wage floors and **regional salary multipliers**. |
| `fsaSchoolHints.json` | **Tiny demo map** of `unitid` → illustrative cohort default rate lines on the financing screen. |

#### Build scripts

| Script | What it generates |
|--------|-------------------|
| `scripts/buildCipToSocCatalog.js` | Downloads the O\*NET Education CIP-to-SOC crosswalk XLSX and generates `cipToSocCatalog.json`. |
| `scripts/buildCareerCatalog.js` | Calls O\*NET for every SOC in the crosswalk to generate `careerCatalog.json` (826 profiles). Incremental mode with `--force` flag. |
| `scripts/buildCipEnrichment.js` | Auto-generates `cipEnrichment.json` from the crosswalk and career catalog. |
| `scripts/buildCareerBranches.js` | Auto-generates `careerBranches.json` with gameplay mechanics from O\*NET skill/knowledge data, preserving hand-crafted overrides. |
| `scripts/fetchRealData.js` | Refreshes national aggregates from Scorecard for maintainer workflows. |

---

### Financial model

The game engine uses **real federal data** instead of simplified flat rates:

| Parameter | Source | Value |
|-----------|--------|-------|
| Direct Subsidized / Unsubsidized rate | 2024-25 federal loan rates | 6.53% |
| Grad PLUS rate | 2024-25 federal loan rates | 8.53% |
| Parent PLUS rate | 2024-25 federal loan rates | 9.08% |
| Inflation rate | BLS CPI-U | 2.9% |
| IDR payment formula | Income-Driven Repayment | 10% of income above 150% FPL |
| FPL (poverty guideline) | HHS 2024 | $15,060 |
| Effective tax rate | Blended estimate | 22% |

Each of the 4 financing archetypes has a blended rate reflecting its loan mix. Between decision nodes, the engine applies IDR payments, accrues debt interest at the archetype's blended rate, grows salary by inflation, and adds after-tax savings to the bank.

---

### Scorecard program pipeline

Raw API arrays are **normalized** (`normalizeProgram`), **deduplicated by 4-digit CIP** (`dedupeProgramsByCip`) with preference for bachelor-level rows when merging, then **ranked for display** (`rankProgramsForDisplay`) by **data completeness** (earnings, debt, completion) and then **earnings**, so schools with sparse reporting still list everything but the best-documented programs surface first. The **MajorPicker** adds **search** (by degree name or CIP code) and **category tabs** (`cipCategories.js`) and caps the visible list with a message to search deeper.

---

### Game flow (technical order)

1. **Title** — New Game / Continue (from `localStorage` save) / How to Play / About the Data. Past Runs comparison table with badges.
2. **Character** — Name and avatar selection.
3. **School** — Scorecard search/detail.
4. **Major** — Full program list for that school; `trackResolver` picks `gameData` major from 8 story tracks; fact modal calls BLS + O\*NET; then phase → **career_path**.
5. **Career path (two-pane)** — Left list shows up to ~10 occupations for the program's CIP (merging `cipToSocCatalog.json`, `careerCatalog.json`, and `cipEnrichment.json`). Right detail pane renders O\*NET description, DWA bullets, typical tasks, top skills, clickable **related occupations** chips, and a side-by-side **live postings** panel: Adzuna (civilian) and USAJobs (federal). Confirming a career fires `setCareerPath` which applies per-SOC `statModifiers`, seeds `careerSkills`, resolves `playthroughNodes` with branch overrides, and injects a **mid-game crossroads node** if the career has related occupations.
6. **City** — `cities.json`; `applyCityToStats` updates both `stats` and `statsBeforeFinancing`.
7. **Financing** — 4 archetypes with real federal loan rate tiers; `applyFinancing`; optional FSA static lines; fact modal → **five_year_outlook**.
8. **Five-year outlook** — `computeFiveYearOutlook` with career growth + BLS inflation, IDR debt reduction, and SVG sparkline chart; stores `outlookPreview` and enters **playing**.
9. **Playing** — `DecisionNode` walks `playthroughNodes`, applying `applyChoice` + `applyYearsBetweenNodes` (salary accumulation, IDR payments, debt interest) between nodes. Career skills auto-increment each decision. **Crossroads node** (year 5) lets players stay or pivot careers with stat penalties.
10. **Game over** — `FinalSummary` with stats grid, **badge panel**, career skills meter, debt payoff estimate (IDR-based), AI retrospective (with fallback), and **shareable results card**. Run saved to playthrough history.

---

### Gameplay features

- **Save/resume** — Game state serialized to `localStorage` on every dispatch, hydrated on load. Continue button on title screen.
- **Playthrough history** — Past runs stored with a comparison table on the title screen (salary, debt, happiness, net worth, badges). Up to 20 runs with deduplication guard for StrictMode.
- **10 achievement badges** — Debt Free, Six Figures, Max Happiness, Penny Pincher, Millionaire, Career Switcher, Bright Future, Skill Master, Against All Odds, Speed Run. Evaluated from final state, displayed in summary, persisted in history, included in share text.
- **Mid-game career crossroads** — Year 5 decision node where players can double down on their career (+salary, +happiness) or pivot to a related O\*NET occupation (salary cut, happiness penalty, new skill set).
- **Career skill progression** — Skills seeded from O\*NET branch data and auto-incremented each decision node.
- **Shareable results card** — Copy-to-clipboard formatted summary of game results.
- **SVG five-year outlook chart** — Salary (green) and debt (red) sparkline trends.

---

### Repository layout

```
src/
  App.jsx                 # Phase router + responsive shell (sidebar drawer, fact modal)
  main.jsx                # Entry point (ToastProvider, ErrorBoundary, GameProvider)
  context/GameContext.jsx  # useReducer store with localStorage persistence + history
  components/             # 17 components: one per phase + FactModal, StatsSidebar, Toast, ErrorBoundary, DataSources
  engine/                 # gameEngine.js (pure math + badges), trackResolver.js
  services/               # scorecardClient, blsClient, onetClient, adzunaClient, usajobsClient, aiService
  utils/                  # facts.js, cipEnrichment.js, useCareerCatalog.js
  constants/              # CIP categories, CIP→major labels, CIP→O*NET SOC, BLS series maps, avatars
  data/                   # gameData, benchmarks, cipEnrichment, cipToSocCatalog, careerCatalog, careerBranches, cities, fsaSchoolHints
  test/                   # 13 Vitest spec files (99 tests)
scripts/                  # 5 build/data scripts
api/                      # Vercel serverless function (usajobs.js)
```

---

## Environment variables

Create `.env.local` (see `.gitignore`; never commit secrets). Typical keys:

| Variable | Purpose |
|----------|---------|
| `COLLEGE_SCORECARD_API_KEY` or `VITE_COLLEGE_SCORECARD_API_KEY` | College Scorecard (dev proxy prefers non-`VITE_` for injection). |
| `BLS_API_KEY` or `VITE_BLS_API_KEY` | Optional BLS registration key for CPI requests. |
| `ONET_API_KEY` or `VITE_ONET_API_KEY` | O\*NET Web Services (fact modal + career picker live detail + build scripts). |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` (optional `VITE_*` for static prod) | Adzuna civilian job postings in the career path picker. Dev proxy injects both server-side. |
| `USAJOBS_EMAIL` / `USAJOBS_API_KEY` | USAJobs federal postings. Dev proxy and Vercel function set the required `User-Agent` and `Authorization-Key` headers. |
| `VITE_GOOGLE_API_KEY` | Google AI for scenario text and final narrative. |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with all API proxies (Scorecard, BLS, O\*NET, Adzuna, USAJOBS). |
| `npm run build` | Production bundle to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | ESLint. |
| `npm run test` / `npm run test:run` | Vitest (watch vs single run). |
| `npm run enrich` | Scorecard script to refresh national-style aggregates. |
| `npm run build:cip-soc` | Generate `cipToSocCatalog.json` from O\*NET crosswalk. |
| `npm run build:cip-enrichment` | Generate `cipEnrichment.json` from crosswalk + catalog. |
| `npm run build:career-catalog` | Refresh `careerCatalog.json` from O\*NET (826 profiles). |
| `npm run build:branches` | Generate `careerBranches.json` from O\*NET skill/knowledge data. |
| `npm run build:all-data` | Run all data build scripts in sequence. |

---

## Deploying to Vercel

The project includes a Vercel serverless function (`api/usajobs.js`) that proxies USAJOBS requests in production, since browsers cannot set the `User-Agent` header that the USAJOBS API requires.

1. Connect the repo to a Vercel project (framework preset: **Vite**).
2. In **Settings → Environment Variables**, add:
   - `USAJOBS_EMAIL` — the registered email (used as the `User-Agent` header)
   - `USAJOBS_API_KEY` — your USAJOBS authorization key
3. Deploy. The function handles `/api/usajobs/*` requests automatically; SPA routing falls back to `index.html` via `vercel.json`.

Other API keys (`VITE_COLLEGE_SCORECARD_API_KEY`, `VITE_GOOGLE_API_KEY`, etc.) should also be set in Vercel environment variables for the production build to use them client-side.

---

## Design tradeoffs (why it is built this way)

- **CIP → 8 simulation tracks + explorer:** Authoring unique narrative trees per major does not scale. The resolver maps broad CIP families to themed tracks, so the **data** is rich while **gameplay** stays maintainable.
- **Static enrichment for careers/cities:** BLS, Census, and living-wage sources are powerful but easy to break in-browser (CORS, keys, quotas). Shipping **curated slices** keeps the demo reliable.
- **Realistic financial model:** Real federal loan rate tiers, BLS inflation, and IDR mechanics deepen educational value beyond a flat-rate toy model.
- **Lazy-loaded career catalog:** The 826-profile catalog (~46K lines) is dynamically imported to avoid bloating the initial bundle.
- **Facts vs fiction:** Modals cite Scorecard/BLS/O\*NET where used; the **five-year outlook** and **debt payoff** helpers are explicitly toy models for comparison, not forecasts.
- **Keys in dev:** Proxies exist so developers do not have to expose `api.data.gov` keys in the client during local work.
- **Graceful degradation:** Every API failure is swallowed with fallback UI (toast notifications, "AI unavailable" text, empty postings panels). The game is fully playable offline with static data alone.

---

## Disclaimer

Figures are **simplified for education and demonstration**. They are **not** individualized financial, career, or legal advice. Always verify decisions with primary sources and professionals.
