import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { getCipEnrichment } from '../utils/cipEnrichment'
import { formatUsd } from '../utils/facts'
import { useCareerCatalog } from '../utils/useCareerCatalog'
import cipToSocCatalog from '../data/cipToSocCatalog.json'
import careerBranches from '../data/careerBranches.json'
import { searchAdzunaPostings } from '../services/adzunaClient'
import { searchUsajobsPostings } from '../services/usajobsClient'
import { fetchOccupationDetail, fetchDetailedWorkActivities, fetchCrosswalkSocsForCip } from '../services/onetClient'
import { useToast } from './Toast'

const MAX_CAREERS = 10

function normalizeCip(cip) {
  return String(cip || '').replace(/\D/g, '').slice(0, 4)
}

function mergeCatalogWithEnrichment(socList, enrichment, catalog) {
  const enrichmentBySoc = {}
  for (const ex of enrichment?.socExamples ?? []) {
    if (ex?.soc) enrichmentBySoc[ex.soc] = ex
  }
  const out = []
  const seen = new Set()
  for (const soc of socList) {
    if (seen.has(soc)) continue
    seen.add(soc)
    const profile = catalog.bySoc?.[soc] ?? null
    const fallback = enrichmentBySoc[soc] ?? null
    if (!profile && !fallback) continue
    const bls = profile?.bls ?? fallback?.bls ?? null
    out.push({
      soc,
      title: profile?.title ?? fallback?.title ?? `Occupation ${soc}`,
      description: profile?.description ?? '',
      jobZone: profile?.jobZone ?? fallback?.onet?.jobZone ?? null,
      brightOutlook: profile?.brightOutlook ?? fallback?.onet?.brightOutlook ?? false,
      dwas: profile?.dwas ?? [],
      tasks: profile?.tasks ?? [],
      topSkills: profile?.topSkills ?? fallback?.onet?.topSkills ?? [],
      related: profile?.related ?? [],
      medianWage: bls?.medianAnnualWage ?? null,
      growthPct: bls?.growthPct2024_2034 ?? bls?.growthPct ?? 3,
      keywords: profile?.keywords ?? [profile?.title ?? fallback?.title ?? ''].filter(Boolean),
      opmSeries: profile?.opmSeries ?? null,
      hasMechanics: Boolean(careerBranches.bySoc?.[soc]),
    })
  }
  return out
}

function buildFallbackCareers(program, stats) {
  const base = stats?.salary ?? 52000
  return [
    {
      soc: null,
      title: 'Balanced generalist path',
      description: 'Typical office or hybrid professional roles with steady skill building.',
      jobZone: null,
      brightOutlook: false,
      dwas: [],
      tasks: [],
      topSkills: [],
      related: [],
      medianWage: base,
      growthPct: 3,
      keywords: [program?.title ?? ''].filter(Boolean),
      opmSeries: null,
      hasMechanics: false,
      _fallbackId: 'fb_balance',
    },
    {
      soc: null,
      title: 'High-mobility track',
      description: 'Assumes faster title changes and some lateral moves across employers.',
      jobZone: null,
      brightOutlook: false,
      dwas: [],
      tasks: [],
      topSkills: [],
      related: [],
      medianWage: Math.round(base * 1.08),
      growthPct: 4.5,
      keywords: [],
      opmSeries: null,
      hasMechanics: false,
      _fallbackId: 'fb_growth',
    },
    {
      soc: null,
      title: 'Stability-first track',
      description: 'Prioritizes predictable schedules and slower but steadier wage growth.',
      jobZone: null,
      brightOutlook: false,
      dwas: [],
      tasks: [],
      topSkills: [],
      related: [],
      medianWage: Math.round(base * 0.95),
      growthPct: 2,
      keywords: [],
      opmSeries: null,
      hasMechanics: false,
      _fallbackId: 'fb_steady',
    },
  ]
}

