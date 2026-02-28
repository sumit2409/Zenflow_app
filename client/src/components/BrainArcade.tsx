import React, { useEffect, useMemo, useState } from 'react'
import { playStartChime, playVictoryFanfare } from '../utils/sound'
import { todayKey } from '../utils/wellness'
import { type ProfileMeta } from '../utils/profile'
import { apiUrl } from '../utils/api'

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

type MemoryLevel = 'easy' | 'medium' | 'hard'
type ReactionLevel = 'easy' | 'medium' | 'hard'

const reactionTargets: Record<ReactionLevel, number> = { easy: 550, medium: 420, hard: 320 }
const memoryLengths: Record<MemoryLevel, number> = { easy: 4, medium: 5, hard: 6 }
const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
  }
  return copy
}

function buildSequence(level: MemoryLevel) {
  return shuffle(keypadNumbers).slice(0, memoryLengths[level])
}

export default function BrainArcade({ user, token, onRequireLogin }: Props) {
  const [memoryLevel, setMemoryLevel] = useState<MemoryLevel>('medium')
  const [reactionLevel, setReactionLevel] = useState<ReactionLevel>('medium')
  const [memorySequence, setMemorySequence] = useState<string[]>(() => buildSequence('medium'))
  const [memoryInput, setMemoryInput] = useState('')
  const [memoryState, setMemoryState] = useState<'preview' | 'answer' | 'won' | 'missed'>('preview')
  const [memoryPreviewVisible, setMemoryPreviewVisible] = useState(true)
  const [memoryWinMessage, setMemoryWinMessage] = useState('')
  const [reactionState, setReactionState] = useState<'idle' | 'waiting' | 'go'>('idle')
  const [reactionStart, setReactionStart] = useState(0)
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const [reactionWinMessage, setReactionWinMessage] = useState('')
  const [meta, setMeta] = useState<ProfileMeta>({})

  const bestMemorySpan = meta.brainArcade?.memoryBestSpan || meta.brainArcade?.memoryBestMoves || 0
  const expectedSequence = useMemo(() => memorySequence.join(''), [memorySequence])

  useEffect(() => {
    async function load() {
      if (!user || !token) return
      try {
        const response = await fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const payload = await response.json()
        setMeta(payload.meta || {})
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [user, token])

  useEffect(() => {
    setMemorySequence(buildSequence(memoryLevel))
    setMemoryInput('')
    setMemoryState('preview')
    setMemoryPreviewVisible(true)
    setMemoryWinMessage('')
  }, [memoryLevel])

  useEffect(() => {
    if (memoryState !== 'preview') return undefined

    const timeout = window.setTimeout(() => {
      setMemoryPreviewVisible(false)
      setMemoryState('answer')
    }, 2200)

    return () => window.clearTimeout(timeout)
  }, [memoryState, memorySequence])

  useEffect(() => {
    if (memoryState !== 'answer') return
    if (memoryInput.length !== memorySequence.length) return

    const won = memoryInput === expectedSequence
    setMemoryState(won ? 'won' : 'missed')
    setMemoryWinMessage(
      won
        ? `Correct. You entered ${memoryInput} and completed the ${memoryLevel} memory round.`
        : `Not correct. The right sequence was ${expectedSequence}.`
    )

    if (won) {
      void playVictoryFanfare()
      void logArcade('memory', 1)
      if (memorySequence.length > bestMemorySpan) {
        void persistMeta({
          brainArcade: {
            ...(meta.brainArcade || {}),
            memoryBestSpan: memorySequence.length,
          },
        })
      }
    }
  }, [bestMemorySpan, expectedSequence, memoryInput, memoryLevel, memorySequence.length, memoryState, meta.brainArcade])

  async function persistMeta(partial: Partial<ProfileMeta>) {
    setMeta((prev) => ({ ...prev, ...partial }))
    if (!user || !token) return
    await fetch(apiUrl('/api/meta'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ meta: partial }),
    })
  }

  async function logArcade(type: string, value: number) {
    if (!user || !token) return
    await fetch(apiUrl('/api/logs'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: todayKey(), type, value }),
    })
  }

  function resetMemory() {
    void playStartChime()
    setMemorySequence(buildSequence(memoryLevel))
    setMemoryInput('')
    setMemoryState('preview')
    setMemoryPreviewVisible(true)
    setMemoryWinMessage('')
  }

  function appendMemoryDigit(digit: string) {
    if (memoryState !== 'answer') return
    if (!user || !token) {
      onRequireLogin?.()
      return
    }
    setMemoryInput((current) => (current.length >= memorySequence.length ? current : `${current}${digit}`))
  }

  function removeMemoryDigit() {
    if (memoryState !== 'answer') return
    setMemoryInput((current) => current.slice(0, -1))
  }

  function handleMemoryInput(value: string) {
    if (memoryState !== 'answer') return
    if (!user || !token) {
      onRequireLogin?.()
      return
    }
    setMemoryInput(value.replace(/[^1-9]/g, '').slice(0, memorySequence.length))
  }

  function startReaction() {
    if (!user || !token) return onRequireLogin?.()
    setReactionState('waiting')
    setReactionMs(null)
    setReactionWinMessage('')
    window.setTimeout(() => {
      setReactionState('go')
      setReactionStart(performance.now())
    }, 1200 + Math.random() * 1800)
  }

  async function handleReactionTap() {
    if (reactionState === 'waiting') {
      setReactionState('idle')
      setReactionMs(null)
      setReactionWinMessage('Too early. Wait for the green screen before tapping.')
      return
    }
    if (reactionState !== 'go') return
    const elapsed = Math.round(performance.now() - reactionStart)
    setReactionMs(elapsed)
    setReactionState('idle')
    const won = elapsed <= reactionTargets[reactionLevel]
    setReactionWinMessage(won ? `Success in ${elapsed} ms.` : `${elapsed} ms. Target is ${reactionTargets[reactionLevel]} ms.`)
    if (won) void playVictoryFanfare()
    await logArcade('reaction', won ? 1 : 0)
    const best = meta.brainArcade?.reactionBestMs
    if (!best || elapsed < best) {
      void persistMeta({
        brainArcade: {
          ...(meta.brainArcade || {}),
          reactionBestMs: elapsed,
        },
      })
    }
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Games</h2>
        <p>Use the memory and reaction drills for a short reset during the day.</p>
        <div className="session-reward">Each completed round adds to your daily progress.</div>
      </div>

      <div className="arcade-layout">
        <section className="arcade-card card inset-card">
          <div className="section-kicker">Memory Sequence</div>
          <div className="difficulty-switch" role="tablist" aria-label="Memory game difficulty">
            {(['easy', 'medium', 'hard'] as MemoryLevel[]).map((level) => (
              <button key={level} className={`difficulty-chip ${memoryLevel === level ? 'active' : ''}`} onClick={() => setMemoryLevel(level)}>
                {level}
              </button>
            ))}
          </div>

          <div className={`memory-stage ${memoryPreviewVisible ? 'preview' : 'answer'}`}>
            <div className="memory-sequence">
              {memorySequence.map((digit, index) => (
                <div key={`${digit}-${index}`} className={`memory-sequence-chip ${memoryPreviewVisible ? 'visible' : 'hidden'}`}>
                  {memoryPreviewVisible ? digit : '?'}
                </div>
              ))}
            </div>
            <p className="muted">
              {memoryState === 'preview'
                ? 'Memorize the sequence.'
                : 'Type or tap the numbers in the same order you saw them.'}
            </p>
          </div>

          <label className="memory-input-group">
            Enter sequence
            <input
              value={memoryInput}
              onChange={(event) => handleMemoryInput(event.target.value)}
              inputMode="numeric"
              placeholder="Type the numbers you remember"
              disabled={memoryState !== 'answer'}
            />
          </label>

          <div className="memory-keypad" role="group" aria-label="Memory keypad">
            {keypadNumbers.map((digit) => (
              <button key={digit} className="memory-key" onClick={() => appendMemoryDigit(digit)} disabled={memoryState !== 'answer'}>
                {digit}
              </button>
            ))}
          </div>

          <div className="controls">
            <button onClick={removeMemoryDigit} disabled={memoryState !== 'answer' || memoryInput.length === 0}>Backspace</button>
            <button onClick={resetMemory}>New round</button>
          </div>

          <div className="mini-stats">
            <div>
              <strong>{memorySequence.length}</strong>
              <span>Sequence</span>
            </div>
            <div>
              <strong>{bestMemorySpan || '-'}</strong>
              <span>Best span</span>
            </div>
            <div>
              <strong>{memoryState === 'won' ? 'Won' : memoryState === 'missed' ? 'Missed' : 'Live'}</strong>
              <span>Status</span>
            </div>
          </div>

          {memoryWinMessage && <div className={`game-result ${memoryState === 'won' ? 'success' : ''}`}>{memoryWinMessage}</div>}
        </section>

        <section className="arcade-card card inset-card">
          <div className="section-kicker">Reaction Test</div>
          <div className="difficulty-switch" role="tablist" aria-label="Reaction game difficulty">
            {(['easy', 'medium', 'hard'] as ReactionLevel[]).map((level) => (
              <button key={level} className={`difficulty-chip ${reactionLevel === level ? 'active' : ''}`} onClick={() => setReactionLevel(level)}>
                {level}
              </button>
            ))}
          </div>
          <div className={`reaction-stage ${reactionState}`}>
            <strong>{reactionState === 'go' ? 'Tap now' : reactionState === 'waiting' ? 'Wait for green' : 'Ready?'}</strong>
            <span>{reactionMs ? `${reactionMs} ms` : `Beat ${reactionTargets[reactionLevel]} ms to win.`}</span>
          </div>
          <div className="mini-stats">
            <div>
              <strong>{reactionMs ?? '-'}</strong>
              <span>Latest</span>
            </div>
            <div>
              <strong>{meta.brainArcade?.reactionBestMs || '-'}</strong>
              <span>Best ms</span>
            </div>
            <div>
              <strong>+55</strong>
              <span>Points</span>
            </div>
          </div>
          <div className="controls">
            <button onClick={reactionState === 'go' ? handleReactionTap : startReaction}>
              {reactionState === 'go' ? 'Tap' : 'Start reaction test'}
            </button>
            {reactionState === 'waiting' && <button onClick={handleReactionTap}>Too soon</button>}
          </div>
          {reactionWinMessage && <div className={`game-result ${reactionMs !== null && reactionMs <= reactionTargets[reactionLevel] ? 'success' : ''}`}>{reactionWinMessage}</div>}
        </section>
      </div>
    </div>
  )
}
