/** UI bucket for browsing programs (2-digit CIP family, approximate). */
const D2_TO_CATEGORY = {
  1: 'Other',
  3: 'Other',
  4: 'Other',
  5: 'Other',
  9: 'Other',
  10: 'Other',
  11: 'STEM',
  12: 'Other',
  13: 'Other',
  14: 'STEM',
  15: 'STEM',
  16: 'Arts & Humanities',
  22: 'Social Sciences',
  23: 'Arts & Humanities',
  24: 'Arts & Humanities',
  25: 'Social Sciences',
  26: 'STEM',
  27: 'STEM',
  28: 'STEM',
  29: 'Other',
  30: 'Social Sciences',
  31: 'Social Sciences',
  38: 'Social Sciences',
  40: 'STEM',
  41: 'Other',
  42: 'Social Sciences',
  43: 'Other',
  44: 'Social Sciences',
  45: 'Social Sciences',
  49: 'Social Sciences',
  50: 'Arts & Humanities',
  51: 'Health',
  52: 'Business',
  54: 'Other',
}

export const UI_CATEGORIES = ['STEM', 'Business', 'Health', 'Arts & Humanities', 'Social Sciences', 'Other']

/**
 * @param {string} cipCode 4-digit string
 */
export function cipUiCategory(cipCode) {
  const d2 = parseInt(String(cipCode).replace(/\D/g, '').slice(0, 2), 10)
  if (Number.isNaN(d2)) return 'Other'
  return D2_TO_CATEGORY[d2] ?? 'Other'
}
