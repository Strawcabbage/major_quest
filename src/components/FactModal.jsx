import { useGame } from '../context/GameContext'

function FactLine({ line, index }) {
  if (typeof line === 'string') {
    return (
      <div className="border-l-2 border-amber-600/50 pl-4 py-2 text-[11px] text-stone-300 leading-relaxed">
        {line}
      </div>
    )
  }

  if (line.section) {
    return (
      <div className={index === 0 ? 'pb-2' : 'pt-6 pb-2'}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/80">{line.section}</span>
        <div className="border-b border-stone-700 mt-2" />
      </div>
    )
  }

  if (line.label != null) {
    return (
      <div className="flex justify-between items-baseline gap-6 py-2.5 border-b border-stone-800/50 last:border-0">
        <span className="text-[10px] text-stone-400 shrink-0">{line.label}</span>
        <span className="text-[11px] font-semibold text-stone-100 text-right">{line.value}</span>
      </div>
    )
  }

  return null
}

export default function FactModal() {
  const { state, closeFact, backFact } = useGame()
  const fact = state.factModal
  if (!fact) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pixel-ui"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fact-title"
    >
      <div className="pixel-dialog max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="pixel-dialog-header">
          <h2 id="fact-title" className="text-sm font-bold text-amber-100 uppercase tracking-wide">
            {fact.title}
          </h2>
        </div>

        <div className="pixel-dialog-body">
          <div>
            {fact.lines.map((line, i) => (
              <FactLine key={i} line={line} index={i} />
            ))}
          </div>
          <p className="text-[9px] text-stone-500 leading-relaxed border-t border-stone-700 pt-5 mt-6">
            {fact.footnote}
          </p>
        </div>

        <div className="pixel-dialog-footer flex gap-3">
          {fact.backPhase && (
            <button type="button" onClick={() => backFact(fact.backPhase)} className="pixel-btn-ghost">
              ← Back
            </button>
          )}
          <button type="button" onClick={closeFact} className="pixel-btn-primary w-full sm:w-auto">
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
