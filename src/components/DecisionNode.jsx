import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { generateScenarioText } from '../services/aiService'

export default function DecisionNode() {
  const { state, makeChoice, setScenarioText } = useGame()
  const { selectedMajor, currentNodeIndex, stats, scenarioText } = state
  const [loadingAI, setLoadingAI] = useState(false)
  const [choosing, setChoosing] = useState(false)

  const node = selectedMajor?.nodes[currentNodeIndex]

  useEffect(() => {
    if (!node || !selectedMajor) return
    let cancelled = false
    setLoadingAI(true)
    generateScenarioText({
      major: selectedMajor.title,
      year: node.year,
      phase: node.phase,
      nodeContext: node.ai_context,
      stats,
    }).then((text) => {
      if (!cancelled) {
        setScenarioText(text)
        setLoadingAI(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only when the node identity changes
  }, [node?.node_id, selectedMajor?.major_id, setScenarioText])

  async function handleChoice(option) {
    if (choosing) return
    setChoosing(true)
    makeChoice(option, node)
    setChoosing(false)
  }

  if (!node) return null

  return (
    <div className="flex flex-col gap-6 max-w-xl pixel-ui w-full">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[8px] font-bold uppercase tracking-widest text-amber-200 bg-amber-950/50 border border-amber-800/60 px-2 py-1">
          {node.phase}
        </span>
        <span className="text-[8px] text-stone-500">Year {node.year}</span>
      </div>

      <div className="min-h-[72px] pixel-panel p-4">
        {loadingAI ? (
          <div className="flex items-center gap-2 text-stone-500 text-[9px]">
            <span className="animate-pulse">▪</span>
            <span>Generating your story…</span>
          </div>
        ) : scenarioText ? (
          <>
            <h2 className="text-amber-100 font-bold text-[10px] sm:text-xs mb-2 leading-snug">
              {scenarioText.title}
            </h2>
            <p className="text-stone-300 text-[9px] sm:text-[10px] leading-relaxed">{scenarioText.story}</p>
          </>
        ) : (
          <p className="text-stone-500 italic text-[9px]">{node.ai_context}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {node.options.map((option) => {
          const wealthDelta = option.impact.bank_delta
          const happinessDelta = option.impact.happiness_delta
          return (
            <button
              key={option.option_id}
              type="button"
              onClick={() => handleChoice(option)}
              disabled={loadingAI || choosing}
              className="pixel-list-item text-left disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <p className="text-amber-50 font-semibold text-[10px] mb-1">{option.label}</p>
              <div className="flex flex-wrap gap-2 text-[8px]">
                <span className={wealthDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {wealthDelta >= 0 ? '+' : ''}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  }).format(wealthDelta)}{' '}
                  bank
                </span>
                <span className={happinessDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {happinessDelta >= 0 ? '+' : ''}
                  {happinessDelta} mood
                </span>
                <span className="text-amber-600/90">×{option.impact.salary_multiplier.toFixed(1)} salary</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
