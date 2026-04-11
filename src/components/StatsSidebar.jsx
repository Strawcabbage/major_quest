import { useGame } from '../context/GameContext'
import { computeNetWorth } from '../engine/gameEngine'

function StatBar({ label, value, max = 100, colorClass }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
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
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-mono font-bold ${color}`}>
        {value < 0 ? '-' : ''}{formatted}
      </span>
    </div>
  )
}

export default function StatsSidebar() {
  const { state } = useGame()
  const { stats, selectedMajor, currentNodeIndex, choiceHistory } = state

  if (!stats) return null

  const totalNodes = selectedMajor?.nodes.length ?? 0
  const yearProgress = totalNodes > 0 ? (currentNodeIndex / totalNodes) * 100 : 0
  const netWorth = computeNetWorth(stats)
  const currentYear = choiceHistory.length === 0
    ? 1
    : choiceHistory[choiceHistory.length - 1]?.year ?? 1

  return (
    <aside className="w-72 shrink-0 bg-gray-900 border-l border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Major Badge */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{selectedMajor?.emoji}</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Major</p>
          <p className="text-white font-semibold">{selectedMajor?.title}</p>
        </div>
      </div>

      {/* Year Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Year {currentYear}</span>
          <span>Year 10</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${yearProgress}%` }}
          />
        </div>
      </div>

      {/* Money Stats */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Finances</p>
        <MoneyRow label="Annual Salary" value={stats.salary} />
        <MoneyRow label="Bank Account" value={stats.bank} />
        <MoneyRow label="Student Debt" value={-stats.debt} />
        <div className="flex justify-between items-center pt-2 mt-1">
          <span className="text-sm font-semibold text-white">Net Worth</span>
          <span className={`font-mono font-bold text-lg ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(netWorth)}
          </span>
        </div>
      </div>

      {/* Wellbeing */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Wellbeing</p>
        <StatBar
          label="Happiness"
          value={stats.happiness}
          max={100}
          colorClass={
            stats.happiness > 60
              ? 'bg-emerald-500'
              : stats.happiness > 30
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }
        />
      </div>

      {/* Choice History */}
      {choiceHistory.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">History</p>
          <ul className="space-y-1">
            {choiceHistory.map((c, i) => (
              <li key={i} className="text-xs text-gray-400">
                <span className="text-indigo-400">Yr {c.year}:</span> {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
