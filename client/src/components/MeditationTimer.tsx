import React, { useState, useEffect, useRef } from 'react'
import { createMeditationAmbience, playEndChime, playStartChime } from '../utils/sound'
import { apiUrl } from '../utils/api'

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

export default function MeditationTimer({ user, token, onRequireLogin }: Props) {
  const presets = [3 * 60, 5 * 60, 10 * 60]
  const [seconds, setSeconds] = useState(presets[0])
  const [running, setRunning] = useState(false)
  const currentPreset = useRef<number>(presets[0])
  const completedRef = useRef(false)
  const ambienceRef = useRef(createMeditationAmbience())

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds(s => s - 1), 1000)
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
    if (seconds !== 0 || completedRef.current) return
    completedRef.current = true
    void playEndChime()

    const minutes = currentPreset.current / 60
    if (user && token) {
      fetch(apiUrl('/api/logs'), {method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${token}`}, body: JSON.stringify({date: todayKey(), type:'meditation', value: minutes})}).catch(e=>console.error(e))
    } else {
      onRequireLogin?.()
    }
  }, [seconds, user, token, onRequireLogin])

  const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`

  const toggleRunning = () => {
    if (!running) void playStartChime()
    setRunning(r => !r)
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
        {presets.map(p => (
          <button key={p} onClick={() => { setSeconds(p); currentPreset.current = p; setRunning(false) }}>{p / 60} min</button>
        ))}
      </div>
      <div className="controls">
        <button onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
        <button onClick={() => { setRunning(false); setSeconds(presets[0]); currentPreset.current = presets[0] }}>Reset</button>
      </div>
      <div className="pulse" aria-hidden />
    </div>
  )
}
