/**
 * Thin Adzuna Jobs API client. In dev we hit `/api/adzuna/...` so the Vite
 * middleware in vite.config.js can attach `app_id` + `app_key` server-side.
 * In a static prod build we fall back to calling api.adzuna.com directly only
 * when both VITE_ADZUNA_APP_ID and VITE_ADZUNA_APP_KEY are set.
 */

const ADZUNA_HOST = 'https://api.adzuna.com/v1/api'

function adzunaUrl(pathAfterApi, params) {
  const query = new URLSearchParams(params).toString()
  if (import.meta.env.DEV) {
    return `/api/adzuna${pathAfterApi}${query ? `?${query}` : ''}`
  }
  const id = import.meta.env.VITE_ADZUNA_APP_ID
  const key = import.meta.env.VITE_ADZUNA_APP_KEY
  if (!id || !key) return null
  const withCreds = new URLSearchParams(params)
  withCreds.set('app_id', id)
  withCreds.set('app_key', key)
  return `${ADZUNA_HOST}${pathAfterApi}?${withCreds.toString()}`
}

/**
 * @typedef {{ id: string, title: string, company?: string, location?: string, url?: string, salaryMin?: number|null, salaryMax?: number|null, postedAt?: string|null }} JobPosting
 */

/**
 * Search Adzuna for civilian postings.
 * @param {{ keyword: string, where?: string, country?: string, results?: number }} opts
 * @returns {Promise<JobPosting[]>}
 */
export async function searchAdzunaPostings({ keyword, where, country = 'us', results = 5 }) {
  if (!keyword) return []
  const params = {
    what: keyword,
    results_per_page: String(Math.min(Math.max(results, 1), 20)),
    'content-type': 'application/json',
  }
  if (where) params.where = where
  const url = adzunaUrl(`/jobs/${country}/search/1`, params)
  if (!url) return []
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    const rows = Array.isArray(data?.results) ? data.results : []
    return rows.map((r) => ({
      id: String(r.id ?? r.adref ?? r.redirect_url ?? `${r.title}-${r.created ?? ''}`),
      title: r.title ?? 'Untitled role',
      company: r.company?.display_name ?? null,
      location: r.location?.display_name ?? null,
      url: r.redirect_url ?? null,
      salaryMin: typeof r.salary_min === 'number' ? r.salary_min : null,
      salaryMax: typeof r.salary_max === 'number' ? r.salary_max : null,
      postedAt: r.created ?? null,
    }))
  } catch {
    return []
  }
}
