import { socCodesForMajor } from '../constants/cipToSoc'

function onetRequestUrl(socPath) {
  const path = socPath.startsWith('/') ? socPath : `/${socPath}`
  if (import.meta.env.DEV) return `/api/onet${path}`
  const key = import.meta.env.VITE_ONET_API_KEY
  if (!key) return null
  return `https://services.onetcenter.org/api/v2${path}`
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
    const short = desc.trim().slice(0, 220)
    lines.push(short + (desc.trim().length > 220 ? '…' : ''))
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
  const path = `/online/occupations/${encodeURIComponent(soc)}`
  const url = onetRequestUrl(path)
  if (!url) return []

  try {
    const headers = { Accept: 'application/json' }
    if (!import.meta.env.DEV && import.meta.env.VITE_ONET_API_KEY) {
      headers['X-API-Key'] = import.meta.env.VITE_ONET_API_KEY
    }
    const res = await fetch(url, { headers })
    if (!res.ok) return []
    const data = await res.json()
    const lines = pickOverviewLines(data)
    if (lines.length === 0 && typeof data === 'object') {
      lines.push(`O*NET code ${soc} (see onetonline.org for full profile).`)
    }
    return lines
  } catch {
    return []
  }
}
