/**
 * Representative O*NET-SOC codes for each simulation track (not exhaustive).
 * @type {Record<string, string[]>}
 */
export const MAJOR_ID_TO_ONET_SOC = {
  cs_001: ['15-1252.00'],
  nursing_001: ['29-1141.00'],
  english_001: ['27-3043.00'],
  explorer_001: ['13-1111.00'],
}

export function socCodesForMajor(majorId) {
  return MAJOR_ID_TO_ONET_SOC[majorId] ?? []
}
