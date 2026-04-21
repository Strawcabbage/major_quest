import { useState } from 'react'
import { useGame, hasSavedGame, getRunHistory, clearRunHistory } from '../context/GameContext'
import { BADGE_DEFS } from '../engine/gameEngine'

export default function TitleScreen() {
  const { goPhase, restart, state } = useGame()
  const saveExists = hasSavedGame()
  const [history, setHistory] = useState(() => getRunHistory())

  function handleNewGame() {
    if (saveExists) restart()
    goPhase('character')
  }

  function handleContinue() {
    goPhase(state.phase !== 'title' ? state.phase : 'character')
  }

  function handleClearHistory() {
    clearRunHistory()
    setHistory([])
  }

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

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
        <button type="button" className="pixel-btn-secondary" onClick={() => goPhase('data_sources')}>
          About the Data
        </button>
      </div>

      {history.length > 0 && (
        <div className="w-full max-w-4xl pixel-panel p-4 text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] text-stone-500 uppercase tracking-widest">Past Runs</p>
            <button type="button" className="pixel-btn-ghost text-[8px]" onClick={handleClearHistory}>
              Clear
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-stone-300">
              <thead>
                <tr className="text-stone-500 text-left">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Major</th>
                  <th className="pb-2 pr-3">School</th>
                  <th className="pb-2 pr-3">Career</th>
                  <th className="pb-2 pr-3 text-right">Salary</th>
                  <th className="pb-2 pr-3 text-right">Net Worth</th>
                  <th className="pb-2 pr-3 text-right">Happy</th>
                  <th className="pb-2 pr-3 text-right">Debt</th>
                  <th className="pb-2">Badges</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr key={run.id} className="border-t border-stone-800">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(run.date).toLocaleDateString()}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{run.major}</td>
                    <td className="py-1.5 pr-3 max-w-[180px] truncate">{run.school ?? '—'}</td>
                    <td className="py-1.5 pr-3 max-w-[160px] truncate">{run.career ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-right text-emerald-400">{fmt(run.salary)}</td>
                    <td className="py-1.5 pr-3 text-right" style={{ color: run.netWorth >= 0 ? '#34d399' : '#f87171' }}>{fmt(run.netWorth)}</td>
                    <td className="py-1.5 pr-3 text-right">{run.happiness}/100</td>
                    <td className="py-1.5 pr-3 text-right text-red-400">{fmt(run.debt)}</td>
                    <td className="py-1.5 whitespace-nowrap">
                      {(run.badges ?? []).map((bid) => {
                        const def = BADGE_DEFS.find((b) => b.id === bid)
                        return def ? <span key={bid} title={def.label}>{def.icon}</span> : null
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
