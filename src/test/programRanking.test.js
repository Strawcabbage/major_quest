import { describe, it, expect } from 'vitest'
import {
  dedupeProgramsByCip,
  rankProgramsForDisplay,
  programDataCompletenessScore,
} from '../services/scorecardClient'

/** Representative one-school program list after normalize shape (smoke). */
const SAMPLE = [
  {
    cipCode: '9999',
    title: 'Sparse program',
    earningsMedian: null,
    earningsMedian1Yr: null,
    earningsMedian2Yr: null,
    debtMedian: null,
    completionRate: null,
    credentialLevel: null,
  },
  {
    cipCode: '1101',
    title: 'Computer Science.',
    earningsMedian: 95000,
    earningsMedian1Yr: 88000,
    earningsMedian2Yr: 95000,
    debtMedian: 20000,
    completionRate: 0.72,
    credentialLevel: 3,
  },
  {
    cipCode: '5202',
    title: 'Business Administration',
    earningsMedian: 60000,
    earningsMedian1Yr: null,
    earningsMedian2Yr: 60000,
    debtMedian: null,
    completionRate: null,
    credentialLevel: 3,
  },
]

describe('programDataCompletenessScore', () => {
  it('ranks richer rows higher', () => {
    const rich = programDataCompletenessScore(SAMPLE[1])
    const poor = programDataCompletenessScore(SAMPLE[0])
    expect(rich).toBeGreaterThan(poor)
  })
})

describe('rankProgramsForDisplay', () => {
  it('orders by completeness then earnings', () => {
    const deduped = dedupeProgramsByCip(SAMPLE)
    const ranked = rankProgramsForDisplay(deduped)
    expect(ranked[0].cipCode).toBe('1101')
    expect(ranked[ranked.length - 1].cipCode).toBe('9999')
  })
})
