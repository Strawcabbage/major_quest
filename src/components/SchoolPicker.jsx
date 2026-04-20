import { useCallback, useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { searchSchools, fetchSchoolById } from '../services/scorecardClient'
import { buildSchoolFactLines } from '../utils/facts'

export default function SchoolPicker() {
  const { setSchool, openFact, goPhase } = useGame()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const runSearch = useCallback(async (q) => {
    setLoading(true)
    setError('')
    try {
      const { results: rows, total: t } = await searchSchools(q, 0, 20)
      setResults(rows)
      setTotal(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([])
      setTotal(0)
      setLoading(false)
      return
    }
    runSearch(debounced)
  }, [debounced, runSearch])

  async function handleConfirm() {
    if (!selected) return
    setConfirming(true)
    setError('')
    try {
      const full = await fetchSchoolById(selected.id)
      const school = full ?? selected
      setSchool(school)
      const fact = buildSchoolFactLines(school)
      openFact({ ...fact, afterClose: 'major', backPhase: 'school' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load school details')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full gap-5 pixel-ui px-4 py-6 max-w-3xl mx-auto w-full">
      <div>
        <button type="button" className="pixel-btn-ghost mb-4" onClick={() => goPhase('character')}>
          ← Back
        </button>
        <h1 className="text-base font-bold text-amber-100 uppercase tracking-wider">Choose your university</h1>
        <p className="text-xs text-stone-500 mt-2">Search the College Scorecard. Pick a school to see real cost and admissions hints.</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by school name…"
        aria-label="Search schools"
        className="pixel-input w-full"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
      {debounced.length < 2 && (
        <p className="text-xs text-stone-500">Type at least 2 letters to search the Scorecard.</p>
      )}
      {loading && debounced.length >= 2 && (
        <p className="text-xs text-stone-500 animate-pulse">Searching…</p>
      )}
      {!loading && debounced.length >= 2 && (
        <p className="text-[10px] text-stone-600">
          {total.toLocaleString()} schools match this query (showing first {results.length}).
        </p>
      )}

      <ul className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
        {results.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setSelected(s)}
              className={`pixel-list-item w-full text-left ${selected?.id === s.id ? 'pixel-list-item--active' : ''}`}
            >
              <span className="block text-[11px] text-amber-100 font-semibold">{s.name}</span>
              <span className="block text-[10px] text-stone-500 mt-1">
                {s.city}, {s.state}
                {s.avgNetPrice != null && (
                  <> · Net price ~{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(s.avgNetPrice)}</>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="pixel-btn-primary"
        disabled={!selected || confirming}
        onClick={handleConfirm}
      >
        {confirming ? 'Loading…' : 'Enroll here'}
      </button>
    </div>
  )
}
