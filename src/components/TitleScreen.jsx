import { useGame } from '../context/GameContext'

export default function TitleScreen() {
  const { goPhase } = useGame()

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-10 pixel-ui text-center px-4">
      <div>
        <p className="text-[8px] sm:text-[10px] text-amber-500/90 uppercase tracking-[0.35em] mb-3">College Scorecard Quest</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-100 drop-shadow-[2px_2px_0_#1c1917]">
          Major Quest
        </h1>
        <p className="mt-4 text-[9px] sm:text-[10px] text-stone-400 max-w-sm mx-auto leading-relaxed">
          A retro choose-your-path journey from campus to career — powered by real U.S. Department of Education data.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button type="button" className="pixel-btn-primary" onClick={() => goPhase('character')}>
          Start Game
        </button>
        <button type="button" className="pixel-btn-secondary" onClick={() => goPhase('how_to_play')}>
          How to Play
        </button>
      </div>
    </div>
  )
}
