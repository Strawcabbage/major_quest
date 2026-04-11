import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { generateScenarioText } from '../services/aiService'

export default function DecisionNode() {
  const { state, makeChoice, setScenarioText } = useGame()
  const { selectedMajor, currentNodeIndex, stats, scenarioText } = state
  const [loadingAI, setLoadingAI] = useState(false)
  const [choosing, setChoosing] = useState(false)

  const node = selectedMajor?.nodes[currentNodeIndex]

  // Fetch AI flavor text whenever the node changes
  useEffect(() => {
    if (!node) return
    setLoadingAI(true)
    generateScenarioText({
      major: selectedMajor.title,
      year: node.year,
      phase: node.phase,
      nodeContext: node.ai_context,
      stats,
    }).then((text) => {
      setScenarioText(text)
      setLoadingAI(false)
    })
  }, [node?.node_id])

  async function handleChoice(option) {
    if (choosing) return
    setChoosing(true)
    makeChoice(option, node)
    setChoosing(false)
  }

  if (!node) return null

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      {/* Phase + Year badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-900/40 px-3 py-1 rounded-full">
          {node.phase}
        </span>
        <span className="text-xs text-gray-500">Year {node.year}</span>
      </div>

      {/* AI Scenario Text — structured { title, story } */}
      <div className="min-h-[80px]">
        {loadingAI ? (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">●</span>
            <span className="text-sm">Generating your story…</span>
          </div>
        ) : scenarioText ? (
          <>
            <h2 className="text-white font-bold text-xl mb-2">{scenarioText.title}</h2>
            <p className="text-gray-300 leading-relaxed">{scenarioText.story}</p>
          </>
        ) : (
          <p className="text-gray-500 italic text-sm">{node.ai_context}</p>
        )}
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-3">
        {node.options.map((option) => {
          const wealthDelta = option.impact.bank_delta
          const happinessDelta = option.impact.happiness_delta
          return (
            <button
              key={option.option_id}
              onClick={() => handleChoice(option)}
              disabled={loadingAI || choosing}
              className="group bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 rounded-xl p-5 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <p className="text-white font-medium mb-2">{option.label}</p>
              <div className="flex gap-4 text-xs">
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
                  {happinessDelta >= 0 ? '+' : ''}{happinessDelta} happiness
                </span>
                <span className="text-indigo-400">
                  ×{option.impact.salary_multiplier.toFixed(1)} salary
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
