/**
 * CPI-U All Items, not seasonally adjusted, U.S. city average vs census division.
 * Series IDs from BLS CPI structure (verify at bls.gov/cpi if a request fails).
 */
export const CPI_SERIES_US = 'CUUR0000SA0'

export const CPI_SERIES_BY_REGION = {
  Northeast: 'CUUR0100SA0',
  Midwest: 'CUUR0200SA0',
  South: 'CUUR0300SA0',
  West: 'CUUR0400SA0',
}

/** @type {Record<string, keyof typeof CPI_SERIES_BY_REGION>} */
const STATE_TO_REGION = {
  CT: 'Northeast',
  ME: 'Northeast',
  MA: 'Northeast',
  NH: 'Northeast',
  RI: 'Northeast',
  VT: 'Northeast',
  NJ: 'Northeast',
  NY: 'Northeast',
  PA: 'Northeast',
  IL: 'Midwest',
  IN: 'Midwest',
  IA: 'Midwest',
  KS: 'Midwest',
  MI: 'Midwest',
  MN: 'Midwest',
  MO: 'Midwest',
  NE: 'Midwest',
  ND: 'Midwest',
  OH: 'Midwest',
  SD: 'Midwest',
  WI: 'Midwest',
  DE: 'South',
  DC: 'South',
  FL: 'South',
  GA: 'South',
  MD: 'South',
  NC: 'South',
  SC: 'South',
  VA: 'South',
  WV: 'South',
  AL: 'South',
  KY: 'South',
  MS: 'South',
  TN: 'South',
  AR: 'South',
  LA: 'South',
  OK: 'South',
  TX: 'South',
  AK: 'West',
  AZ: 'West',
  CA: 'West',
  CO: 'West',
  HI: 'West',
  ID: 'West',
  MT: 'West',
  NV: 'West',
  NM: 'West',
  OR: 'West',
  UT: 'West',
  WA: 'West',
  WY: 'West',
}

export function censusRegionForState(stateAbbr) {
  const s = String(stateAbbr || '')
    .trim()
    .toUpperCase()
    .slice(0, 2)
  return STATE_TO_REGION[s] ?? null
}
