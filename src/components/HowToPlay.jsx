import { useGame } from '../context/GameContext'

const RULES = [
  'Create your student: name them and pick a portrait.',
  'Choose a real college from the College Scorecard database.',
  'Pick a major we have a full story for (CS, Nursing, or English) — stats pull from your school when available.',
  'Select how you pay for school; debt and savings shift before your career timeline begins.',
  'Each year, pick between two paths. Your salary, debt, savings, and happiness evolve — pop-ups ground choices in data.',
  'At the end, see net worth, debt, and a rough payoff timeline (simplified math, not financial advice).',
]

export default function HowToPlay() {
  const { goPhase } = useGame()

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 pixel-ui px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-sm sm:text-base font-bold text-amber-100 uppercase tracking-wider">How to Play</h1>
      <ol className="text-left space-y-3 w-full text-[9px] sm:text-[10px] text-stone-300 leading-relaxed list-decimal list-inside">
        {RULES.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
      <button type="button" className="pixel-btn-secondary mt-4" onClick={() => goPhase('title')}>
        Back
      </button>
    </div>
  )
}
