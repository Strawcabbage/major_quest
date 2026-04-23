/**
 * Thin USAJobs search client. USAJobs requires three headers (Host,
 * User-Agent = registered email, Authorization-Key), and browsers cannot set
 * User-Agent. Requests always go to `/api/usajobs/...` which is handled by
 * the Vite dev proxy in development and a Vercel serverless function in
 * production (see api/usajobs.js).
 */

/**
 * @typedef {{ id: string, title: string, company?: string, location?: string, url?: string, salaryMin?: number|null, salaryMax?: number|null, postedAt?: string|null }} JobPosting
 */

/**
 * Search USAJobs for federal postings.
 * @param {{ keyword?: string, opmSeries?: string, results?: number }} opts
 * @returns {Promise<JobPosting[]>}
 */
export async function searchUsajobsPostings({ keyword, opmSeries, results = 5 }) {
  const params = new URLSearchParams()
  if (keyword) params.set('Keyword', keyword)
  if (opmSeries) params.set('JobCategoryCode', opmSeries)
  params.set('ResultsPerPage', String(Math.min(Math.max(results, 1), 20)))
  const url = `/api/usajobs/search?${params.toString()}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.SearchResult?.SearchResultItems ?? []
    return items.slice(0, results).map((item) => {
      const desc = item?.MatchedObjectDescriptor ?? {}
      const loc = Array.isArray(desc.PositionLocation) ? desc.PositionLocation[0]?.LocationName : null
      const salary = Array.isArray(desc.PositionRemuneration) ? desc.PositionRemuneration[0] : null
      return {
        id: String(item?.MatchedObjectId ?? desc.PositionID ?? desc.PositionTitle),
        title: desc.PositionTitle ?? 'Federal role',
        company: desc.OrganizationName ?? desc.DepartmentName ?? null,
        location: loc ?? null,
        url: desc.PositionURI ?? desc.ApplyURI?.[0] ?? null,
        salaryMin: salary?.MinimumRange ? Number(salary.MinimumRange) : null,
        salaryMax: salary?.MaximumRange ? Number(salary.MaximumRange) : null,
        postedAt: desc.PublicationStartDate ?? null,
      }
    })
  } catch {
    return []
  }
}