function PostingsList({ title, loading, items, emptyMessage }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-2">{title}</p>
      {loading ? (
        <p className="text-[10px] text-stone-500 animate-pulse">Fetching postings…</p>
      ) : items.length === 0 ? (
        <p className="text-[10px] text-stone-600">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((job) => (
            <li key={job.id} className="border border-stone-800 p-2">
              <p className="text-[10px] text-amber-100 font-semibold leading-snug">
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer" className="hover:text-amber-300 underline-offset-2 hover:underline">
                    {job.title}
                  </a>
                ) : (
                  job.title
                )}
              </p>
              <p className="text-[9px] text-stone-500 mt-0.5 leading-snug">
                {job.company ? `${job.company}` : ''}
                {job.company && job.location ? ' · ' : ''}
                {job.location ?? ''}
              </p>
              {(job.salaryMin || job.salaryMax) && (
                <p className="text-[9px] text-stone-400 mt-0.5">
                  {job.salaryMin ? formatUsd(Math.round(job.salaryMin)) : '—'}
                  {' – '}
                  {job.salaryMax ? formatUsd(Math.round(job.salaryMax)) : '—'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CareerPathPicker() {
  const { state, setCareerPath, goPhase } = useGame()
  const { program, stats, school } = state
  const careerCatalog = useCareerCatalog()
  const toast = useToast()

  const cip = normalizeCip(program?.cipCode)
  const enrichment = useMemo(() => (program?.cipCode ? getCipEnrichment(program.cipCode) : null), [program])

  const cipEntry = cip ? cipToSocCatalog.byCip?.[cip] ?? null : null
  const staticSocs = useMemo(() => {
    const catalogSocs = Array.isArray(cipEntry) ? cipEntry : cipEntry?.socs ?? []
    const enrichmentSocs = (enrichment?.socExamples ?? []).map((e) => e.soc).filter(Boolean)
    return [...catalogSocs, ...enrichmentSocs]
  }, [cipEntry, enrichment])

  const [dynamicSocs, setDynamicSocs] = useState(/** @type {string[]} */ ([]))
  const needsCrosswalk = staticSocs.length === 0 && cip.length === 4

  useEffect(() => {
    if (!needsCrosswalk) { setDynamicSocs([]); return }
    let cancelled = false
    fetchCrosswalkSocsForCip(cip).then((socs) => {
      if (!cancelled) setDynamicSocs(socs)
    })
    return () => { cancelled = true }
  }, [cip, needsCrosswalk])

  const careers = useMemo(() => {
    const combined = staticSocs.length > 0 ? staticSocs : dynamicSocs
    const merged = mergeCatalogWithEnrichment(combined, enrichment, careerCatalog)
    if (merged.length > 0) return merged.slice(0, MAX_CAREERS)
    return buildFallbackCareers(program, stats)
  }, [staticSocs, dynamicSocs, enrichment, program, stats, careerCatalog])

  const [selectedSoc, setSelectedSoc] = useState(() => careers[0]?.soc ?? careers[0]?._fallbackId ?? null)
  const [liveCache, setLiveCache] = useState(/** @type {Record<string, { detail: any, dwas: any[] }>} */ ({}))
  const [postingsCache, setPostingsCache] = useState(
    /** @type {Record<string, { adzuna: any[], usajobs: any[], loading: boolean }>} */ ({}),
  )

  const selected = useMemo(() => {
    if (!careers.length) return null
    const byKey = careers.find((c) => (c.soc ?? c._fallbackId) === selectedSoc)
    return byKey ?? careers[0]
  }, [careers, selectedSoc])

  const selectedKey = selected?.soc ?? selected?._fallbackId ?? null
  const postingsEntry = selectedKey ? postingsCache[selectedKey] : undefined

  useEffect(() => {
    const soc = selected?.soc
    if (!soc) return undefined
    const alreadyHasDetail = Boolean(selected?.description) && (selected?.dwas ?? []).length > 0
    if (alreadyHasDetail) return undefined
    if (liveCache[soc]) return undefined
    let cancelled = false
    Promise.allSettled([fetchOccupationDetail(soc), fetchDetailedWorkActivities(soc)]).then(
      ([detailRes, dwaRes]) => {
        if (cancelled) return
        if (detailRes.status === 'rejected' || dwaRes.status === 'rejected') {
          toast('Could not load some O*NET details — showing cached data.')
        }
        setLiveCache((prev) => ({
          ...prev,
          [soc]: {
            detail: detailRes.status === 'fulfilled' ? detailRes.value : null,
            dwas: dwaRes.status === 'fulfilled' && Array.isArray(dwaRes.value) ? dwaRes.value : [],
          },
        }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [selected, liveCache, toast])

  useEffect(() => {
    if (!selected || !selectedKey) return undefined
    if (postingsCache[selectedKey]) return undefined
    const keyword = selected.keywords?.[0] ?? selected.title
    if (!keyword) return undefined
    let cancelled = false
    Promise.allSettled([
      searchAdzunaPostings({ keyword, where: school?.state ?? undefined, results: 4 }),
      searchUsajobsPostings({ keyword, opmSeries: selected.opmSeries ?? undefined, results: 4 }),
    ]).then(([adzRes, usaRes]) => {
      if (cancelled) return
      if (adzRes.status === 'rejected' || usaRes.status === 'rejected') {
        toast('Job postings may be incomplete — some sources unavailable.')
      }
      setPostingsCache((prev) => ({
        ...prev,
        [selectedKey]: {
          adzuna: adzRes.status === 'fulfilled' ? adzRes.value : [],
          usajobs: usaRes.status === 'fulfilled' ? usaRes.value : [],
        },
      }))
    })
    return () => {
      cancelled = true
    }
  }, [selected, selectedKey, postingsCache, school?.state, toast])

  const liveEntry = selected?.soc ? liveCache[selected.soc] : null
  const liveDetail = liveEntry?.detail ?? null
  const liveDwas = liveEntry?.dwas ?? []
  const adzunaJobs = postingsEntry?.adzuna ?? []
  const usajobs = postingsEntry?.usajobs ?? []
  const loadingAdzuna = selected != null && postingsEntry === undefined
  const loadingUsajobs = loadingAdzuna

  if (!program || !stats) {
    return (
      <div className="pixel-ui p-4 text-xs text-stone-500">
        Choose a program first.{' '}
        <button type="button" className="pixel-btn-ghost" onClick={() => goPhase('major')}>
          Back
        </button>
      </div>
    )
  }

  const detailDescription = selected?.description || liveDetail?.description || ''
  const detailJobZone = selected?.jobZone ?? liveDetail?.jobZone ?? null
  const detailDwas = selected?.dwas?.length ? selected.dwas : liveDwas
  const detailTasks = selected?.tasks ?? []
  const detailSkills = selected?.topSkills ?? []
  const detailRelated = selected?.related ?? []

  function confirm() {
    const c = selected ?? careers[0]
    if (!c) return
    const payload = {
      id: c.soc ?? c._fallbackId ?? `career_${c.title}`,
      title: c.title,
      soc: c.soc ?? null,
      medianWage: c.medianWage ?? null,
      growthPct: c.growthPct ?? 3,
      opmSeries: c.opmSeries ?? null,
      brightOutlook: Boolean(c.brightOutlook),
    }
    const quality = c.soc ? (c.hasMechanics ? 'full' : 'catalog_only') : 'scorecard_only'
    setCareerPath(payload, quality)
    goPhase('city')
  }

  return (
    <div className="flex flex-col min-h-full gap-4 pixel-ui px-4 py-6 max-w-5xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost mb-3" onClick={() => goPhase('major')}>
          ← Back
        </button>
        <h1 className="text-base font-bold text-amber-100 uppercase tracking-wider">Career path</h1>
        <p className="text-xs text-stone-500 mt-2">
          Example occupations for <span className="text-stone-300">{program.title}</span>.
          Picking one adjusts stats, seeds O*NET skill tags, and swaps in career-specific decision years.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ul className="lg:col-span-2 space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {careers.map((c) => {
            const id = c.soc ?? c._fallbackId
            const isSelected = (selected?.soc ?? selected?._fallbackId) === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelectedSoc(id)}
                  className={`pixel-list-item w-full text-left ${isSelected ? 'ring-1 ring-amber-500/60' : ''}`}
                >
                  <span className="block text-[11px] text-amber-100 font-semibold">{c.title}</span>
                  {c.soc && <span className="block text-[9px] text-stone-600 font-mono mt-0.5">SOC {c.soc}</span>}
                  <span className="block text-[10px] text-stone-400 mt-1.5">
                    {c.medianWage != null ? `${formatUsd(c.medianWage)} · ` : ''}
                    ~{c.growthPct}% growth
                    {c.brightOutlook ? ' · Bright' : ''}
                    {c.jobZone ? ` · Zone ${c.jobZone}` : ''}
                  </span>
                  {c.hasMechanics && (
                    <span className="inline-block mt-1 text-[8px] uppercase tracking-widest text-sky-400/80">
                      Branch mechanics
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="lg:col-span-3 pixel-panel p-4 space-y-3 max-h-[520px] overflow-y-auto">
          {selected ? (
            <>
              <div>
                <p className="text-[11px] text-amber-100 font-semibold">{selected.title}</p>
                {selected.soc && (
                  <p className="text-[9px] text-stone-600 font-mono">
                    SOC {selected.soc}
                    {detailJobZone ? ` · Job Zone ${detailJobZone}` : ''}
                    {selected.brightOutlook ? ' · Bright Outlook' : ''}
                  </p>
                )}
                {selected.medianWage != null && (
                  <p className="text-[10px] text-stone-300 mt-1">
                    National median wage: {formatUsd(selected.medianWage)} · ~{selected.growthPct}% growth (illustrative)
                  </p>
                )}
              </div>

              {detailDescription && (
                <p className="text-[10px] text-stone-400 leading-relaxed">{detailDescription}</p>
              )}

              {detailDwas.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">
                    O*NET Detailed Work Activities
                  </p>
                  <ul className="list-disc pl-5 text-[10px] text-stone-300 space-y-0.5">
                    {detailDwas.slice(0, 4).map((d, i) => (
                      <li key={d.id ?? `${d.title}-${i}`}>{d.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detailTasks.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Typical tasks</p>
                  <ul className="list-disc pl-5 text-[10px] text-stone-300 space-y-0.5">
                    {detailTasks.slice(0, 3).map((t, i) => (
                      <li key={`${t}-${i}`}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detailSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailSkills.map((s) => (
                    <span key={s} className="text-[9px] px-2 py-0.5 bg-stone-800 text-sky-300">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {detailRelated.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Related occupations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailRelated.map((r) => {
                      const selectable = careers.some((c) => c.soc === r.soc)
                      return (
                        <button
                          key={r.soc}
                          type="button"
                          onClick={() => selectable && setSelectedSoc(r.soc)}
                          disabled={!selectable}
                          className={`text-[9px] px-2 py-0.5 border ${
                            selectable
                              ? 'border-amber-700/60 text-amber-200 hover:bg-amber-900/30 cursor-pointer'
                              : 'border-stone-700 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          {r.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-stone-800 pt-3">
                <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-2">Sample openings (live)</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <PostingsList
                    title="Adzuna (civilian)"
                    loading={loadingAdzuna}
                    items={adzunaJobs}
                    emptyMessage="No Adzuna results. Check ADZUNA_APP_ID/KEY or try another career."
                  />
                  <PostingsList
                    title="USAJobs (federal)"
                    loading={loadingUsajobs}
                    items={usajobs}
                    emptyMessage="No federal postings (needs USAJOBS_* env in dev; live call in static builds requires a proxy)."
                  />
                </div>
                <p className="text-[8px] text-stone-600 mt-2 leading-snug">
                  Adzuna via api.adzuna.com. USAJobs via data.usajobs.gov. Both proxied server-side in dev to keep keys private.
                </p>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-stone-500">No occupation selected.</p>
          )}
        </div>
      </div>

      <button type="button" className="pixel-btn-primary w-full" onClick={confirm}>
        Continue to location
      </button>
    </div>
  )
}
