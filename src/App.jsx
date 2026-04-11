import { useGame } from './context/GameContext'
import MajorSelection from './components/MajorSelection'
import DecisionNode from './components/DecisionNode'
import FinalSummary from './components/FinalSummary'
import StatsSidebar from './components/StatsSidebar'

function GameScreen() {
  const { state } = useGame()
  const { phase } = state

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <main className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        {phase === 'major_selection' && <MajorSelection />}
        {phase === 'playing' && <DecisionNode />}
        {phase === 'game_over' && <FinalSummary />}
      </main>

      {phase !== 'major_selection' && <StatsSidebar />}
    </div>
  )
}

export default function App() {
  return <GameScreen />
}
