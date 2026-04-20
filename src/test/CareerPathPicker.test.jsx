import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider, useGame } from '../context/GameContext'
import CareerPathPicker from '../components/CareerPathPicker'
import gameData from '../data/gameData.json'
import cipToSocCatalog from '../data/cipToSocCatalog.json'
import careerCatalog from '../data/careerCatalog.json'

function Harness() {
  const { state, setSchool, setProgramAndMajor, goPhase } = useGame()
  const major = gameData.majors[0]

  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="career-soc">{state.selectedCareerPath?.soc ?? ''}</span>
      <button
        type="button"
        onClick={() => {
          setSchool({ id: 'test_school', name: 'Test U', state: 'CA', programs: [] })
          setProgramAndMajor(
            { cipCode: '1101', title: 'Computer Science', earningsMedian: null, debtMedian: null },
            major,
          )
          goPhase('career_path')
        }}
      >
        Seed career path phase
      </button>
      {state.phase === 'career_path' && <CareerPathPicker />}
    </div>
  )
}

describe('CareerPathPicker', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders catalog occupations and DWA bullets for the selected career', async () => {
    const cipEntry = cipToSocCatalog.byCip?.['1101']
    const firstSocList = Array.isArray(cipEntry) ? cipEntry : cipEntry?.socs ?? []
    const firstSoc = firstSocList.find((s) => careerCatalog.bySoc?.[s])
    const firstProfile = careerCatalog.bySoc?.[firstSoc]
    const firstDwa = firstProfile?.dwas?.[0]?.title

    render(
      <GameProvider>
        <Harness />
      </GameProvider>,
    )

    await userEvent.click(screen.getByText('Seed career path phase'))
    expect(screen.getByTestId('phase').textContent).toBe('career_path')

    const titleHits = await screen.findAllByText(firstProfile.title)
    expect(titleHits.length).toBeGreaterThanOrEqual(1)
    if (firstDwa) {
      expect(screen.getByText(new RegExp(firstDwa.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
    }
    expect(screen.getByText('O*NET Detailed Work Activities')).toBeInTheDocument()
  })

  it('stores SOC + growth on confirm and advances to city phase', async () => {
    const cipEntry = cipToSocCatalog.byCip?.['1101']
    const firstSocList = Array.isArray(cipEntry) ? cipEntry : cipEntry?.socs ?? []
    const firstSoc = firstSocList.find((s) => careerCatalog.bySoc?.[s])

    render(
      <GameProvider>
        <Harness />
      </GameProvider>,
    )

    await userEvent.click(screen.getByText('Seed career path phase'))
    const firstProfile = careerCatalog.bySoc?.[firstSoc]
    await screen.findAllByText(firstProfile.title)

    await userEvent.click(screen.getByText('Continue to location'))
    await waitFor(() => {
      expect(screen.getByTestId('phase').textContent).toBe('city')
      expect(screen.getByTestId('career-soc').textContent).toBe(firstSoc)
    })
  })

  it('renders Adzuna postings returned by the mocked fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        const urlString = String(url)
        if (urlString.startsWith('/api/adzuna')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    id: 'adz_1',
                    title: 'Backend Software Engineer',
                    company: { display_name: 'Acme Robotics' },
                    location: { display_name: 'Remote · US' },
                    redirect_url: 'https://example.com/adz_1',
                    salary_min: 120000,
                    salary_max: 160000,
                    created: '2026-01-15',
                  },
                ],
              }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }),
    )

    render(
      <GameProvider>
        <Harness />
      </GameProvider>,
    )
    await userEvent.click(screen.getByText('Seed career path phase'))

    expect(await screen.findByText('Backend Software Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme Robotics/)).toBeInTheDocument()
  })
})
