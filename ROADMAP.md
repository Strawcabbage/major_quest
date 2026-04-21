# Major Quest — Roadmap

Feature ideas and improvement suggestions for the project, organized by priority and category.

---

## New Features

### Multiplayer / Classroom Mode

A "classroom" variant where a teacher projects a leaderboard and students play simultaneously on their phones. Even a simple shared-code room with a final-stats comparison would work well for educational settings.

### Undo / Back Button During Gameplay

During the `playing` phase, there is no way to reconsider a choice. An undo-last-choice button (or at least a confirmation step for each decision) would reduce frustration.

---

## Improvements to Existing Features

### City Picker Depth

`cities.json` is a short static list of 6 metros with hardcoded multipliers. Expanding this to 20–30 cities, or pulling cost-of-living data from BLS area wage statistics at build time, would make the location step more meaningful. Consider letting the player search for a city instead of picking from a fixed list.

### Fact Modal Information Density

The `FactModal` screens (school facts, program facts, financing facts) can get very long. Grouping content into collapsible sections or tabs (Costs, Outcomes, Demographics) would prevent information overload.

### Decision Node — Show Consequences More Clearly

During gameplay the choice buttons show deltas for bank, mood, and salary multiplier. They don't show the resulting absolute values. Adding a "preview" of what stats would become after each choice would help players make more informed decisions.

### Financing Screen — Show Before/After Side-by-Side

`FinancingScreen` shows starting debt and savings above the options list but doesn't preview what each plan does until after you click. Showing the resulting debt/bank inline on each option button would let players compare without trial-and-error.

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
