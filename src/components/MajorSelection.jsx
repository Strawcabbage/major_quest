import { useGame } from '../context/GameContext'
import gameData from '../data/gameData.json'

export default function MajorSelection() {
  const { selectMajor } = useGame()

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">Major Reality</h1>
      <p className="text-gray-400 mb-12 max-w-md">
        10 years. Real numbers. Your choices.<br />
        Pick a major and see where life takes you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {gameData.majors.map((major) => (
          <button
            key={major.major_id}
            onClick={() => selectMajor(major)}
            className="group bg-gray-800 hover:bg-indigo-900 border border-gray-700 hover:border-indigo-500 rounded-2xl p-6 text-left transition-all duration-200 cursor-pointer"
          >
            <span className="text-4xl block mb-3">{major.emoji}</span>
            <h2 className="text-white font-semibold text-lg group-hover:text-indigo-300">
              {major.title}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Starting salary:{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(major.initial_stats.salary)}
            </p>
            <p className="text-gray-500 text-sm">
              Starting debt:{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(major.initial_stats.debt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
