import { useGame } from '../context/GameContext'
import { FINANCING_OPTIONS, applyFinancing, fsaStaticFactSnippet } from '../engine/gameEngine'
import { buildFinancingFactLines, formatUsd } from '../utils/facts'

export default function FinancingScreen() {
  const { state, setFinancingStart, openFact, goPhase } = useGame()
  const before = state.statsBeforeFinancing

  if (!before || !state.selectedMajor) {
    return (
      <div className="pixel-ui p-4 text-[9px] text-stone-500">
        Missing program data.{' '}
        <button type="button" className="pixel-btn-ghost" onClick={() => goPhase('major')}>
          Go back
        </button>
      </div>
    )
  }

  function pickPlan(id) {
    const opt = FINANCING_OPTIONS.find((o) => o.id === id)
    if (!opt) return
    setFinancingStart(id)
    const after = applyFinancing(before, id)
    const fact = buildFinancingFactLines(id, before, after, opt.label)
    const fsa = fsaStaticFactSnippet(state.school?.id)
    const lines = fsa?.lines?.length ? [...fact.lines, ...fsa.lines] : fact.lines
    const footnote = [fact.footnote, fsa?.footnote].filter(Boolean).join(' ')
    openFact({ ...fact, lines, footnote, afterClose: 'five_year_outlook' })
  }

  return (
    <div className="flex flex-col min-h-full gap-4 pixel-ui px-2 py-4 max-w-xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost text-[8px] mb-3" onClick={() => goPhase('city')}>
          ← Back
        </button>
        <h1 className="text-sm font-bold text-amber-100 uppercase tracking-wider">Debt & financing</h1>
        <p className="text-[9px] text-stone-500 mt-1">
          Starting debt before aid choices: <span className="text-stone-300">{formatUsd(before.debt)}</span> · Savings:{' '}
          <span className="text-stone-300">{formatUsd(before.bank)}</span>
        </p>
      </div>

      <ul className="space-y-2">
        {FINANCING_OPTIONS.map((opt) => (
          <li key={opt.id}>
            <button type="button" className="pixel-list-item w-full text-left" onClick={() => pickPlan(opt.id)}>
              <span className="block text-[10px] text-amber-100 font-semibold">{opt.label}</span>
              <span className="block text-[8px] text-stone-500">{opt.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
