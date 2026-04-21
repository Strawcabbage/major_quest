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

  it('maps nursing-specific CIPs to nursing track', () => {
    expect(resolveTrackForCip('5138').trackId).toBe('nursing_001')
    expect(resolveTrackForCip('5116').trackId).toBe('nursing_001')
  })

  it('maps non-nursing 51xx to health_sci track', () => {
    expect(resolveTrackForCip('5199').trackId).toBe('health_sci_001')
    expect(resolveTrackForCip('5101').trackId).toBe('health_sci_001')
  })

  it('maps English family to english_001', () => {
    expect(resolveTrackForCip('2301').trackId).toBe('english_001')
  })

  it('maps language 16xx to english_001', () => {
    expect(resolveTrackForCip('1601').trackId).toBe('english_001')
  })

  it('maps business 52xx to business track', () => {
    const r = resolveTrackForCip('5202')
    expect(r.trackId).toBe('business_001')
    expect(r.isGeneric).toBe(false)
  })

  it('maps engineering 14xx/15xx to engineering track', () => {
    expect(resolveTrackForCip('1401').trackId).toBe('engineering_001')
    expect(resolveTrackForCip('1501').trackId).toBe('engineering_001')
  })

  it('maps education 13xx to education track', () => {
    expect(resolveTrackForCip('1301').trackId).toBe('education_001')
  })

  it('maps arts 50xx to arts track', () => {
    expect(resolveTrackForCip('5001').trackId).toBe('arts_001')
  })

  it('falls back to explorer for unrelated CIPs', () => {
    const r = resolveTrackForCip('4301')
    expect(r.trackId).toBe('explorer_001')
    expect(r.major.major_id).toBe('explorer_001')
  })

  it('handles garbage input', () => {
    const r = resolveTrackForCip('')
    expect(r.trackId).toBe('explorer_001')
  })
})
