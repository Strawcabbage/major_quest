import { describe, it, expect } from 'vitest'
import catalog from '../data/careerCatalog.json'
import cipToSoc from '../data/cipToSocCatalog.json'
import branches from '../data/careerBranches.json'
import gameData from '../data/gameData.json'

const FALLBACK_CIP_FOR_MAJOR = {
  cs_001: '1101',
  nursing_001: '5138',
  english_001: '2301',
  explorer_001: '4301',
  business_001: '5202',
  engineering_001: '1401',
  education_001: '1301',
  arts_001: '5001',
  health_sci_001: '5101',
}

describe('careerCatalog', () => {
  it('has a bySoc map with occupation entries', () => {
    expect(catalog.bySoc).toBeTruthy()
    expect(Object.keys(catalog.bySoc).length).toBeGreaterThan(5)
  })

  it('every SOC entry has title, dwas, tasks, and bls fields', () => {
    for (const [soc, entry] of Object.entries(catalog.bySoc)) {
      expect(typeof entry.title).toBe('string')
      expect(Array.isArray(entry.dwas), `${soc}.dwas`).toBe(true)
      expect(Array.isArray(entry.tasks), `${soc}.tasks`).toBe(true)
      expect(entry.bls == null || typeof entry.bls === 'object').toBe(true)
    }
  })

  it('covers each track with mapped SOCs where a representative CIP exists', () => {
    for (const major of gameData.majors) {
      const cip = FALLBACK_CIP_FOR_MAJOR[major.major_id]
      if (!cip) continue
      const entry = cipToSoc.byCip?.[cip]
      const socs = Array.isArray(entry) ? entry : entry?.socs ?? []
      if (socs.length === 0) continue
      for (const soc of socs) {
        expect(catalog.bySoc[soc], `${soc} (from CIP ${cip}) missing in catalog`).toBeTruthy()
      }
    }
  })
})

describe('careerBranches', () => {
  it('at least 700 catalog SOCs have a branch', () => {
    const branchCount = Object.keys(branches.bySoc).length
    expect(branchCount).toBeGreaterThanOrEqual(700)
  })

  it('every branch has skills array with at least 2 entries', () => {
    for (const [soc, branch] of Object.entries(branches.bySoc)) {
      expect(Array.isArray(branch.skills), `${soc} missing skills`).toBe(true)
      expect(branch.skills.length, `${soc} needs >=2 skills`).toBeGreaterThanOrEqual(2)
    }
  })

  it('every branch SOC exists in the catalog', () => {
    for (const soc of Object.keys(branches.bySoc)) {
      expect(catalog.bySoc[soc], `branch for ${soc} has no catalog entry`).toBeTruthy()
    }
  })

  it('branch nodeOverrides are well-formed', () => {
    for (const [soc, branch] of Object.entries(branches.bySoc)) {
      const overrides = branch.nodeOverrides ?? []
      for (const ov of overrides) {
        expect(ov.node, `${soc} override missing node`).toBeTruthy()
        expect(Array.isArray(ov.node.options)).toBe(true)
        expect(ov.node.options.length).toBeGreaterThanOrEqual(2)
        const hasReplace = typeof ov.replaceYear === 'number'
        const hasInsert = typeof ov.insertAfterYear === 'number'
        expect(hasReplace || hasInsert, `${soc} override needs replaceYear or insertAfterYear`).toBe(true)
      }
    }
  })
})
