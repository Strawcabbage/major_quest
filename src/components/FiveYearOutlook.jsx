import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { computeFiveYearOutlook } from '../engine/gameEngine'
import { formatUsd } from '../utils/facts'
import { useCareerCatalog } from '../utils/useCareerCatalog'

function OutlookChart({ years }) {
  const W = 320
  const H = 120
  const PAD = { top: 10, right: 10, bottom: 20, left: 10 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const allValues = years.flatMap((y) => [y.salary, y.debt])
  const max = Math.max(...allValues, 1)
  const min = Math.min(...allValues, 0)
  const range = max - min || 1

  function x(i) { return PAD.left + (i / (years.length - 1)) * chartW }
  function y(v) { return PAD.top + chartH - ((v - min) / range) * chartH }

  const salaryPoints = years.map((yr, i) => `${x(i)},${y(yr.salary)}`).join(' ')
  const debtPoints = years.map((yr, i) => `${x(i)},${y(yr.debt)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs h-auto" aria-label="Salary vs Debt chart">
      {years.map((yr, i) => (
        <line key={i} x1={x(i)} y1={PAD.top} x2={x(i)} y2={H - PAD.bottom} stroke="#292524" strokeWidth="0.5" />
      ))}
      <polyline points={salaryPoints} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={debtPoints} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {years.map((yr, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(yr.salary)} r="3" fill="#34d399" />
          <circle cx={x(i)} cy={y(yr.debt)} r="3" fill="#f87171" />
          <text x={x(i)} y={H - 4} textAnchor="middle" className="fill-stone-500" style={{ fontSize: '8px' }}>
            Y{yr.year}
          </text>
        </g>
      ))}
      <text x={PAD.left + 2} y={PAD.top - 2} className="fill-emerald-400" style={{ fontSize: '7px' }}>Salary</text>
      <text x={W - PAD.right - 2} y={PAD.top - 2} textAnchor="end" className="fill-red-400" style={{ fontSize: '7px' }}>Debt</text>
    </svg>
  )
}

export default function FiveYearOutlook() {
  const { state, startPlayingAfterOutlook, goPhase } = useGame()
  const { stats, selectedCareerPath, financingId } = state
  const careerCatalog = useCareerCatalog()

  const outlook = useMemo(() => {
    if (!stats) return null
    const g = selectedCareerPath?.growthPct != null ? selectedCareerPath.growthPct / 100 : 0.03
    return computeFiveYearOutlook(stats, { annualGrowthPct: g, financingId })
  }, [stats, selectedCareerPath, financingId])

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
          Toy projection using ~{(outlook.annualGrowthPct * 100).toFixed(1)}% career growth + 2.9% BLS inflation,
          tiered federal loan rates, and IDR-style repayment — not a forecast.
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

      <div className="pixel-panel p-4">
        <p className="text-[8px] text-stone-500 uppercase tracking-widest mb-3">Salary vs. Debt</p>
        <OutlookChart years={outlook.years} />
      </div>

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
