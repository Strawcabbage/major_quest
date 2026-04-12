import { describe, it, expect } from 'vitest'
import { majorIdForCip, storyTrackLabel } from '../constants/cipMap'

describe('cipMap', () => {
  it('maps expanded computing CIPs to cs_001', () => {
    expect(majorIdForCip('1102')).toBe('cs_001')
    expect(majorIdForCip(1110)).toBe('cs_001')
  })

  it('maps nursing-adjacent CIPs', () => {
    expect(majorIdForCip('5123')).toBe('nursing_001')
    expect(majorIdForCip('5139')).toBe('nursing_001')
  })

  it('maps English-adjacent CIPs', () => {
    expect(majorIdForCip('2313')).toBe('english_001')
  })

  it('returns null for unmapped CIPs', () => {
    expect(majorIdForCip('1108')).toBeNull()
    expect(majorIdForCip('9999')).toBeNull()
  })

  it('storyTrackLabel returns friendly copy', () => {
    expect(storyTrackLabel('cs_001')).toContain('Computer')
    expect(storyTrackLabel('explorer_001')).toContain('explorer')
  })
})
