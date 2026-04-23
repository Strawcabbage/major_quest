import { useGame } from '../context/GameContext'

const SOURCES = [
  {
    name: 'College Scorecard',
    url: 'https://collegescorecard.ed.gov',
    desc: 'U.S. Department of Education database powering school search, program/CIP data, tuition costs, and median earnings by field of study.',
  },
  {
    name: 'O*NET OnLine',
    url: 'https://www.onetonline.org',
    desc: 'Occupational data including career profiles, detailed work activities, top skills, related occupations, job zones, and bright outlook flags.',
  },
  {
    name: 'Bureau of Labor Statistics',
    url: 'https://www.bls.gov',
    desc: 'Median annual wages, 10-year occupation growth projections, and the CPI inflation rate used in the financial model.',
  },
  {
    name: 'Adzuna',
    url: 'https://www.adzuna.com',
    desc: 'Real-time job posting counts and salary estimates for selected careers, sourced from thousands of job boards.',
  },
  {
    name: 'USAJOBS',
    url: 'https://www.usajobs.gov',
    desc: 'Federal government job listings matched by OPM occupational series, showing public-sector opportunities for each career path.',
  },
  {
    name: 'Google Gemini',
    url: 'https://ai.google.dev',
    desc: 'AI-generated narrative text that brings decision scenarios and career retrospectives to life (not a data source, but powers the storytelling).',
  },
]

export default function DataSources() {
  const { goPhase } = useGame()

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 pixel-ui px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-sm sm:text-base font-bold text-amber-100 uppercase tracking-wider">About the Data</h1>
      <p className="text-[9px] sm:text-[10px] text-stone-400 text-center leading-relaxed">
        Major Quest is powered by real public datasets. Every salary figure, growth rate, and career detail comes from
        official U.S. government APIs and trusted third-party sources.
      </p>

      <div className="w-full space-y-3">
        {SOURCES.map((s) => (
          <div key={s.name} className="pixel-panel p-3">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-[10px] text-amber-200 font-semibold">{s.name}</p>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] text-sky-400 hover:text-sky-300 underline underline-offset-2 shrink-0"
              >
                {s.url.replace('https://', '')}
              </a>
            </div>
            <p className="text-[9px] text-stone-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <button type="button" className="pixel-btn-secondary mt-4" onClick={() => goPhase('title')}>
        Back
      </button>
    </div>
  )
}
