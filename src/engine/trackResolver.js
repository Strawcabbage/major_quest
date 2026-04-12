import gameData from '../data/gameData.json'

/** Explicit CIP → track (highest priority) — aligns with former cipMap hot spots */
const CIP_EXACT_TO_TRACK = {
  1101: 'cs_001',
  1102: 'cs_001',
  1103: 'cs_001',
  1104: 'cs_001',
  1105: 'cs_001',
  1106: 'cs_001',
  1107: 'cs_001',
  1109: 'cs_001',
  1110: 'cs_001',
  5116: 'nursing_001',
  5123: 'nursing_001',
  5138: 'nursing_001',
  5139: 'nursing_001',
  5140: 'nursing_001',
  2301: 'english_001',
  2303: 'english_001',
  2307: 'english_001',
  2310: 'english_001',
  2313: 'english_001',
  2314: 'english_001',
}

const majorsById = Object.fromEntries(gameData.majors.map((m) => [m.major_id, m]))

/**
 * Map a 4-digit CIP string to a gameData major for simulation nodes.
 * @param {string} cipCode
 * @returns {{ major: object, trackId: string, isGeneric: boolean }}
 */
export function resolveTrackForCip(cipCode) {
  const key = String(cipCode || '').replace(/\D/g, '').slice(0, 4)
  const num = Number(key)
  if (!key || Number.isNaN(num)) {
    const major = majorsById.explorer_001
    return { major, trackId: 'explorer_001', isGeneric: true }
  }

  const exact = CIP_EXACT_TO_TRACK[num]
  if (exact && majorsById[exact]) {
    return { major: majorsById[exact], trackId: exact, isGeneric: exact === 'explorer_001' }
  }

  const d2 = Math.floor(num / 100)

  if (d2 === 11 && num !== 1108) {
    const major = majorsById.cs_001
    return { major, trackId: 'cs_001', isGeneric: false }
  }
  if (d2 === 51) {
    const major = majorsById.nursing_001
    return { major, trackId: 'nursing_001', isGeneric: false }
  }
  if (d2 === 23 || d2 === 16) {
    const major = majorsById.english_001
    return { major, trackId: 'english_001', isGeneric: false }
  }

  const major = majorsById.explorer_001
  return { major, trackId: 'explorer_001', isGeneric: true }
}
