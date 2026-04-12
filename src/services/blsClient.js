import {
  CPI_SERIES_US,
  CPI_SERIES_BY_REGION,
  censusRegionForState,
} from '../constants/blsCpiRegions'

/**
 * Latest CPI index value from BLS timeseries API result series entry.
 * @param {unknown} seriesObj
 */
export function latestValueFromSeries(seriesObj) {
  if (!seriesObj || typeof seriesObj !== 'object') return null
  const data = seriesObj.data
  if (!Array.isArray(data) || data.length === 0) return null
  const sorted = [...data].sort((a, b) => {
    const ya = Number(a.year) || 0
    const yb = Number(b.year) || 0
    if (ya !== yb) return yb - ya
    return String(b.period || '').localeCompare(String(a.period || ''))
  })
  const v = sorted[0]?.value
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

function blsPostUrl() {
  if (import.meta.env.DEV) return '/api/bls'
  return 'https://api.bls.gov/publicAPI/v2/timeseries/data'
}

function registrationKey() {
  return import.meta.env.VITE_BLS_API_KEY || ''
}

/**
 * One plain-language line comparing regional CPI-U to U.S. average (rough cost-of-living proxy).
 * @param {string} [stateAbbr] two-letter state
 * @returns {Promise<string|null>}
 */
export async function fetchCpiSalaryStretchLine(stateAbbr) {
  const region = censusRegionForState(stateAbbr)
  if (!region) return null

  const regionalSeries = CPI_SERIES_BY_REGION[region]
  if (!regionalSeries) return null

  const endYear = new Date().getFullYear()
  const startYear = endYear - 1

  const body = {
    seriesid: [CPI_SERIES_US, regionalSeries],
    startyear: String(startYear),
    endyear: String(endYear),
  }

  if (!import.meta.env.DEV && !registrationKey()) return null
  if (import.meta.env.DEV) {
    // key injected by dev server middleware
  } else {
    body.registrationKey = registrationKey()
  }

  try {
    const res = await fetch(blsPostUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const json = await res.json()
    return cpiStretchLineFromApiJson(json, region, regionalSeries)
  } catch {
    return null
  }
}

/** @param {string} region @param {number} pct @param {string} dir */
export function formatCpiStretchLine(region, pct, dir) {
  return `BLS CPI-U (all items, rough): prices in the ${region} census division were about ${Math.abs(pct)}% ${dir} than the U.S. city average in the latest reported month — the same nominal salary tends to stretch ${pct <= 0 ? 'further' : 'less'} there than a national-average paycheck (illustrative only).`
}

/**
 * Build stretch line from parsed BLS API JSON (for tests and debugging).
 * @param {unknown} json
 * @param {string} region
 * @param {string} regionalSeries
 */
export function cpiStretchLineFromApiJson(json, region, regionalSeries) {
  const list = json?.Results?.series
  if (!Array.isArray(list) || list.length < 2) return null
  const us = list.find((s) => s.seriesID === CPI_SERIES_US) ?? list[0]
  const reg = list.find((s) => s.seriesID === regionalSeries) ?? list[1]
  const usVal = latestValueFromSeries(us)
  const regVal = latestValueFromSeries(reg)
  if (usVal == null || regVal == null || usVal === 0) return null
  const ratio = regVal / usVal
  const pct = Math.round((ratio - 1) * 100)
  const dir = pct >= 0 ? 'higher' : 'lower'
  return formatCpiStretchLine(region, pct, dir)
}
