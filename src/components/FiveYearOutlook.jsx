import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { computeFiveYearOutlook } from '../engine/gameEngine'
import { formatUsd } from '../utils/facts'

export default function FiveYearOutlook() {
  const { state, startPlayingAfterOutlook, goPhase } = useGame()
  const { stats, selectedCareerPath } = state

  const outlook = useMemo(() => {
    if (!stats) return null
    const g = selectedCareerPath?.growthPct != null ? selectedCareerPath.growthPct / 100 : 0.03
    return computeFiveYearOutlook(stats, { annualGrowthPct: g })
  }, [stats, selectedCareerPath])

  if (!stats || !outlook) {
    return (
      <div className="pixel-ui p-4 text-[9px] text-stone-500">
        Missing run data.{' '}
        <button type="button" className="pixel-btn-ghost" onClick={() => goPhase('financing')}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full gap-4 pixel-ui px-2 py-4 max-w-xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost text-[8px] mb-3" onClick={() => goPhase('financing')}>
          ← Back
        </button>
        <h1 className="text-sm font-bold text-amber-100 uppercase tracking-wider">Five-year outlook</h1>
        <p className="text-[9px] text-stone-500 mt-1">
          Toy projection using ~{(outlook.annualGrowthPct * 100).toFixed(1)}% yearly salary growth (from your career card
          where available) and a simple debt paydown curve — not a forecast.
        </p>
      </div>

      <div className="pixel-panel p-3 overflow-x-auto">
        <table className="w-full text-[8px] text-stone-300">
          <thead>
            <tr className="text-stone-500 text-left">
              <th className="pb-2 pr-2">Yr</th>
              <th className="pb-2 pr-2">Salary</th>
              <th className="pb-2 pr-2">Debt</th>
              <th className="pb-2">Net worth*</th>
            </tr>
          </thead>
          <tbody>
            {outlook.years.map((row) => (
              <tr key={row.year} className="border-t border-stone-800">
                <td className="py-1 pr-2">{row.year}</td>
                <td className="py-1 pr-2">{formatUsd(row.salary)}</td>
                <td className="py-1 pr-2">{formatUsd(row.debt)}</td>
                <td className="py-1">{formatUsd(row.netWorth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[7px] text-stone-600 mt-2">*Bank + rough savings drift minus debt — illustrative only.</p>
      </div>

      <button
        type="button"
        className="pixel-btn-primary w-full"
        onClick={() => startPlayingAfterOutlook({ years: outlook.years, annualGrowthPct: outlook.annualGrowthPct })}
      >
        Start decision years
      </button>
    </div>
  )
}
