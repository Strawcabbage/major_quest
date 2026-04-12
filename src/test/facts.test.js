import { describe, it, expect } from 'vitest'
import { mergeProgramFactWithEnrichment } from '../utils/facts'

describe('mergeProgramFactWithEnrichment', () => {
  it('appends lines and footnote parts', () => {
    const base = {
      title: 'T',
      lines: ['a'],
      footnote: 'base.',
    }
    const m = mergeProgramFactWithEnrichment(base, {
      extraLines: ['b', 'c'],
      extraFootnoteParts: ['more.'],
    })
    expect(m.lines).toEqual(['a', 'b', 'c'])
    expect(m.footnote).toContain('base.')
    expect(m.footnote).toContain('more.')
  })
})
