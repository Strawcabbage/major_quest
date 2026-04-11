import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameProvider, useGame } from '../context/GameContext'
import gameData from '../data/gameData.json'

function TestConsumer() {
  const { state, selectMajor, makeChoice } = useGame()
  const major = gameData.majors[0] // CS

  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="bank">{state.stats?.bank ?? ''}</span>
      <button onClick={() => selectMajor(major)}>Select CS</button>
      <button onClick={() => makeChoice(major.nodes[0].options[1], major.nodes[0])}>
        Make Choice
      </button>
    </div>
  )
}

describe('GameContext', () => {
  it('starts in major_selection phase', () => {
    render(<GameProvider><TestConsumer /></GameProvider>)
    expect(screen.getByTestId('phase').textContent).toBe('major_selection')
  })

  it('moves to playing phase after major selection', async () => {
    render(<GameProvider><TestConsumer /></GameProvider>)
    await userEvent.click(screen.getByText('Select CS'))
    expect(screen.getByTestId('phase').textContent).toBe('playing')
  })

  it('updates bank after a choice', async () => {
    render(<GameProvider><TestConsumer /></GameProvider>)
    await userEvent.click(screen.getByText('Select CS'))
    const initialBank = Number(screen.getByTestId('bank').textContent)
    await userEvent.click(screen.getByText('Make Choice'))
    const updatedBank = Number(screen.getByTestId('bank').textContent)
    // Bank job gives +5000 bank_delta
    expect(updatedBank).toBeGreaterThan(initialBank)
  })
})
