import React, { useEffect, useRef, useState } from 'react'
import { createMeditationAmbience, playMeditationBell, playPauseChime, playStartChime } from '../utils/sound'
import { apiUrl } from '../utils/api'

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }
type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'hold2'
type BreathPattern = 'none' | 'box' | '478'

export default function MeditationTimer({ user, token, onRequireLogin }: Props) {
  const presets = [3 * 60, 5 * 60, 10 * 60]
  const [seconds, setSeconds] = useState(presets[0])
  const [running, setRunning] = useState(false)
  const [showMoodRating, setShowMoodRating] = useState(false)
  const [sessionMinutes, setSessionMinutes] = useState(0)

  const [breathPattern, setBreathPattern] = useState<BreathPattern>('none')
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale')
  const [breathCount, setBreathCount] = useState(0)

  const currentPreset = useRef<number>(presets[0])
  const completedRef = useRef(false)
  const ambienceRef = useRef(createMeditationAmbience())
  const breathIntervalRef = useRef<number | null>(null)

  const breathPatterns: Record<BreathPattern, { label: string; phases: Array<{ name: BreathPhase; duration: number }> }> = {
    none: { label: 'No guide', phases: [] },
    box: {
      label: 'Box (4-4-4-4)',
      phases: [
        { name: 'inhale', duration: 4 },
        { name: 'hold', duration: 4 },
        { name: 'exhale', duration: 4 },
        { name: 'hold2', duration: 4 },
      ],
    },
    '478': {
      label: '4-7-8 Calm',
      phases: [
        { name: 'inhale', duration: 4 },
        { name: 'hold', duration: 7 },
        { name: 'exhale', duration: 8 },
      ],
    },
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds((value) => value - 1), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (seconds > 0) completedRef.current = false
    if (seconds <= 0) setRunning(false)
  }, [seconds])

  useEffect(() => {
    if (running) {
      void ambienceRef.current.start()
      return () => ambienceRef.current.stop()
    }
    ambienceRef.current.stop()
    return undefined
  }, [running])

  useEffect(() => () => ambienceRef.current.stop(), [])

  useEffect(() => {
    if (!running || breathPattern === 'none') {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current)
      setBreathPhase('inhale')
      setBreathCount(0)
      return
    }

    const phases = breathPatterns[breathPattern].phases
    let phaseIndex = 0
    let elapsed = 0
    setBreathPhase(phases[0].name)

    breathIntervalRef.current = window.setInterval(() => {
      elapsed += 1
      const current = phases[phaseIndex]
      if (elapsed >= current.duration) {
        elapsed = 0
        phaseIndex = (phaseIndex + 1) % phases.length
        setBreathPhase(phases[phaseIndex].name)
        setBreathCount((count) => count + 1)
      }
    }, 1000)

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current)
    }
  }, [running, breathPattern])

  useEffect(() => {
    if (seconds !== 0 || completedRef.current) return
    completedRef.current = true
    void playMeditationBell()

    setSessionMinutes(currentPreset.current / 60)
    setShowMoodRating(true)
  }, [seconds])

  async function saveMoodAndLog(mood: number) {
    setShowMoodRating(false)
    if (user && token) {
      const today = todayKey()
      const calls = [
        fetch(apiUrl('/api/logs'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ date: today, type: 'meditation', value: sessionMinutes }),
        }),
      ]

      if (mood > 0) {
        calls.push(
          fetch(apiUrl('/api/logs'), {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
            body: JSON.stringify({ date: today, type: 'mood_post_meditation', value: mood }),
          })
        )
      }

      await Promise.all(calls).catch((error) => console.error(error))
    } else {
      onRequireLogin?.()
    }
  }

  const format = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`

  const toggleRunning = () => {
    if (!running) {
      void playStartChime()
    } else {
      void playPauseChime()
    }
    setRunning((value) => !value)
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Guided Calm Window</h2>
        <p>A soft ambient layer will play while your meditation timer is running.</p>
        <div className="session-reward">A five-minute reset completes your calm ritual and softens the day.</div>
      </div>
      <div className="timer-display">{format(Math.max(0, seconds))}</div>
      <div className="controls">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setSeconds(preset)
              currentPreset.current = preset
              setRunning(false)
            }}
          >
            {preset / 60} min
          </button>
        ))}
      </div>
      <div className="controls">
        {(Object.keys(breathPatterns) as BreathPattern[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`difficulty-chip ${breathPattern === key ? 'active' : ''}`}
            onClick={() => setBreathPattern(key)}
          >
            {breathPatterns[key].label}
          </button>
        ))}
      </div>
      <div className="controls">
        <button onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
        <button
          onClick={() => {
            setRunning(false)
            setSeconds(presets[0])
            currentPreset.current = presets[0]
          }}
        >
          Reset
        </button>
      </div>
      <p className="muted">The meditation timer uses a softer bell at completion while the ambient tone is active.</p>

      {breathPattern !== 'none' && running ? (
        <div className="breath-guide">
          <div className={`breath-circle breath-${breathPhase}`} aria-live="polite">
            <span className="breath-label">{breathPhase === 'hold2' ? 'hold' : breathPhase}</span>
          </div>
        </div>
      ) : (
        <div className="pulse" aria-hidden />
      )}

      {showMoodRating && (
        <div className="reflection-overlay">
          <div className="reflection-card card">
            <div className="section-kicker">Session complete</div>
            <h3>How do you feel?</h3>
            <div className="controls" style={{ justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  style={{ fontSize: '24px', minHeight: '52px', minWidth: '52px' }}
                  onClick={() => void saveMoodAndLog(score)}
                >
                  {['😞', '😕', '😐', '🙂', '😊'][score - 1]}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button className="ghost-btn" onClick={() => void saveMoodAndLog(0)}>Skip</button>
            </div>
            <small className="muted" style={{ display: 'block', marginTop: '8px', textAlign: 'center' }}>
              Breath cycles completed: {breathCount}
            </small>
          </div>
        </div>
      )}
    </div>
  )
}
