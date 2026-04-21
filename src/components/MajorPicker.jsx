import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import gameData from '../data/gameData.json'
import { storyTrackLabel } from '../constants/cipMap'
import { cipUiCategory, UI_CATEGORIES } from '../constants/cipCategories'
import { resolveTrackForCip } from '../engine/trackResolver'
import { programDataCompletenessScore } from '../services/scorecardClient'
import { buildProgramFactLines, mergeProgramFactWithEnrichment, formatUsd } from '../utils/facts'
import { fetchCpiSalaryStretchLine } from '../services/blsClient'
import { fetchOnetFactLines } from '../services/onetClient'
import { preloadCareerCatalog } from '../utils/useCareerCatalog'

preloadCareerCatalog()

const FALLBACK_CIP = {
  cs_001: '1101',
  nursing_001: '5138',
  english_001: '2301',
  explorer_001: '5202',
}

const DISPLAY_CAP = 40

function fallbackProgram(major) {
  return {
    cipCode: FALLBACK_CIP[major.major_id],
    title: major.title,
    earningsMedian: null,
    debtMedian: null,
  }
}

function enrichCacheKey(school, program) {
  if (!school?.id || !program?.cipCode) return null
  return `mq_enrich_${school.id}_${program.cipCode}_${school.state ?? ''}`
}

function isValidCip4(cip) {
  const s = String(cip || '').replace(/\D/g, '').slice(0, 4)
  return s.length === 4
}

export default function MajorPicker() {
  const { state, setProgramAndMajor, openFact, goPhase } = useGame()
  const school = state.school
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const allPrograms = useMemo(() => {
    const progs = school?.programs ?? []
    return progs.filter((p) => p?.cipCode && isValidCip4(p.cipCode))
  }, [school])

  const filteredPrograms = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allPrograms.filter((p) => {
      if (category !== 'All' && cipUiCategory(p.cipCode) !== category) return false
      if (!q) return true
      const t = (p.title || '').toLowerCase()
      if (t.includes(q)) return true
      const numericQ = q.replace(/\D/g, '')
      if (numericQ) return String(p.cipCode).includes(numericQ)
      return false
    })
  }, [allPrograms, query, category])

  const displayList = useMemo(() => filteredPrograms.slice(0, DISPLAY_CAP), [filteredPrograms])
  const capped = filteredPrograms.length > DISPLAY_CAP

  async function choose(program, major) {
    setError('')
    setProgramAndMajor(program, major)
    const base = buildProgramFactLines(program, major.title)

    const cacheKey = enrichCacheKey(school, program)
    if (cacheKey && typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(cacheKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.lines?.length || parsed?.footnote) {
            openFact({
              title: base.title,
              lines: [...base.lines, ...(parsed.lines ?? [])],
              footnote: [base.footnote, parsed.footnote].filter(Boolean).join(' '),
              afterClose: 'career_path', backPhase: 'major',
            })
            return
          }
        }
      } catch {
        /* ignore cache */
      }
    }

    setBusy(true)
    try {
      const [cpiResult, onetResult] = await Promise.allSettled([
        fetchCpiSalaryStretchLine(school?.state),
        fetchOnetFactLines(major.major_id),
      ])

      const extraLines = []
      if (cpiResult.status === 'fulfilled' && cpiResult.value) {
        extraLines.push(cpiResult.value)
      }
      if (onetResult.status === 'fulfilled' && onetResult.value?.length) {
        extraLines.push(...onetResult.value)
      }

      const extraFootnoteParts = [
        'BLS CPI-U via api.bls.gov (division-level, illustrative).',
        'O*NET occupation examples via services.onetcenter.org.',
      ]

      const merged = mergeProgramFactWithEnrichment(base, {
        extraLines,
        extraFootnoteParts,
      })

      if (cacheKey && typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              lines: extraLines,
              footnote: extraFootnoteParts.join(' '),
            }),
          )
        } catch {
          /* ignore */
        }
      }

      openFact({ ...merged, afterClose: 'career_path', backPhase: 'major' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load extra context.')
      openFact({ ...base, afterClose: 'career_path', backPhase: 'major' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full gap-5 pixel-ui px-4 py-6 max-w-3xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost mb-4" onClick={() => goPhase('school')}>
          ← Back
        </button>
        <h1 className="text-base font-bold text-amber-100 uppercase tracking-wider">Choose your major</h1>
        <p className="text-xs text-stone-500 mt-2">
          {school?.name ? (
            <>
              Fields of study at <span className="text-stone-300">{school.name}</span> from College Scorecard (merged by
              4-digit CIP). Each row maps to a career simulation track — including a generic explorer when needed.
            </>
          ) : (
            'Pick a major for your run.'
          )}
        </p>
      </div>

      {allPrograms.length > 0 && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search title or CIP…"
            aria-label="Search majors"
            className="w-full pixel-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {['All', ...UI_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`text-[7px] px-2 py-0.5 rounded border ${
                  category === cat ? 'border-amber-500 text-amber-200' : 'border-stone-700 text-stone-500'
                }`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {capped && (
            <p className="text-[10px] text-amber-600/90">
              Showing top {DISPLAY_CAP} by data completeness & earnings; refine search to find more.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-amber-600/90">{error}</p>}
      {busy && <p className="text-xs text-stone-500 animate-pulse">Loading BLS + O*NET context…</p>}

      {displayList.length > 0 ? (
        <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {displayList.map((p) => {
            const { major, trackId, isGeneric } = resolveTrackForCip(p.cipCode)
            if (!major) return null
            const score = programDataCompletenessScore(p)
            const limited = score < 4
            return (
              <li key={p.cipCode}>
                <button
                  type="button"
                  className="pixel-list-item w-full text-left"
                  disabled={busy}
                  onClick={() => choose(p, major)}
                >
                  <span className="block text-[11px] text-amber-100 font-semibold">{p.title}</span>
                  <span className="block text-[10px] text-stone-500 mt-1">
                    {cipUiCategory(p.cipCode)} · CIP {p.cipCode}
                    {limited ? ' · Limited data' : ''}
                    {isGeneric ? ' · Explorer track' : ''}
                  </span>
                  <span className="block text-[9px] text-stone-600 mt-1.5 font-mono leading-relaxed">
                    Sim: {storyTrackLabel(trackId)} · Earn {p.earningsMedian != null ? formatUsd(p.earningsMedian) : '—'} ·
                    Debt {p.debtMedian != null ? formatUsd(p.debtMedian) : '—'} · Complete{' '}
                    {p.completionRate != null ? `${Math.round(p.completionRate * 100)}%` : '—'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="pixel-panel p-3 text-[9px] text-stone-400 space-y-2">
          <p className="text-xs">
            {allPrograms.length > 0
              ? 'No programs match this filter — try another category or search.'
              : 'No Scorecard programs returned for this school. Pick a simulation track with national-style defaults:'}
          </p>
          <div className="flex flex-col gap-2">
            {gameData.majors.map((major) => (
              <button
                key={major.major_id}
                type="button"
                className="pixel-list-item text-left"
                disabled={busy}
                onClick={() => choose(fallbackProgram(major), major)}
              >
                <span className="text-[11px] text-amber-100 font-semibold">
                  {major.emoji} {major.title}
                </span>
                <span className="block text-[10px] text-stone-500 mt-1">Uses major defaults + your school net price if available</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
