import { useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { computeNetWorth } from '../engine/gameEngine'
import { generateCareerRetrospective } from '../services/aiService'

export default function FinalSummary() {
  const { state, setRetrospective, restart } = useGame()
  const { stats, selectedMajor, choiceHistory, retrospective } = state

  const netWorth = computeNetWorth(stats)

  useEffect(() => {
    if (retrospective) return
    generateCareerRetrospective({
      major: selectedMajor.title,
      finalStats: stats,
      choiceHistory,
    }).then(setRetrospective)
  }, [])

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
          10-Year Reality Check
        </p>
        <h2 className="text-3xl font-bold text-white mb-1">
          {selectedMajor.emoji} {selectedMajor.title}
        </h2>
        <p className="text-gray-400">Here's where your choices landed you.</p>
      </div>

      {/* Final Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Final Salary',
            value: fmt(stats.salary),
            color: 'text-emerald-400',
          },
          {
            label: 'Net Worth',
            value: fmt(netWorth),
            color: netWorth >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
          {
            label: 'Happiness',
            value: `${stats.happiness}/100`,
            color: stats.happiness > 60 ? 'text-emerald-400' : 'text-yellow-400',
          },
          {
            label: 'Remaining Debt',
            value: fmt(stats.debt),
            color: stats.debt > 0 ? 'text-red-400' : 'text-emerald-400',
          },
        ].map((item) => (
          <div key={item.label} className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* AI Retrospective — structured { title, story } */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
          LinkedIn Retrospective
        </p>
        {retrospective ? (
          <>
            <p className="text-white font-semibold mb-2">{retrospective.title}</p>
            <p className="text-gray-300 leading-relaxed italic">"{retrospective.story}"</p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="animate-pulse">●</span>
            <span className="text-sm">Writing your story…</span>
          </div>
        )}
      </div>

      <button
        onClick={restart}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
      >
        Play Again
      </button>
    </div>
  )
}
