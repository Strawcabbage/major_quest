import { useGame } from '../context/GameContext'

export default function FactModal() {
  const { state, closeFact } = useGame()
  const fact = state.factModal
  if (!fact) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pixel-ui"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fact-title"
    >
      <div className="pixel-dialog max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="pixel-dialog-header">
          <h2 id="fact-title" className="text-[10px] sm:text-xs font-bold text-amber-100 uppercase tracking-wide">
            {fact.title}
          </h2>
        </div>
        <div className="pixel-dialog-body space-y-3">
          <ul className="list-none space-y-2 text-[9px] sm:text-[10px] leading-relaxed text-stone-200">
            {fact.lines.map((line, i) => (
              <li key={i} className="border-l-2 border-amber-600/60 pl-2">
                {line}
              </li>
            ))}
          </ul>
          <p className="text-[8px] sm:text-[9px] text-stone-500 leading-snug border-t border-stone-700 pt-2">
            {fact.footnote}
          </p>
        </div>
        <div className="pixel-dialog-footer">
          <button type="button" onClick={closeFact} className="pixel-btn-primary w-full sm:w-auto">
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
