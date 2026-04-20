# Major Quest — Roadmap

Feature ideas and improvement suggestions for the project, organized by priority and category.

---

## New Features

### Save & Resume (high impact)

There is no persistence today — refreshing the page loses all progress. Save the full game state to `localStorage` on every dispatch and show a "Continue" button on the title screen when a save exists. Consider versioning the schema so future changes don't silently corrupt old saves.

### Shareable End-of-Game Card

`FinalSummary` produces rich data (net worth, debt payoff, skills, AI retrospective) but there is no way to share it. Add a "Share" button that either copies a text summary to the clipboard or generates a visual card using `html2canvas` / a canvas-based renderer.

### More Story Tracks

`gameData.json` only defines four tracks: `cs_001`, `nursing_001`, `english_001`, and the catch-all `explorer_001`. Every CIP that doesn't match the first three gets the same generic nodes. Adding 5–10 more tracks (business, engineering, education, arts, health sciences, social sciences, etc.) would make different major choices feel meaningfully different.

### Comparative Playthrough History

Let the player finish multiple runs and compare them side-by-side — "What if I'd picked Nursing at State U vs. CS at Community College?" A history table on the title screen with past runs' final stats would add replayability.

### Difficulty / Realism Modes

The financial model uses a flat 6% APR, four financing archetypes, and a single salary growth rate. A "realistic" mode could use actual federal loan rate tiers, income-driven repayment plan mechanics, and real BLS inflation data to deepen the educational value.

### Mid-Game Career Pivot

The career path is currently locked in at step 5. A mid-game "crossroads" event that lets the player switch careers (with a salary/happiness penalty) would mirror real-life career changes and make the decision tree more dynamic.

### Multiplayer / Classroom Mode

A "classroom" variant where a teacher projects a leaderboard and students play simultaneously on their phones. Even a simple shared-code room with a final-stats comparison would work well for educational settings.

### Undo / Back Button During Gameplay

During the `playing` phase, there is no way to reconsider a choice. An undo-last-choice button (or at least a confirmation step for each decision) would reduce frustration.

### Achievements / Milestones

Award badges for certain outcomes (e.g., "Debt Free", "Six Figures", "Max Happiness", "Speed Run"). These give the player micro-goals beyond the final summary and encourage replays.

### Data Citations Panel

The game uses data from College Scorecard, O\*NET, BLS, Adzuna, and USAJOBS. A dedicated "Sources" or "About the Data" screen (accessible from the title screen or sidebar) explaining each source and linking to the APIs would strengthen the educational mission and build trust.

---

## Improvements to Existing Features

### Story Depth for the Explorer Track

The `explorer_001` track covers the vast majority of the 415 mapped CIPs, but its `ai_context` fields are generic. At minimum, template those strings with the player's actual major name and career title so the AI generates more relevant scenarios. Better yet, generate them dynamically based on the player's selected SOC and its O\*NET data (skills, DWAs).

### USAJOBS in Production Builds

`usajobsClient.js` returns `[]` unless `import.meta.env.DEV` is true, so federal job postings are invisible in any production or preview build. To support a deployed demo, add a lightweight serverless proxy (Vercel/Netlify function) that attaches the required `User-Agent` header.

### AI Error Feedback

When the Gemini API key is missing or the call fails, `DecisionNode` shows the raw `ai_context` fallback text with no explanation. `FinalSummary` has a fallback retrospective but the player doesn't know it wasn't AI-generated. Add a subtle indicator (e.g., "AI unavailable — showing default text") so the experience doesn't feel broken.

### Career Branches Coverage

`careerBranches.json` only has branches for a handful of SOCs. For most careers `hasMechanics` is false, so no skill deltas or node overrides apply. A build script that auto-generates lightweight branches from O\*NET skill/knowledge data would make career choice feel more impactful during gameplay.

### City Picker Depth

`cities.json` is a short static list of 6 metros with hardcoded multipliers. Expanding this to 20–30 cities, or pulling cost-of-living data from BLS area wage statistics at build time, would make the location step more meaningful. Consider letting the player search for a city instead of picking from a fixed list.

### Five-Year Outlook Visualization

`FiveYearOutlook` displays a plain HTML table. A line chart showing salary vs. debt over time would be much more intuitive. A lightweight SVG sparkline or a small chart library like `recharts` would fit the pixel aesthetic.

### Fact Modal Information Density

The `FactModal` screens (school facts, program facts, financing facts) can get very long. Grouping content into collapsible sections or tabs (Costs, Outcomes, Demographics) would prevent information overload.

### Decision Node — Show Consequences More Clearly

During gameplay the choice buttons show deltas for bank, mood, and salary multiplier. They don't show the resulting absolute values. Adding a "preview" of what stats would become after each choice would help players make more informed decisions.

### Financing Screen — Show Before/After Side-by-Side

`FinancingScreen` shows starting debt and savings above the options list but doesn't preview what each plan does until after you click. Showing the resulting debt/bank inline on each option button would let players compare without trial-and-error.

### Mobile Responsiveness

The layout uses fixed widths (`w-72`, `w-80`) for `StatsSidebar` and very small text (`text-[9px]`, `text-[10px]`). On small screens the sidebar likely overflows or the game area gets cramped. The sidebar should collapse into a top bar or bottom drawer on mobile viewports.

---

## Code Quality & Architecture

### Testing Coverage

Most tests are data-integrity checks on JSON files and engine logic. Only `CareerPathPicker` has a component-level test. Adding integration tests for the core flow (CharacterCreation → SchoolPicker → MajorPicker → gameplay → FinalSummary) would catch UI regressions.

### Centralize API Error Handling

Each component handles API failures differently — some set local error state, some silently swallow, some now show toasts. A centralized `useApiFetch` hook with consistent retry, error-toast, and loading-state logic would reduce duplication.

### Extract Stat Display Components

The stat formatting pattern (currency formatting, color by positive/negative, small-text labels) is duplicated across `StatsSidebar`, `FinalSummary`, `CityPicker`, and `FinancingScreen`. Extracting shared `<MoneyBadge>`, `<StatChip>`, etc. components would reduce duplication.

### Type Safety

The project uses plain JavaScript with JSDoc annotations in a few places. Converting to TypeScript (or at least adding a `jsconfig.json` with strict checks) would catch bugs in the complex state shape and API response handling.

### Environment Variable Validation

API keys are read at call sites with no validation. A startup check (or a `.env.example` file with clear documentation) that warns if required keys are missing would save debugging time.

---

## Data Pipeline

### Auto-Refresh Workflow

The `build:all-data` script regenerates all static JSON from O\*NET and the CIP crosswalk. A GitHub Action that runs this weekly (or on a schedule) and opens a PR with the diff would keep the data fresh without manual effort.

### Reduce careerCatalog.json Size

At 1.3MB gzipped, `careerCatalog.json` is still large. Trimming rarely-used fields (e.g., full `related` arrays, verbose `tasks`) or splitting into per-CIP chunks that load on demand would further improve load times.

### BLS Wage Data in Build Script

`careerCatalog.json` stores BLS wage/growth fields but many entries have `null` values because the O\*NET API doesn't always return them. A build step that cross-references the BLS Occupational Employment and Wage Statistics (OEWS) dataset by SOC code would fill in the gaps.
