import { describe, it, expect } from 'vitest'
import { resolveTrackForCip } from '../engine/trackResolver'

describe('resolveTrackForCip', () => {
  it('maps computing CIPs to cs_001', () => {
    expect(resolveTrackForCip('1101').trackId).toBe('cs_001')
    expect(resolveTrackForCip('1102').isGeneric).toBe(false)
  })

  it('maps pure math 1108 to explorer (not CS story)', () => {
    const r = resolveTrackForCip('1108')
    expect(r.trackId).toBe('explorer_001')
    expect(r.isGeneric).toBe(true)
  })

  it('maps health 51xx to nursing track', () => {
    expect(resolveTrackForCip('5138').trackId).toBe('nursing_001')
    expect(resolveTrackForCip('5199').trackId).toBe('nursing_001')
  })

  it('maps English family to english_001', () => {
    expect(resolveTrackForCip('2301').trackId).toBe('english_001')
  })

  it('maps language 16xx to english_001', () => {
    expect(resolveTrackForCip('1601').trackId).toBe('english_001')
  })

  it('falls back to explorer for unrelated CIPs', () => {
    const r = resolveTrackForCip('5202')
    expect(r.trackId).toBe('explorer_001')
    expect(r.major.major_id).toBe('explorer_001')
  })

  it('handles garbage input', () => {
    const r = resolveTrackForCip('')
    expect(r.trackId).toBe('explorer_001')
  })
})
