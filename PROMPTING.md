# Prompting Guide for Major Quest

How to get clean, bug-free feature implementations from an AI coding agent in this project.

---

## Recommended Feature Order

### Tier 1 — Quick wins (low risk, high impact)

1. **Save & Resume** — Serialize state to `localStorage` on dispatch, hydrate on load. Touches `GameContext.jsx` and `TitleScreen.jsx`.
2. **AI error feedback** — Show "AI unavailable" text when Gemini returns null. Small change in `DecisionNode.jsx` and `FinalSummary.jsx`.
3. **Shareable end card** — Copy-to-clipboard or visual card in `FinalSummary.jsx`. No game logic changes.

### Tier 2 — Moderate complexity, high payoff

4. **Template the explorer track's `ai_context`** — Inject the player's major name, career title, and top O\*NET skills into the generic `explorer_001` node contexts before sending to Gemini. Makes every playthrough feel unique without authoring new content.
5. **Expand the city picker** — More cities in `cities.json`, optional search input. Mostly data work.
6. **Five-year outlook chart** — SVG sparkline or small chart in `FiveYearOutlook.jsx`. Self-contained.

### Tier 3 — Save for later (higher complexity / integration risk)

7. More story tracks (large content effort)
8. Comparative playthrough history (needs save system first)
9. Mid-game career pivot (changes core game flow)
10. Multiplayer/classroom mode (needs backend infrastructure)

---

## Prompting Principles

### 1. One feature per request

Don't ask for multiple features at once. The more work packed into a single prompt, the more likely subtle integration bugs appear.

**Good:**
> "Implement save & resume. Save the full game state to localStorage whenever the reducer dispatches, and show a Continue button on the title screen when a save exists."

**Avoid:**
> "Implement all the tier 1 features from the roadmap."

### 2. Name the files you expect to be touched

Constraining scope keeps the agent focused and prevents unrelated changes.

> "This should only require changes to GameContext.jsx and TitleScreen.jsx."

### 3. Tell the agent to read before writing

The most common source of bugs is assuming how something works instead of checking.

> "Read the current GameContext.jsx reducer before making changes."

### 4. Ask for verification after each feature

> "After implementing, run the full test suite and fix any failures before moving on."

### 5. Reference existing patterns

This codebase has clear conventions. Naming them prevents the agent from inventing new abstractions.

- Phase-string routing (`goPhase('title')`)
- `useGame()` hook for context access
- `pixel-*` CSS classes for UI
- `useMemo` for derived data
- `Promise.allSettled` for parallel API calls

> "Follow the same pattern as the existing phase components."

### 6. State what you don't want

Negative constraints prevent over-engineering.

- "Don't add new npm dependencies for this."
- "Don't change the reducer's state shape — only add to it."
- "Don't refactor existing components as part of this change."
- "Keep it simple — no new context providers."

---

## Template Prompt

```
Implement [feature name].

[1-2 sentence description of what it should do.]

- Read [relevant files] before making any changes.
- Only modify [list of files] (plus a small utility if needed).
- Follow existing patterns — use the same useGame() hook, pixel-btn-* classes,
  and phase-string routing.
- Don't add new dependencies.
- Run the test suite after and fix any failures.
```

### Example: Save & Resume

```
Implement save & resume.

Save the full game state to localStorage on every reducer dispatch. On the title
screen, check for a saved game and show a "Continue" button that restores it.

- Read GameContext.jsx and TitleScreen.jsx before making any changes.
- Only modify those two files (plus a small utility if needed).
- Follow existing patterns — use the same useGame() hook, pixel-btn-* classes,
  and phase-string routing.
- Don't add new dependencies.
- Run the test suite after and fix any failures.
```

---

## Key Codebase Conventions

| Pattern | Where it's used |
|---------|----------------|
| Phase strings for routing | `GameContext.jsx` reducer, every screen component |
| `useGame()` for all state/actions | Every component under `src/components/` |
| `pixel-*` Tailwind classes | All UI elements |
| Static JSON imports for data | `gameData.json`, `cipToSocCatalog.json`, `cities.json`, etc. |
| `useCareerCatalog()` hook | Lazy-loaded career data in `CareerPathPicker` and `FiveYearOutlook` |
| `openFact()` / `FactModal` | Informational pop-ups between phases |
| `Toast` / `useToast()` | Lightweight non-blocking error messages |
| `ErrorBoundary` | Wraps the entire app in `main.jsx` |
| `Promise.allSettled` | Parallel API calls that shouldn't block each other |
| Build scripts in `scripts/` | Offline data generation, not runtime |
