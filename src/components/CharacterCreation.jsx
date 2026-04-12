import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { AVATARS } from '../constants/avatars'

export default function CharacterCreation() {
  const { setPlayer, goPhase } = useGame()
  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState(AVATARS[0].id)
  const [error, setError] = useState('')

  function handleContinue() {
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      setError('Enter a name to continue.')
      return
    }
    if (trimmed.length > 24) {
      setError('Keep it under 24 characters.')
      return
    }
    setError('')
    setPlayer(trimmed, avatarId)
    goPhase('school')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-8 pixel-ui px-4 max-w-2xl mx-auto w-full">
      <div className="text-center">
        <h1 className="text-base font-bold text-amber-100 uppercase tracking-wider mb-3">Create your student</h1>
        <p className="text-xs text-stone-500">They will follow you through every choice.</p>
      </div>

      <label className="w-full text-left text-xs text-stone-400">
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Alex Rivera"
          className="pixel-input mt-2 w-full"
        />
      </label>
      {error && <p className="text-xs text-red-400 w-full text-left">{error}</p>}

      <div className="w-full">
        <p className="text-xs text-stone-400 mb-3">Portrait</p>
        <div className="grid grid-cols-3 gap-4">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvatarId(a.id)}
              className={`pixel-avatar-tile ${avatarId === a.id ? 'pixel-avatar-tile--active' : ''}`}
              title={a.label}
            >
              <span className="text-4xl sm:text-5xl pixel-crisp" aria-hidden>
                {a.glyph}
              </span>
              <span className="text-[9px] text-stone-500 mt-2">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <button type="button" className="pixel-btn-secondary flex-1" onClick={() => goPhase('title')}>
          Back
        </button>
        <button type="button" className="pixel-btn-primary flex-1" onClick={handleContinue}>
          Next
        </button>
      </div>
    </div>
  )
}
