import { describe, it, expect } from 'vitest'
import { censusRegionForState } from '../constants/blsCpiRegions'

describe('censusRegionForState', () => {
  it('maps states to census divisions', () => {
    expect(censusRegionForState('TX')).toBe('South')
    expect(censusRegionForState('ny')).toBe('Northeast')
    expect(censusRegionForState('CA')).toBe('West')
    expect(censusRegionForState('OH')).toBe('Midwest')
  })

  it('returns null for unknown', () => {
    expect(censusRegionForState('')).toBeNull()
    expect(censusRegionForState('ZZ')).toBeNull()
  })
})
