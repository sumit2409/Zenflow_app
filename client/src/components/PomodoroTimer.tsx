import React, { useState, useRef, useEffect } from 'react'
import { playEndChime, playStartChime } from '../utils/sound'
import { todayKey } from '../utils/wellness'
import { type ProfileMeta, type TodoItem } from '../utils/profile'
import { apiUrl } from '../utils/api'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

export default function PomodoroTimer({ user, token, onRequireLogin }: Props) {
  const presets = { work: 25 * 60, short: 5 * 60, long: 15 * 60 }
  const [seconds, setSeconds] = useState(presets.work)
  const [running, setRunning] = useState(false)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({})
  const timerRef = useRef<number | null>(null)
  const currentPreset = useRef<number>(presets.work)
  const completedRef = useRef(false)

  useEffect(() => {
    async function loadTasks() {
      if (!user || !token) {
        setTodos([])
        return
      }
      try {
        const response = await fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const payload = await response.json()
        const meta: ProfileMeta = payload.meta || {}
        const todoByDate = meta.todosByDate || {}
        const todayTodos = todoByDate[todayKey()] || []
        setTodoMap(todoByDate)
        setTodos(todayTodos)
        if (todayTodos.length > 0 && !todayTodos.some((todo) => todo.id === selectedTaskId)) {
          setSelectedTaskId(todayTodos.find((todo) => !todo.done)?.id || todayTodos[0].id)
        }
      } catch (error) {
        console.error(error)
      }
    }

    void loadTasks()
  }, [user, token])

  useEffect(() => {
    if (running) {
      timerRef.current = window.setInterval(() => setSeconds(s => s - 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  useEffect(() => {
    if (seconds > 0) completedRef.current = false
    if (seconds <= 0) setRunning(false)
  }, [seconds])

  useEffect(() => {
    if (seconds !== 0 || completedRef.current) return
    completedRef.current = true
    void playEndChime()

    const minutes = currentPreset.current / 60
    if (user && token) {
      fetch(apiUrl('/api/logs'), {method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${token}`}, body: JSON.stringify({date: todayKey(), type:'pomodoro', value: minutes})}).catch(e=>console.error(e))
      if (selectedTaskId) {
        void persistTaskProgress(selectedTaskId, false)
      }
    } else {
      onRequireLogin?.()
    }
  }, [seconds, user, token, onRequireLogin])

  async function persistTodos(nextTodos: TodoItem[]) {
    setTodos(nextTodos)
    if (!user || !token) return onRequireLogin?.()
    const nextTodoMap = { ...todoMap, [todayKey()]: nextTodos }
    setTodoMap(nextTodoMap)
    await fetch(apiUrl('/api/meta'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ meta: { todosByDate: nextTodoMap } }),
    })
  }

  async function persistTaskProgress(taskId: string, markDone: boolean) {
    const nextTodos = todos.map((todo) =>
      todo.id === taskId
        ? { ...todo, done: markDone ? true : todo.done, focusCount: (todo.focusCount || 0) + (markDone ? 0 : 1) }
        : todo
    )
    await persistTodos(nextTodos)
  }

  const setPreset = (s: number) => { setSeconds(s); currentPreset.current = s; setRunning(false) }

  const toggleRunning = () => {
    if (!running) void playStartChime()
    setRunning(r => !r)
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Deep Focus Session</h2>
        <p>Work in focused intervals and take deliberate breaks to stay mentally fresh.</p>
        <div className="session-reward">Complete a 25-minute block to feed your daily focus ritual.</div>
      </div>
      <div className="focus-task-panel card inset-card">
        <div className="section-kicker">Task-linked focus</div>
        {todos.length > 0 ? (
          <>
            <label className="task-picker">
              Choose task
              <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
                {todos.map((todo) => (
                  <option key={todo.id} value={todo.id}>
                    {todo.done ? '[Done] ' : ''}{todo.text}
                  </option>
                ))}
              </select>
            </label>
            <div className="task-mini-list">
              {todos.slice(0, 4).map((todo) => (
                <div key={todo.id} className={`todo-item dashboard ${todo.done ? 'done' : ''}`}>
                  <span>{todo.text}</span>
                  <div className="task-meta-chip">{todo.focusCount || 0} blocks</div>
                </div>
              ))}
            </div>
            {selectedTaskId && (
              <div className="controls">
                <button onClick={() => void persistTaskProgress(selectedTaskId, true)}>Mark selected task done</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-panel">
            <h4>No tasks linked yet</h4>
            <p>Create tasks in your profile room, then come back here to assign focus sessions to them.</p>
          </div>
        )}
      </div>
      <div className="timer-display">{formatTime(Math.max(0, seconds))}</div>
      <div className="controls">
        <button onClick={() => setPreset(presets.work)}>25 min</button>
        <button onClick={() => setPreset(presets.short)}>5 min</button>
        <button onClick={() => setPreset(presets.long)}>15 min</button>
      </div>
      <div className="controls">
        <button onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
        <button onClick={() => { setRunning(false); setSeconds(presets.work) }}>Reset</button>
      </div>
    </div>
  )
}
