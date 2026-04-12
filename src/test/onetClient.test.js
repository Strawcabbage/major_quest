import { describe, it, expect } from 'vitest'
import { pickOverviewLines } from '../services/onetClient'

describe('pickOverviewLines', () => {
  it('extracts title and description when present', () => {
    const lines = pickOverviewLines({
      title: 'Software Developers',
      description: 'Research, design, and develop computer systems.',
    })
    expect(lines.some((l) => l.includes('Software Developers'))).toBe(true)
    expect(lines.some((l) => l.includes('Research'))).toBe(true)
  })

  it('truncates long descriptions', () => {
    const long = 'x'.repeat(300)
    const lines = pickOverviewLines({ title: 'T', description: long })
    const descLine = lines.find((l) => l.startsWith('x'))
    expect(descLine.length).toBeLessThanOrEqual(221)
    expect(descLine.endsWith('…')).toBe(true)
  })

  it('handles empty input', () => {
    expect(pickOverviewLines(null)).toEqual([])
  })
})
