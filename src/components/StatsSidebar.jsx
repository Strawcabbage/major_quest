import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { computeNetWorth } from '../engine/gameEngine'
import { AVATARS } from '../constants/avatars'

function StatBar({ label, value, max = 100, colorClass }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="mb-4 pixel-ui">
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-stone-500">{label}</span>
        <span className="text-amber-100">{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-stone-800 border border-stone-700 overflow-hidden">
        <div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MoneyRow({ label, value }) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

  const color = value >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="flex justify-between items-center py-2 border-b border-stone-700/80 pixel-ui">
      <span className="text-stone-500 text-[10px]">{label}</span>
      <span className={`text-[10px] font-bold ${color}`}>
        {value < 0 ? '-' : ''}
        {formatted}
      </span>
    </div>
  )
}

export default function StatsSidebar() {
  const { state } = useGame()
  const { stats, selectedMajor, currentNodeIndex, choiceHistory, playerName, avatarId, school, program, playthroughNodes } = state
  const [open, setOpen] = useState(false)

  if (!stats) return null

  const avatar = AVATARS.find((a) => a.id === avatarId)
  const totalNodes = playthroughNodes?.length || selectedMajor?.nodes?.length || 0
  const yearProgress = totalNodes > 0 ? (currentNodeIndex / totalNodes) * 100 : 0
  const netWorth = computeNetWorth(stats)
  const currentYear =
    choiceHistory.length === 0 ? 1 : choiceHistory[choiceHistory.length - 1]?.year ?? 1

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 md:hidden bg-amber-900/90 border border-amber-700 text-amber-100 rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          aria-label="Open stats"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm3 5A.75.75 0 015.75 9h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 9.75zm2 5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto
          bg-stone-900 border-t-2 border-amber-900/40 p-5 flex flex-col gap-5 pixel-ui
          transition-transform duration-300
          ${open ? 'translate-y-0' : 'translate-y-full'}
          md:static md:translate-y-0 md:max-h-none md:w-80 md:shrink-0 md:border-t-0 md:border-l-2
        `}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden self-center -mt-2 mb-1 p-2"
          aria-label="Close stats"
        >
          <span className="block w-10 h-1 bg-stone-600 rounded-full" />
        </button>

        <div className="flex items-center gap-3 border-b border-stone-700 pb-4">
          <span className="text-3xl pixel-crisp" aria-hidden>
            {avatar?.glyph ?? '⭐'}
          </span>
          <div className="min-w-0">
            <p className="text-[9px] text-stone-500 uppercase tracking-wider">Student</p>
            <p className="text-xs text-amber-100 font-bold truncate">{playerName || 'Player'}</p>
            {school?.name && <p className="text-[9px] text-stone-500 truncate mt-0.5">{school.name}</p>}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl pixel-crisp">{selectedMajor?.emoji}</span>
          <div className="min-w-0">
            <p className="text-[9px] text-stone-500 uppercase tracking-wider">Major</p>
            <p className="text-xs text-amber-50 font-semibold leading-snug mt-0.5">{selectedMajor?.title}</p>
            {program?.title && (
              <p className="text-[9px] text-stone-500 mt-1 leading-tight">Field: {program.title}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[9px] text-stone-500 mb-1.5">
            <span>Year {currentYear}</span>
            <span>Timeline</span>
          </div>
          <div className="h-2 bg-stone-800 border border-stone-700 overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-700"
              style={{ width: `${yearProgress}%` }}
            />
          </div>
        </div>

        <div className="pixel-panel p-4">
          <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-3">Finances</p>
          <MoneyRow label="Salary" value={stats.salary} />
          <MoneyRow label="Bank" value={stats.bank} />
          <MoneyRow label="Debt" value={-stats.debt} />
          <div className="flex justify-between items-center pt-2.5 mt-1">
            <span className="text-[10px] font-semibold text-stone-300">Net worth</span>
            <span className={`text-xs font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(netWorth)}
            </span>
          </div>
        </div>

        <div className="pixel-panel p-4">
          <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-3">Wellbeing</p>
          <StatBar
            label="Happiness"
            value={stats.happiness}
            max={100}
            colorClass={
              stats.happiness > 60 ? 'bg-emerald-500' : stats.happiness > 30 ? 'bg-amber-500' : 'bg-red-600'
            }
          />
        </div>

        {choiceHistory.length > 0 && (
          <div>
            <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-2">History</p>
            <ul className="space-y-1.5 max-h-36 overflow-y-auto">
              {choiceHistory.map((c, i) => (
                <li key={i} className="text-[9px] text-stone-400 leading-tight">
                  <span className="text-amber-600">Y{c.year}:</span> {c.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </>
  )
}
