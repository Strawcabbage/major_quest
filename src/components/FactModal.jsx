import { useEffect, useRef } from 'react'
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
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!fact) return
    const el = dialogRef.current
    if (el) el.focus()

    function onKey(e) {
      if (e.key === 'Escape') closeFact()
      if (e.key === 'Tab') {
        const focusable = el?.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fact, closeFact])

  if (!fact) return null

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pixel-ui outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fact-title"
      onClick={(e) => { if (e.target === e.currentTarget) closeFact() }}
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
