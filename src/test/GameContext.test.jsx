import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider, useGame } from '../context/GameContext'
import gameData from '../data/gameData.json'

function TestConsumer() {
  const { state, testBeginPlaying, makeChoice } = useGame()
  const major = gameData.majors[0]

  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="bank">{state.stats?.bank ?? ''}</span>
      <button type="button" onClick={() => testBeginPlaying(major, { ...major.initial_stats })}>
        Start playing
      </button>
      <button type="button" onClick={() => makeChoice(major.nodes[0].options[1], major.nodes[0])}>
        Make Choice
      </button>
    </div>
  )
}

describe('GameContext', () => {
  it('starts on the title phase', () => {
    render(
      <GameProvider>
        <TestConsumer />
      </GameProvider>,
    )
    expect(screen.getByTestId('phase').textContent).toBe('title')
  })

  it('enters playing phase via test helper and updates bank after a choice', async () => {
    render(
      <GameProvider>
        <TestConsumer />
      </GameProvider>,
    )
    await userEvent.click(screen.getByText('Start playing'))
    expect(screen.getByTestId('phase').textContent).toBe('playing')
    const initialBank = Number(screen.getByTestId('bank').textContent)
    await userEvent.click(screen.getByText('Make Choice'))
    const updatedBank = Number(screen.getByTestId('bank').textContent)
    expect(updatedBank).toBeGreaterThan(initialBank)
  })
})
