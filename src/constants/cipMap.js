/** Maps College Scorecard 4-digit CIP (numeric key) to gameData major_id */
export const CIP_TO_MAJOR_ID = {
  /* Computing / IT story (cs_001) — 11.0x except pure math (1108) */
  1101: 'cs_001',
  1102: 'cs_001',
  1103: 'cs_001',
  1104: 'cs_001',
  1105: 'cs_001',
  1106: 'cs_001',
  1107: 'cs_001',
  1109: 'cs_001',
  1110: 'cs_001',
  /* Nursing story */
  5116: 'nursing_001',
  5123: 'nursing_001',
  5138: 'nursing_001',
  5139: 'nursing_001',
  5140: 'nursing_001',
  /* English / language / writing story */
  2301: 'english_001',
  2303: 'english_001',
  2307: 'english_001',
  2310: 'english_001',
  2313: 'english_001',
  2314: 'english_001',
}

/** Display name for the simulation track (not the same as every real-world job). */
export const MAJOR_STORY_LABEL = {
  cs_001: 'Computer / IT career story',
  nursing_001: 'Nursing / health career story',
  english_001: 'English / writing career story',
  explorer_001: 'General career explorer (neutral story)',
}

export function majorIdForCip(cipCode) {
  const key = String(cipCode).replace(/\D/g, '').slice(0, 4)
  const num = Number(key)
  return CIP_TO_MAJOR_ID[num] ?? null
}

export function storyTrackLabel(majorId) {
  return MAJOR_STORY_LABEL[majorId] ?? 'Career story'
}
