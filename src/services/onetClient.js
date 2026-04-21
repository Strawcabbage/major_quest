import { socCodesForMajor } from '../constants/cipToSoc'

function onetRequestUrl(socPath) {
  const path = socPath.startsWith('/') ? socPath : `/${socPath}`
  if (import.meta.env.DEV) return `/api/onet${path}`
  const key = import.meta.env.VITE_ONET_API_KEY
  if (!key) return null
  return `https://api-v2.onetcenter.org${path}`
}

async function onetFetchJson(path) {
  const url = onetRequestUrl(path)
  if (!url) return null
  const headers = { Accept: 'application/json' }
  if (!import.meta.env.DEV && import.meta.env.VITE_ONET_API_KEY) {
    headers['X-API-Key'] = import.meta.env.VITE_ONET_API_KEY
  }
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  return res.json()
}

/**
 * @param {unknown} data
 */
export function pickOverviewLines(data) {
  const lines = []
  if (!data || typeof data !== 'object') return lines

  const title =
    data.title ??
    data.occupation?.title ??
    data.name ??
    data?.career?.title
  if (typeof title === 'string' && title.trim()) {
    lines.push(`O*NET example occupation: ${title.trim()}`)
  }

  const desc =
    data.description ?? data.occupation?.description ?? data.what_they_do ?? data?.career?.what_they_do
  if (typeof desc === 'string' && desc.trim()) {
    lines.push(desc.trim())
  }

  const zone = data.job_zone?.title ?? data.job_zone ?? data?.career?.job_zone
  if (typeof zone === 'string' && zone.trim()) {
    lines.push(`Typical preparation (Job Zone): ${zone.trim()}`)
  }

  return lines
}

/**
 * Fetch a short O*NET snippet for the first SOC mapped to this major.
 * @param {string} majorId
 * @returns {Promise<string[]>}
 */
export async function fetchOnetFactLines(majorId) {
  const socs = socCodesForMajor(majorId)
  if (socs.length === 0) return []

  const soc = socs[0]
  try {
    const data = await onetFetchJson(`/online/occupations/${encodeURIComponent(soc)}`)
    if (!data) return []
    const lines = pickOverviewLines(data)
    if (lines.length === 0 && typeof data === 'object') {
      lines.push(`O*NET code ${soc} (see onetonline.org for full profile).`)
    }
    return lines
  } catch {
    return []
  }
}

/**
 * Normalize an O*NET occupation detail response into the shape used by
 * careerCatalog.json (minus bls/keywords/opmSeries).
 * @param {unknown} data
 * @param {string} soc
 */
export function normalizeOccupationDetail(data, soc) {
  if (!data || typeof data !== 'object') return null
  return {
    soc,
    title: data.title ?? data.occupation?.title ?? null,
    description: data.description ?? data.occupation?.description ?? null,
    jobZone: data.job_zone ?? data.education?.job_zone?.title ?? null,
    brightOutlook: Boolean(data.bright_outlook ?? data.tags?.bright_outlook),
  }
}

/**
 * Normalize an O*NET DWA list response. Accepts either `activity` (summary)
 * or `detailed_work_activity` (details) array shapes.
 * @param {unknown} data
 */
export function normalizeDwaList(data) {
  if (!data || typeof data !== 'object') return []
  const arr = data.activity ?? data.detailed_work_activity ?? []
  if (!Array.isArray(arr)) return []
  return arr
    .map((a) => ({ id: a.id ?? a.code ?? null, title: a.title ?? a.name ?? '' }))
    .filter((a) => a.title)
}

/**
 * Live O*NET occupation detail (used when careerCatalog.json lacks the SOC).
 * @param {string} soc
 */
export async function fetchOccupationDetail(soc) {
  if (!soc) return null
  try {
    const data = await onetFetchJson(`/online/occupations/${encodeURIComponent(soc)}`)
    return normalizeOccupationDetail(data, soc)
  } catch {
    return null
  }
}

/**
 * Live O*NET Detailed Work Activities for a SOC.
 * @param {string} soc
 * @returns {Promise<Array<{ id: string|null, title: string }>>}
 */
export async function fetchDetailedWorkActivities(soc) {
  if (!soc) return []
  try {
    const data = await onetFetchJson(
      `/online/occupations/${encodeURIComponent(soc)}/summary/detailed_work_activities`,
    )
    return normalizeDwaList(data)
  } catch {
    return []
  }
}

/**
 * Look up O*NET-SOC codes for a CIP code via the education crosswalk API.
 * Formats the CIP as XX.XXXX (e.g. "11.0101") for the keyword param.
 * @param {string} cip4 — 4-digit CIP prefix (e.g. "1101")
 * @returns {Promise<string[]>} O*NET-SOC codes
 */
export async function fetchCrosswalkSocsForCip(cip4) {
  if (!cip4 || cip4.length < 4) return []
  const formatted = `${cip4.slice(0, 2)}.${cip4.slice(2)}`
  try {
    const data = await onetFetchJson(
      `/online/crosswalks/education?keyword=${encodeURIComponent(formatted)}`,
    )
    if (!data?.match) return []
    const socs = []
    for (const m of data.match) {
      for (const occ of m.occupation ?? []) {
        const code = occ.code ?? null
        if (code && !socs.includes(code)) socs.push(code)
      }
    }
    return socs
  } catch {
    return []
  }
}
