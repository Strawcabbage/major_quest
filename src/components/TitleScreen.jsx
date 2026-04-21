import { useGame, hasSavedGame } from '../context/GameContext'

export default function TitleScreen() {
  const { goPhase, restart, state } = useGame()
  const saveExists = hasSavedGame()

  function handleNewGame() {
    if (saveExists) restart()
    goPhase('character')
  }

  function handleContinue() {
    goPhase(state.phase !== 'title' ? state.phase : 'character')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-10 pixel-ui text-center px-4">
      <div>
        <p className="text-xs sm:text-[11px] text-amber-500/90 uppercase tracking-[0.35em] mb-4">College Scorecard Quest</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-100 drop-shadow-[2px_2px_0_#1c1917]">
          Major Quest
        </h1>
        <p className="mt-5 text-xs sm:text-[11px] text-stone-400 max-w-md mx-auto leading-relaxed">
          A retro choose-your-path journey from campus to career — powered by real U.S. Department of Education data.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {saveExists && (
          <button type="button" className="pixel-btn-primary" onClick={handleContinue}>
            Continue
          </button>
        )}
        <button type="button" className={saveExists ? 'pixel-btn-secondary' : 'pixel-btn-primary'} onClick={handleNewGame}>
          New Game
        </button>
        <button type="button" className="pixel-btn-secondary" onClick={() => goPhase('how_to_play')}>
          How to Play
        </button>
      </div>
    </div>
  )
}
