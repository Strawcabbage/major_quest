import { useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { computeNetWorth, estimateDebtPayoffMonths } from '../engine/gameEngine'
import { generateCareerRetrospective } from '../services/aiService'
import { debtToEarningsRatio, formatUsd } from '../utils/facts'

export default function FinalSummary() {
  const { state, setRetrospective, restart } = useGame()
  const {
    stats,
    selectedMajor,
    choiceHistory,
    retrospective,
    school,
    program,
    playerName,
    statsBeforeFinancing,
    selectedCareerPath,
    selectedCity,
    outlookPreview,
    dataQualityFlags,
    careerSkills,
  } = state

  const skillEntries = careerSkills
    ? Object.entries(careerSkills).sort(([, a], [, b]) => b - a)
    : []
  const maxSkill = skillEntries.reduce((m, [, v]) => Math.max(m, v), 0)

  const netWorth = computeNetWorth(stats)
  const payoffMonths = estimateDebtPayoffMonths({
    debt: stats.debt,
    annualSalary: stats.salary,
  })
  const dte = debtToEarningsRatio(stats.debt, stats.salary)

  useEffect(() => {
    if (retrospective || !selectedMajor || !stats) return
    generateCareerRetrospective({
      major: selectedMajor.title,
      finalStats: stats,
      choiceHistory,
    }).then(setRetrospective)
  }, [retrospective, selectedMajor, stats, choiceHistory, setRetrospective])

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="flex flex-col gap-6 max-w-xl pixel-ui w-full">
      <div>
        <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500 mb-2">10-year reality check</p>
        <h2 className="text-sm sm:text-base font-bold text-amber-100 mb-1 leading-snug">
          {selectedMajor.emoji} {selectedMajor.title}
        </h2>
        <p className="text-[9px] text-stone-400">
          {playerName ? `${playerName}, ` : ''}
          here is where your run ended — numbers are game + Scorecard seeds, not personal advice.
        </p>
        {(school?.name || program?.title) && (
          <p className="text-[8px] text-stone-500 mt-2 leading-relaxed">
            {school?.name && <span className="block">School: {school.name}</span>}
            {program?.title && <span className="block">Field of study: {program.title}</span>}
          </p>
        )}
        {(selectedCareerPath || selectedCity) && (
          <p className="text-[8px] text-stone-500 mt-2 leading-relaxed">
            {selectedCareerPath?.title && (
              <span className="block">
                Career path: {selectedCareerPath.title}
                {selectedCareerPath.soc ? ` (SOC ${selectedCareerPath.soc})` : ''}
              </span>
            )}
            {selectedCity?.label && <span className="block">Location model: {selectedCity.label}</span>}
            {dataQualityFlags && (
              <span className="block text-stone-600 mt-1">
                Data depth — career: {dataQualityFlags.career}; city: {dataQualityFlags.city}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Final salary', value: fmt(stats.salary), color: 'text-emerald-400' },
          { label: 'Net worth', value: fmt(netWorth), color: netWorth >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Happiness', value: `${stats.happiness}/100`, color: stats.happiness > 60 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Debt left', value: fmt(stats.debt), color: stats.debt > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map((item) => (
          <div key={item.label} className="pixel-panel p-3">
            <p className="text-[7px] text-stone-500 mb-1 uppercase tracking-wide">{item.label}</p>
            <p className={`text-[11px] font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {skillEntries.length > 0 && (
        <div className="pixel-panel p-4 space-y-2">
          <p className="text-[8px] text-stone-500 uppercase tracking-widest">Career skills meter</p>
          <p className="text-[9px] text-stone-500 leading-snug">
            Tally of career-flavored choices during the playing phase (O*NET-style skill tags on your SOC).
          </p>
          <ul className="space-y-1.5">
            {skillEntries.map(([skill, value]) => {
              const pct = maxSkill > 0 ? Math.max(0, Math.min(100, (value / Math.max(maxSkill, 1)) * 100)) : 0
              return (
                <li key={skill} className="flex items-center gap-2 text-[9px] text-stone-300">
                  <span className="w-36 truncate">{skill}</span>
                  <span className="flex-1 h-2 bg-stone-800 rounded-sm overflow-hidden">
                    <span
                      className="block h-full bg-sky-400/70"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-sky-300">{value}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {outlookPreview?.years?.length > 0 && (
        <div className="pixel-panel p-4 space-y-2">
          <p className="text-[8px] text-stone-500 uppercase tracking-widest">Pre-play outlook snapshot</p>
          <p className="text-[9px] text-stone-300 leading-relaxed">
            Year 5 (toy model): salary {fmt(outlookPreview.years[5]?.salary ?? stats.salary)}, debt{' '}
            {fmt(outlookPreview.years[5]?.debt ?? stats.debt)}, net worth {fmt(outlookPreview.years[5]?.netWorth ?? 0)}.
          </p>
          <p className="text-[7px] text-stone-600">
            Growth assumption baked in: ~{((outlookPreview.annualGrowthPct ?? 0) * 100).toFixed(1)}% / yr (illustrative).
          </p>
        </div>
      )}

      <div className="pixel-panel p-4 space-y-2">
        <p className="text-[8px] text-stone-500 uppercase tracking-widest">Simplified debt picture</p>
        <p className="text-[9px] text-stone-300 leading-relaxed">
          Debt-to-earnings (debt ÷ annual salary):{' '}
          <span className="text-amber-200 font-bold">{dte != null ? dte.toFixed(2) : '—'}</span>
        </p>
        <p className="text-[9px] text-stone-300 leading-relaxed">
          Rough months to pay off debt if you steer ~10% of salary yearly to loans at 6% APR (toy model):{' '}
          <span className="text-amber-200 font-bold">
            {payoffMonths == null ? (stats.debt <= 0 ? 'Paid off' : 'Unable to estimate') : `${payoffMonths} mo (~${Math.round(payoffMonths / 12)} yr)`}
          </span>
        </p>
        <p className="text-[7px] text-stone-600 leading-snug">
          Starting debt for this run began near {formatUsd(statsBeforeFinancing?.debt ?? stats.debt)} before financing choices; final debt includes in-game events and 6% interest between decision years.
        </p>
      </div>

      <div className="pixel-panel p-4">
        <p className="text-[8px] text-stone-500 uppercase tracking-widest mb-2">LinkedIn retrospective</p>
        {retrospective ? (
          <>
            <p className="text-amber-50 font-semibold text-[10px] mb-2 leading-snug">{retrospective.title}</p>
            <p className="text-stone-300 text-[9px] leading-relaxed italic">"{retrospective.story}"</p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-stone-500 text-[9px]">
            <span className="animate-pulse">▪</span>
            <span>Writing your story…</span>
          </div>
        )}
      </div>

      <button type="button" onClick={restart} className="pixel-btn-primary w-full">
        Play again
      </button>
    </div>
  )
}
