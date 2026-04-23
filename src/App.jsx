import { useGame } from './context/GameContext'
import TitleScreen from './components/TitleScreen'
import HowToPlay from './components/HowToPlay'
import DataSources from './components/DataSources'
import CharacterCreation from './components/CharacterCreation'
import SchoolPicker from './components/SchoolPicker'
import MajorPicker from './components/MajorPicker'
import CareerPathPicker from './components/CareerPathPicker'
import CityPicker from './components/CityPicker'
import FinancingScreen from './components/FinancingScreen'
import FiveYearOutlook from './components/FiveYearOutlook'
import DecisionNode from './components/DecisionNode'
import FinalSummary from './components/FinalSummary'
import StatsSidebar from './components/StatsSidebar'
import FactModal from './components/FactModal'

function PhaseRouter() {
  const { state } = useGame()
  const { phase } = state

  switch (phase) {
    case 'title':
      return <TitleScreen />
    case 'how_to_play':
      return <HowToPlay />
    case 'data_sources':
      return <DataSources />
    case 'character':
      return <CharacterCreation />
    case 'school':
      return <SchoolPicker />
    case 'major':
      return <MajorPicker />
    case 'career_path':
      return <CareerPathPicker />
    case 'city':
      return <CityPicker />
    case 'financing':
      return <FinancingScreen />
    case 'five_year_outlook':
      return <FiveYearOutlook />
    case 'playing':
      return <DecisionNode />
    case 'game_over':
      return <FinalSummary />
    default:
      return <TitleScreen />
  }
}

function GameScreen() {
  const { state } = useGame()
  const { phase } = state
  const showSidebar = phase === 'playing' || phase === 'game_over'

  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-950 text-stone-100 overflow-hidden pixel-ui scanlines">
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0">
        <div className="min-h-full flex items-center justify-center">
          <PhaseRouter />
        </div>
      </main>
      {showSidebar && <StatsSidebar />}
      <FactModal />
    </div>
  )
}

export default function App() {
  return <GameScreen />
}
