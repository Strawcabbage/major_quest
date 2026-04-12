import { describe, it, expect } from 'vitest'
import {
  latestValueFromSeries,
  cpiStretchLineFromApiJson,
  formatCpiStretchLine,
} from '../services/blsClient'
import { CPI_SERIES_US, CPI_SERIES_BY_REGION } from '../constants/blsCpiRegions'

describe('latestValueFromSeries', () => {
  it('returns latest by year then period', () => {
    const v = latestValueFromSeries({
      data: [
        { year: '2023', period: 'M12', value: '100' },
        { year: '2024', period: 'M01', value: '105' },
        { year: '2024', period: 'M12', value: '110' },
      ],
    })
    expect(v).toBe(110)
  })
})

describe('cpiStretchLineFromApiJson', () => {
  it('builds a comparison line when series match', () => {
    const json = {
      Results: {
        series: [
          { seriesID: CPI_SERIES_US, data: [{ year: '2024', period: 'M12', value: '100' }] },
          { seriesID: CPI_SERIES_BY_REGION.South, data: [{ year: '2024', period: 'M12', value: '102' }] },
        ],
      },
    }
    const line = cpiStretchLineFromApiJson(json, 'South', CPI_SERIES_BY_REGION.South)
    expect(line).toContain('South')
    expect(line).toContain('BLS CPI-U')
    expect(line).toContain('higher')
  })

  it('returns null for bad payloads', () => {
    expect(cpiStretchLineFromApiJson(null, 'West', CPI_SERIES_BY_REGION.West)).toBeNull()
    expect(cpiStretchLineFromApiJson({ Results: {} }, 'West', CPI_SERIES_BY_REGION.West)).toBeNull()
  })
})

describe('formatCpiStretchLine', () => {
  it('mentions lower stretch for negative pct', () => {
    const s = formatCpiStretchLine('Midwest', -3, 'lower')
    expect(s).toContain('further')
  })
})
