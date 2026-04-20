import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { computeFiveYearOutlook } from '../engine/gameEngine'
import { formatUsd } from '../utils/facts'
import { useCareerCatalog } from '../utils/useCareerCatalog'

export default function FiveYearOutlook() {
  const { state, startPlayingAfterOutlook, goPhase } = useGame()
  const { stats, selectedCareerPath } = state
  const careerCatalog = useCareerCatalog()

  const outlook = useMemo(() => {
    if (!stats) return null
    const g = selectedCareerPath?.growthPct != null ? selectedCareerPath.growthPct / 100 : 0.03
    return computeFiveYearOutlook(stats, { annualGrowthPct: g })
  }, [stats, selectedCareerPath])

  const dwaLines = useMemo(() => {
    const soc = selectedCareerPath?.soc
    if (!soc) return []
    const profile = careerCatalog.bySoc?.[soc]
    const dwas = profile?.dwas ?? []
    return dwas.slice(0, 3).map((d) => d.title).filter(Boolean)
  }, [selectedCareerPath, careerCatalog])

  if (!stats || !outlook) {
    return (
      <div className="pixel-ui p-4 text-xs text-stone-500">
        Missing run data.{' '}
        <button type="button" className="pixel-btn-ghost" onClick={() => goPhase('financing')}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full gap-5 pixel-ui px-4 py-6 max-w-3xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost mb-4" onClick={() => goPhase('financing')}>
          ← Back
        </button>
        <h1 className="text-base font-bold text-amber-100 uppercase tracking-wider">Five-year outlook</h1>
        <p className="text-xs text-stone-500 mt-2">
          Toy projection using ~{(outlook.annualGrowthPct * 100).toFixed(1)}% yearly salary growth (from your career card
          where available) and a simple debt paydown curve — not a forecast.
        </p>
      </div>

      {dwaLines.length > 0 && (
        <div className="pixel-panel p-4 space-y-1.5">
          <p className="text-[8px] text-stone-500 uppercase tracking-widest">What the work looks like</p>
          <p className="text-[9px] text-stone-500">
            Top O*NET Detailed Work Activities for {selectedCareerPath?.title ?? 'this career'}:
          </p>
          <ul className="list-disc pl-5 text-[10px] text-stone-300 space-y-0.5">
            {dwaLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pixel-panel p-4 overflow-x-auto">
        <table className="w-full text-[10px] text-stone-300">
          <thead>
            <tr className="text-stone-500 text-left">
              <th className="pb-3 pr-4">Yr</th>
              <th className="pb-3 pr-4">Salary</th>
              <th className="pb-3 pr-4">Debt</th>
              <th className="pb-3">Net worth*</th>
            </tr>
          </thead>
          <tbody>
            {outlook.years.map((row) => (
              <tr key={row.year} className="border-t border-stone-800">
                <td className="py-2 pr-4">{row.year}</td>
                <td className="py-2 pr-4">{formatUsd(row.salary)}</td>
                <td className="py-2 pr-4">{formatUsd(row.debt)}</td>
                <td className="py-2">{formatUsd(row.netWorth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[9px] text-stone-600 mt-3">*Bank + rough savings drift minus debt — illustrative only.</p>
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
