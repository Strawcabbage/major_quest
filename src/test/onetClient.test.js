import { describe, it, expect } from 'vitest'
import { pickOverviewLines, normalizeDwaList, normalizeOccupationDetail } from '../services/onetClient'

describe('pickOverviewLines', () => {
  it('extracts title and description when present', () => {
    const lines = pickOverviewLines({
      title: 'Software Developers',
      description: 'Research, design, and develop computer systems.',
    })
    expect(lines.some((l) => l.includes('Software Developers'))).toBe(true)
    expect(lines.some((l) => l.includes('Research'))).toBe(true)
  })

  it('preserves full descriptions without truncation', () => {
    const long = 'x'.repeat(300)
    const lines = pickOverviewLines({ title: 'T', description: long })
    const descLine = lines.find((l) => l.startsWith('x'))
    expect(descLine.length).toBe(300)
  })

  it('handles empty input', () => {
    expect(pickOverviewLines(null)).toEqual([])
  })
})

describe('normalizeDwaList', () => {
  it('reads the summary shape (activity[])', () => {
    const out = normalizeDwaList({
      activity: [
        { id: 'x.1', title: 'Write code.' },
        { id: 'x.2', title: 'Review pull requests.' },
      ],
    })
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ id: 'x.1', title: 'Write code.' })
  })
  it('reads the details shape (detailed_work_activity[])', () => {
    const out = normalizeDwaList({
      detailed_work_activity: [{ code: 'y.1', name: 'Teach courses.' }],
    })
    expect(out[0]).toEqual({ id: 'y.1', title: 'Teach courses.' })
  })
  it('filters rows with no title', () => {
    const out = normalizeDwaList({ activity: [{ id: 'z.1' }, { title: 'Valid' }] })
    expect(out).toEqual([{ id: null, title: 'Valid' }])
  })
  it('handles non-objects gracefully', () => {
    expect(normalizeDwaList(null)).toEqual([])
    expect(normalizeDwaList({})).toEqual([])
  })
})

describe('normalizeOccupationDetail', () => {
  it('extracts title and jobZone', () => {
    const out = normalizeOccupationDetail(
      { title: 'Software Developers', description: 'Build software.', job_zone: 4, bright_outlook: true },
      '15-1252.00',
    )
    expect(out).toEqual({
      soc: '15-1252.00',
      title: 'Software Developers',
      description: 'Build software.',
      jobZone: 4,
      brightOutlook: true,
    })
  })
  it('returns null for invalid input', () => {
    expect(normalizeOccupationDetail(null, 'x')).toBeNull()
  })
})
