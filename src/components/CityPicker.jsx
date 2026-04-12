import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import citiesData from '../data/cities.json'
import { salaryToLivingWageRatio } from '../engine/gameEngine'
import { formatUsd } from '../utils/facts'

export default function CityPicker() {
  const { state, applySelectedCity, goPhase } = useGame()
  const { stats } = state
  const [selectedId, setSelectedId] = useState('us_avg')

  const cities = useMemo(() => citiesData.cities ?? [], [])

  if (!stats) {
    return (
      <div className="pixel-ui p-4 text-[9px] text-stone-500">
        Missing stats.{' '}
        <button type="button" className="pixel-btn-ghost" onClick={() => goPhase('career_path')}>
          Back
        </button>
      </div>
    )
  }

  function confirm() {
    const city = cities.find((c) => c.id === selectedId) ?? cities[0]
    applySelectedCity(city)
    goPhase('financing')
  }

  return (
    <div className="flex flex-col min-h-full gap-4 pixel-ui px-2 py-4 max-w-xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost text-[8px] mb-3" onClick={() => goPhase('career_path')}>
          ← Back
        </button>
        <h1 className="text-sm font-bold text-amber-100 uppercase tracking-wider">Where you land</h1>
        <p className="text-[9px] text-stone-500 mt-1">
          Static metro snapshots: salary is adjusted by a simple regional multiplier vs national baseline.{' '}
          <span className="text-stone-600">{citiesData.footnote}</span>
        </p>
      </div>

      <ul className="space-y-2">
        {cities.map((c) => {
          const adjSalary = Math.round(stats.salary * (c.regionalSalaryMultiplier ?? 1))
          const ratio = salaryToLivingWageRatio(adjSalary, c.livingWageAnnual)
          const selected = selectedId === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`pixel-list-item w-full text-left ${selected ? 'ring-1 ring-amber-500/60' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="block text-[10px] text-amber-100 font-semibold">{c.label}</span>
                <span className="block text-[8px] text-stone-500 mt-0.5">
                  Modeled salary after regional factor: {formatUsd(adjSalary)} · Living wage floor ~{formatUsd(c.livingWageAnnual)}{' '}
                  {ratio != null ? `· Coverage ratio ${ratio.toFixed(2)}×` : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button type="button" className="pixel-btn-primary w-full" onClick={confirm}>
        Continue to financing
      </button>
    </div>
  )
}
