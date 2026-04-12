import enrichment from '../data/cipEnrichment.json'

/**
 * @param {string} cipCode
 */
export function getCipEnrichment(cipCode) {
  const key = String(cipCode || '').replace(/\D/g, '').slice(0, 4)
  if (key.length !== 4) return null
  return enrichment.byCip?.[key] ?? null
}
