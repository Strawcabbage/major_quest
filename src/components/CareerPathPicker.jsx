import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { getCipEnrichment } from '../utils/cipEnrichment'
import { formatUsd } from '../utils/facts'

function buildFallbackCareers(program, stats) {
  const base = stats?.salary ?? 52000
  return [
    {
      id: 'fb_balance',
      title: 'Balanced generalist path',
      soc: null,
      medianWage: base,
      growthPct: 3,
      teaser: 'Typical office or hybrid professional roles with steady skill building.',
    },
    {
      id: 'fb_growth',
      title: 'High-mobility track',
      soc: null,
      medianWage: Math.round(base * 1.08),
      growthPct: 4.5,
      teaser: 'Assumes faster title changes and some lateral moves across employers.',
    },
    {
      id: 'fb_steady',
      title: 'Stability-first track',
      soc: null,
      medianWage: Math.round(base * 0.95),
      growthPct: 2,
      teaser: 'Prioritizes predictable schedules and slower but steadier wage growth.',
    },
  ]
}

export default function CareerPathPicker() {
  const { state, setCareerPath, goPhase } = useGame()
  const { program, stats } = state
  const [picked, setPicked] = useState(null)

  const enrichment = useMemo(() => (program?.cipCode ? getCipEnrichment(program.cipCode) : null), [program])

  const careers = useMemo(() => {
    if (enrichment?.socExamples?.length) {
      return enrichment.socExamples.slice(0, 5).map((ex, i) => ({
        id: `${ex.soc ?? 'soc'}_${i}`,
        title: ex.title,
        soc: ex.soc,
        medianWage: ex.bls?.medianAnnualWage ?? null,
        growthPct: ex.bls?.growthPct2024_2034 ?? 3,
        teaser: ex.onet?.taskTeaser ?? ex.onet?.topSkills?.join(', ') ?? '',
        bright: ex.onet?.brightOutlook,
      }))
    }
    return buildFallbackCareers(program, stats)
  }, [enrichment, program, stats])

  if (!program || !stats) {
    return (
      <div className="pixel-ui p-4 text-[9px] text-stone-500">
        Choose a program first.{' '}
        <button type="button" className="pixel-btn-ghost" onClick={() => goPhase('major')}>
          Back
        </button>
      </div>
    )
  }

  function confirm() {
    const c = picked ?? careers[0]
    if (!c) return
    setCareerPath(
      {
        id: c.id,
        title: c.title,
        soc: c.soc,
        medianWage: c.medianWage,
        growthPct: c.growthPct,
      },
      enrichment ? 'full' : 'scorecard_only',
    )
    goPhase('city')
  }

  return (
    <div className="flex flex-col min-h-full gap-4 pixel-ui px-2 py-4 max-w-xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost text-[8px] mb-3" onClick={() => goPhase('major')}>
          ← Back
        </button>
        <h1 className="text-sm font-bold text-amber-100 uppercase tracking-wider">Career path</h1>
        <p className="text-[9px] text-stone-500 mt-1">
          Example occupations for <span className="text-stone-300">{program.title}</span>
          {enrichment ? '' : ' — limited national context for this CIP; using generic paths.'}
        </p>
      </div>

      <ul className="space-y-2">
        {careers.map((c) => {
          const selected = (picked ?? careers[0])?.id === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                className={`pixel-list-item w-full text-left ${selected ? 'ring-1 ring-amber-500/60' : ''}`}
                onClick={() => setPicked(c)}
              >
                <span className="block text-[10px] text-amber-100 font-semibold">{c.title}</span>
                {c.soc && <span className="block text-[7px] text-stone-600 font-mono">SOC {c.soc}</span>}
                <span className="block text-[8px] text-stone-500 mt-0.5">{c.teaser}</span>
                <span className="block text-[8px] text-stone-400 mt-1">
                  {c.medianWage != null ? `National example wage: ${formatUsd(c.medianWage)} · ` : ''}
                  ~{c.growthPct}% growth (illustrative)
                  {c.bright != null ? ` · Bright outlook: ${c.bright ? 'yes' : 'mixed'}` : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button type="button" className="pixel-btn-primary w-full" onClick={confirm}>
        Continue to location
      </button>
    </div>
  )
}
