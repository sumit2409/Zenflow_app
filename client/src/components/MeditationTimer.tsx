import React, { useEffect, useRef, useState } from 'react'
import { playMeditationBell, playPauseChime, playStartChime } from '../utils/sound'
import { apiUrl } from '../utils/api'
import './MeditationTimer.css'

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }
type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'hold2'
type BreathPattern = 'none' | 'box' | '478'
type NoiseTrack = { id: string; label: string; description: string; src: string }

const presets = [5 * 60, 10 * 60, 20 * 60, 30 * 60]
const noiseTracks: NoiseTrack[] = [
  { id: 'waves', label: 'Waves', description: 'Rolling coastal waves', src: '/audio/47-Waves-10min.mp3' },
  { id: 'ocean', label: 'Ocean', description: 'Deep, steady ocean', src: '/audio/25-Ocean-10min.mp3' },
  { id: 'stream', label: 'Stream', description: 'Flowing freshwater', src: '/audio/30-Stream-10min.mp3' },
  { id: 'rain', label: 'Rain', description: 'Even rainfall', src: '/audio/42-Rain-10min.mp3' },
  { id: 'heater', label: 'Heater', description: 'Warm mechanical hum', src: '/audio/21-Heater-10min.mp3' },
  { id: 'fan', label: 'Fan', description: 'Consistent fan sound', src: '/audio/20-Fan-10min.mp3' },
  { id: 'white-noise', label: 'White noise', description: 'Classic broadband noise', src: '/audio/01-White-Noise-10min.mp3' },
]

export default function MeditationTimer({ user, token, onRequireLogin }: Props) {
  const [seconds, setSeconds] = useState(presets[1])
  const [running, setRunning] = useState(false)
  const [showMoodRating, setShowMoodRating] = useState(false)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [completionNote, setCompletionNote] = useState('')
  const [ambientVolume, setAmbientVolume] = useState(45)
  const [selectedTrackId, setSelectedTrackId] = useState(noiseTracks[0].id)
  const [customHours, setCustomHours] = useState(0)
  const [customMinutes, setCustomMinutes] = useState(10)
  const [customSeconds, setCustomSeconds] = useState(0)

  const [breathPattern, setBreathPattern] = useState<BreathPattern>('none')
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale')
  const [breathCount, setBreathCount] = useState(0)

  const selectedDuration = useRef<number>(presets[1])
  const completedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const breathIntervalRef = useRef<number | null>(null)
  const selectedTrack = noiseTracks.find((track) => track.id === selectedTrackId) ?? noiseTracks[0]

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
    const audio = audioRef.current
    if (!audio) return

    if (running) {
      void audio.play().catch(() => {
        setRunning(false)
        setCompletionNote('Sound could not start. Tap Start again to allow audio playback.')
      })
    } else {
      audio.pause()
    }
  }, [running, selectedTrackId])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = ambientVolume / 100
  }, [ambientVolume])

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

    setSessionMinutes(selectedDuration.current / 60)
    setCompletionNote(user && token ? '' : 'Session complete. Create an account when you want to save meditation history and mood check-ins.')
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
      setCompletionNote('Nice reset. Sign in any time to save meditation minutes and mood history.')
    }
  }

  const format = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`

  const toggleRunning = () => {
    if (!running) {
      setCompletionNote('')
      void playStartChime()
    } else {
      void playPauseChime()
    }
    setRunning((value) => !value)
  }

  const setDuration = (duration: number) => {
    const safeDuration = Math.max(1, Math.floor(duration))
    setSeconds(safeDuration)
    selectedDuration.current = safeDuration
    setRunning(false)
    setShowMoodRating(false)
    setCompletionNote('')
  }

  const applyCustomDuration = () => {
    setDuration(customHours * 3600 + customMinutes * 60 + customSeconds)
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Guided Calm Window</h2>
        <p>Choose a calming sound and set a meditation timer that fits your day.</p>
        <div className="session-reward">A five-minute reset completes your calm ritual and softens the day.</div>
      </div>
      <div className="timer-display">{format(Math.max(0, seconds))}</div>
      <div className="controls">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setDuration(preset)
            }}
          >
            {preset / 60} min
          </button>
        ))}
      </div>
      <div className="meditation-settings">
        <div className="custom-timer-panel">
          <div>
            <strong>Custom timer</strong>
            <p className="muted">Set hours, minutes, and seconds.</p>
          </div>
          <div className="custom-time-inputs">
            <label>
              <span>Hours</span>
              <input type="number" min={0} max={23} value={customHours} onChange={(event) => setCustomHours(Math.min(23, Math.max(0, Number(event.target.value))))} />
            </label>
            <label>
              <span>Minutes</span>
              <input type="number" min={0} max={59} value={customMinutes} onChange={(event) => setCustomMinutes(Math.min(59, Math.max(0, Number(event.target.value))))} />
            </label>
            <label>
              <span>Seconds</span>
              <input type="number" min={0} max={59} value={customSeconds} onChange={(event) => setCustomSeconds(Math.min(59, Math.max(0, Number(event.target.value))))} />
            </label>
          </div>
          <button type="button" onClick={applyCustomDuration}>Set timer</button>
        </div>
        <div className="noise-picker">
          <strong>Background sound</strong>
          <div className="noise-track-grid">
            {noiseTracks.map((track) => (
              <button
                key={track.id}
                type="button"
                className={`noise-track ${selectedTrackId === track.id ? 'active' : ''}`}
                onClick={() => setSelectedTrackId(track.id)}
                aria-pressed={selectedTrackId === track.id}
              >
                <span>{track.label}</span>
                <small>{track.description}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={selectedTrack.src} loop preload="metadata" />
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
      <label className="volume-control">
        <span>Ambient volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={ambientVolume}
          onChange={(event) => setAmbientVolume(Number(event.target.value))}
          aria-valuetext={`${ambientVolume}%`}
        />
        <strong>{ambientVolume}%</strong>
      </label>
      <div className="controls">
        <button onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
        <button
          onClick={() => {
            setRunning(false)
            setSeconds(selectedDuration.current)
            if (audioRef.current) audioRef.current.currentTime = 0
          }}
        >
          Reset
        </button>
      </div>
      <p className="muted">{selectedTrack.label} will loop gently until the timer ends. A soft bell marks completion.</p>
      {completionNote && <p className="muted">{completionNote}</p>}

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
