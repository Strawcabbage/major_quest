import { describe, it, expect } from 'vitest'
import { dedupeProgramsByCip } from '../services/scorecardClient'

describe('dedupeProgramsByCip', () => {
  it('merges duplicate CIPs into one row with max earnings and longest title', () => {
    const out = dedupeProgramsByCip([
      { cipCode: '1101', title: 'CS', earningsMedian: 70000, debtMedian: null },
      { cipCode: '1101', title: 'Computer Science, General.', earningsMedian: 80000, debtMedian: 10000 },
      { cipCode: '1101', title: 'CS B', earningsMedian: null, debtMedian: 5000 },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].cipCode).toBe('1101')
    expect(out[0].earningsMedian).toBe(80000)
    expect(out[0].debtMedian).toBe(10000)
    expect(out[0].title).toBe('Computer Science, General.')
  })

  it('keeps distinct CIPs separate', () => {
    const out = dedupeProgramsByCip([
      { cipCode: '1101', title: 'A', earningsMedian: 1, debtMedian: null },
      { cipCode: '5138', title: 'B', earningsMedian: 2, debtMedian: null },
    ])
    expect(out).toHaveLength(2)
    expect(out.map((p) => p.cipCode).sort()).toEqual(['1101', '5138'])
  })

  it('sorts by CIP code', () => {
    const out = dedupeProgramsByCip([
      { cipCode: '5138', title: 'N', earningsMedian: null, debtMedian: null },
      { cipCode: '1101', title: 'C', earningsMedian: null, debtMedian: null },
    ])
    expect(out[0].cipCode).toBe('1101')
    expect(out[1].cipCode).toBe('5138')
  })
})
