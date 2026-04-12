import { useGame } from '../context/GameContext'
import { computeNetWorth } from '../engine/gameEngine'
import { AVATARS } from '../constants/avatars'

function StatBar({ label, value, max = 100, colorClass }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="mb-3 pixel-ui">
      <div className="flex justify-between text-[8px] mb-1">
        <span className="text-stone-500">{label}</span>
        <span className="text-amber-100">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-stone-800 border border-stone-700 overflow-hidden">
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
    <div className="flex justify-between items-center py-1.5 border-b border-stone-700/80 pixel-ui">
      <span className="text-stone-500 text-[8px]">{label}</span>
      <span className={`text-[8px] font-bold ${color}`}>
        {value < 0 ? '-' : ''}
        {formatted}
      </span>
    </div>
  )
}

export default function StatsSidebar() {
  const { state } = useGame()
  const { stats, selectedMajor, currentNodeIndex, choiceHistory, playerName, avatarId, school, program } = state

  if (!stats) return null

  const avatar = AVATARS.find((a) => a.id === avatarId)
  const totalNodes = selectedMajor?.nodes.length ?? 0
  const yearProgress = totalNodes > 0 ? (currentNodeIndex / totalNodes) * 100 : 0
  const netWorth = computeNetWorth(stats)
  const currentYear =
    choiceHistory.length === 0 ? 1 : choiceHistory[choiceHistory.length - 1]?.year ?? 1

  return (
    <aside className="w-64 sm:w-72 shrink-0 bg-stone-900 border-l-2 border-amber-900/40 p-4 flex flex-col gap-4 overflow-y-auto pixel-ui">
      <div className="flex items-center gap-2 border-b border-stone-700 pb-3">
        <span className="text-2xl pixel-crisp" aria-hidden>
          {avatar?.glyph ?? '⭐'}
        </span>
        <div className="min-w-0">
          <p className="text-[8px] text-stone-500 uppercase tracking-wider">Student</p>
          <p className="text-[10px] text-amber-100 font-bold truncate">{playerName || 'Player'}</p>
          {school?.name && <p className="text-[7px] text-stone-500 truncate">{school.name}</p>}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <span className="text-xl pixel-crisp">{selectedMajor?.emoji}</span>
        <div className="min-w-0">
          <p className="text-[8px] text-stone-500 uppercase tracking-wider">Major</p>
          <p className="text-[9px] text-amber-50 font-semibold leading-snug">{selectedMajor?.title}</p>
          {program?.title && (
            <p className="text-[7px] text-stone-500 mt-0.5 leading-tight">Field: {program.title}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[7px] text-stone-500 mb-1">
          <span>Year {currentYear}</span>
          <span>Timeline</span>
        </div>
        <div className="h-1.5 bg-stone-800 border border-stone-700 overflow-hidden">
          <div
            className="h-full bg-amber-600 transition-all duration-700"
            style={{ width: `${yearProgress}%` }}
          />
        </div>
      </div>

      <div className="pixel-panel p-3">
        <p className="text-[8px] text-stone-500 uppercase tracking-widest mb-2">Finances</p>
        <MoneyRow label="Salary" value={stats.salary} />
        <MoneyRow label="Bank" value={stats.bank} />
        <MoneyRow label="Debt" value={-stats.debt} />
        <div className="flex justify-between items-center pt-2 mt-1">
          <span className="text-[8px] font-semibold text-stone-300">Net worth</span>
          <span className={`text-[9px] font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(netWorth)}
          </span>
        </div>
      </div>

      <div className="pixel-panel p-3">
        <p className="text-[8px] text-stone-500 uppercase tracking-widest mb-2">Wellbeing</p>
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
          <p className="text-[8px] text-stone-500 uppercase tracking-widest mb-2">History</p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {choiceHistory.map((c, i) => (
              <li key={i} className="text-[7px] text-stone-400 leading-tight">
                <span className="text-amber-600">Y{c.year}:</span> {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
