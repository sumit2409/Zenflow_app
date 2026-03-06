import React, { useEffect, useMemo, useRef, useState } from 'react'
import { playPauseChime, playPomodoroCompleteChime, playStartChime } from '../utils/sound'
import { todayKey } from '../utils/wellness'
import { type ProfileMeta, type TodoItem } from '../utils/profile'
import { apiUrl } from '../utils/api'

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

type Props = {
  user: string | null
  token?: string | null
  onRequireLogin?: () => void
  onSelect?: (view: string | null) => void
  onSessionComplete?: (minutes: number) => void
}
type Phase = 'work' | 'break'

const DURATION_OPTIONS = [25, 50, 90]
const BONUS_POINTS_PER_TARGET = 120

export default function PomodoroTimer({ user, token, onRequireLogin, onSelect, onSessionComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('work')
  const [workMinutes, setWorkMinutes] = useState(DURATION_OPTIONS[0])
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [seconds, setSeconds] = useState(DURATION_OPTIONS[0] * 60)
  const [running, setRunning] = useState(false)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [sessionTargetDraft, setSessionTargetDraft] = useState('1')
  const [sessionTargetSaving, setSessionTargetSaving] = useState(false)
  const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({})
  const [sessionNotesMap, setSessionNotesMap] = useState<Record<string, string[]>>({})
  const [statusNote, setStatusNote] = useState('Assign a task, set a session goal, and start the cycle.')
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionText, setReflectionText] = useState('')
  const [quickTodoText, setQuickTodoText] = useState('')
  const [quickTodoSaving, setQuickTodoSaving] = useState(false)

  const timerRef = useRef<number | null>(null)
  const lastTickRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('work')
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
        const todayTodos = (todoByDate[todayKey()] || []).map((todo) => ({
          assignedPomodoros: 1,
          completedPomodoros: 0,
          bonusAwarded: false,
          ...todo,
        }))
        setTodoMap(todoByDate)
        setSessionNotesMap((meta as ProfileMeta & { sessionNotes?: Record<string, string[]> }).sessionNotes || {})
        setTodos(todayTodos)
        if (todayTodos.length > 0 && !todayTodos.some((todo) => todo.id === selectedTaskId)) {
          setSelectedTaskId(todayTodos.find((todo) => !todo.done)?.id || todayTodos[0].id)
        }
      } catch (error) {
        console.error(error)
      }
    }

    void loadTasks()
  }, [user, token, selectedTaskId])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (running) {
      lastTickRef.current = Date.now()
      timerRef.current = window.setInterval(() => {
        const now = Date.now()
        const lastTick = lastTickRef.current ?? now
        const elapsedSeconds = Math.floor((now - lastTick) / 1000)
        if (elapsedSeconds <= 0) return

        lastTickRef.current = lastTick + elapsedSeconds * 1000
        setSeconds((value) => Math.max(0, value - elapsedSeconds))
      }, 250)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
      lastTickRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      lastTickRef.current = null
    }
  }, [running])

  useEffect(() => {
    if (seconds > 0) completedRef.current = false
    if (seconds <= 0) setRunning(false)
  }, [seconds])

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

  async function addQuickTask() {
    if (!user || !token) return onRequireLogin?.()
    const trimmedTask = quickTodoText.trim()
    if (!trimmedTask) return

    setQuickTodoSaving(true)
    const nextTodo: TodoItem = {
      id: `focus-${Date.now()}`,
      text: trimmedTask,
      done: false,
      assignedPomodoros: 1,
      completedPomodoros: 0,
      bonusAwarded: false,
    }
    const nextTodos = [...todos, nextTodo]

    try {
      await persistTodos(nextTodos)
      setQuickTodoText('')
      setSelectedTaskId(nextTodo.id)
      setStatusNote('Task added and linked to this focus cycle.')
    } finally {
      setQuickTodoSaving(false)
    }
  }

  async function updateTaskSessions(taskId: string, assignedPomodoros: number) {
    const nextTodos = todos.map((todo) =>
      todo.id === taskId ? { ...todo, assignedPomodoros: Math.max(1, assignedPomodoros) } : todo
    )
    await persistTodos(nextTodos)
  }

  async function persistTaskProgress(taskId: string) {
    const currentTask = todos.find((todo) => todo.id === taskId)
    if (!currentTask) return

    const assignedPomodoros = Math.max(1, currentTask.assignedPomodoros || 1)
    const completedPomodoros = (currentTask.completedPomodoros || 0) + 1
    const cycleFinished = completedPomodoros >= assignedPomodoros
    const nextTodos = todos.map((todo) =>
      todo.id === taskId
        ? {
            ...todo,
            done: cycleFinished ? true : todo.done,
            focusCount: (todo.focusCount || 0) + 1,
            completedPomodoros,
            bonusAwarded: cycleFinished ? true : todo.bonusAwarded,
          }
        : todo
    )

    await persistTodos(nextTodos)

    if (cycleFinished && user && token && !currentTask.bonusAwarded) {
      await fetch(apiUrl('/api/logs'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: todayKey(), type: 'pomodoro_bonus', value: BONUS_POINTS_PER_TARGET }),
      })
      setStatusNote(`Task cycle complete. Bonus +${BONUS_POINTS_PER_TARGET} points awarded.`)
    } else {
      setStatusNote('Focus block saved. Break starts after reflection.')
    }
  }

  function startBreak() {
    setShowReflection(false)
    setReflectionText('')
    setPhase('break')
    setSeconds(Math.max(5, breakMinutes) * 60)
    setRunning(true)
    setStatusNote('Break started. Reset before your next session.')
  }

  async function saveReflection() {
    if (reflectionText.trim() && user && token) {
      try {
        const today = todayKey()
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const nextSessionNotes = {
          ...sessionNotesMap,
          [today]: [...(sessionNotesMap[today] || []), `[${timeLabel}] ${reflectionText.trim()}`],
        }

        await fetch(apiUrl('/api/meta'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({
            meta: {
              sessionNotes: nextSessionNotes,
            },
          }),
        })
        setSessionNotesMap(nextSessionNotes)
      } catch (error) {
        console.error(error)
      }
    }
    startBreak()
  }

  useEffect(() => {
    if (seconds !== 0 || completedRef.current) return
    completedRef.current = true
    void playPomodoroCompleteChime()

    const taskId = selectedTaskId
    const handlePhaseCompletion = async () => {
      if (phaseRef.current === 'work') {
        if (user && token) {
          await fetch(apiUrl('/api/logs'), {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
            body: JSON.stringify({ date: todayKey(), type: 'pomodoro', value: workMinutes }),
          })
          if (taskId) {
            await persistTaskProgress(taskId)
          }
          onSessionComplete?.(workMinutes)
        } else {
          onRequireLogin?.()
        }

        setShowReflection(true)
        setStatusNote('Session complete. Add a one-line reflection, then your break starts.')
        return
      }

      setPhase('work')
      setSeconds(workMinutes * 60)
      setRunning(true)
      setStatusNote(`Break finished. The next ${workMinutes}-minute focus session has started.`)
      void playStartChime()
    }

    void handlePhaseCompletion()
  }, [seconds, user, token, onRequireLogin, selectedTaskId, breakMinutes, todos, workMinutes, onSessionComplete])

  const selectedTask = useMemo(
    () => todos.find((todo) => todo.id === selectedTaskId) || null,
    [todos, selectedTaskId]
  )

  const sessionTarget = Math.max(1, selectedTask?.assignedPomodoros || 1)
  const completedSessions = selectedTask?.completedPomodoros || 0
  const orderedTodos = useMemo(() => [...todos].sort((left, right) => Number(left.done) - Number(right.done)), [todos])

  useEffect(() => {
    setSessionTargetDraft(String(sessionTarget))
  }, [sessionTarget, selectedTaskId])

  const setWorkPhase = () => {
    setPhase('work')
    setSeconds(workMinutes * 60)
    setRunning(false)
    setStatusNote('Focus session reset.')
  }

  const toggleRunning = () => {
    if (!running) {
      void playStartChime()
      setStatusNote(phase === 'work' ? 'Focus session running.' : 'Break running.')
    } else {
      void playPauseChime()
      setStatusNote('Cycle paused.')
    }
    setRunning((value) => !value)
  }

  const saveSessionTarget = async () => {
    if (!selectedTask) return
    const parsed = Number(sessionTargetDraft)
    const normalized = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1
    setSessionTargetDraft(String(normalized))
    if (normalized === sessionTarget) return
    setSessionTargetSaving(true)
    try {
      await updateTaskSessions(selectedTask.id, normalized)
      setStatusNote(`Assigned session target updated to ${normalized}.`)
    } finally {
      setSessionTargetSaving(false)
    }
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Deep Focus Cycle</h2>
        <p>Each task can require one or more focus sessions. Every work block rolls into a break before the next session begins.</p>
        <div className="session-reward">Finish all assigned sessions for a task to unlock a bonus score.</div>
      </div>

      <div className="focus-task-panel card inset-card">
        <div className="section-kicker">Task-linked cycle</div>
        <div className="todo-entry" style={{ marginBottom: '12px' }}>
          <input
            value={quickTodoText}
            onChange={(event) => setQuickTodoText(event.target.value)}
            placeholder="Add a task and start immediately"
          />
          <button onClick={() => void addQuickTask()} disabled={quickTodoSaving}>
            {quickTodoSaving ? 'Saving...' : 'Add task'}
          </button>
        </div>
        {todos.length > 0 ? (
          <>
            <label className="task-picker">
              Choose task
              <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
                {orderedTodos.map((todo) => (
                  <option key={todo.id} value={todo.id}>
                    {todo.done ? '[Done] ' : ''}{todo.text}
                  </option>
                ))}
              </select>
            </label>

            {selectedTask && (
              <div className="pomodoro-cycle-grid">
                <label>
                  Assigned sessions
                  <div className="session-target-editor">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={sessionTargetDraft}
                      onChange={(event) => setSessionTargetDraft(event.target.value)}
                      onBlur={() => void saveSessionTarget()}
                    />
                    <button type="button" onClick={() => void saveSessionTarget()} disabled={sessionTargetSaving}>
                      {sessionTargetSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </label>
                <label>
                  Break minutes
                  <input
                    type="number"
                    min={5}
                    value={breakMinutes}
                    onChange={(event) => setBreakMinutes(Math.max(5, Number(event.target.value) || 5))}
                  />
                </label>
              </div>
            )}

            <div className="task-mini-list">
              {orderedTodos.slice(0, 4).map((todo) => (
                <div key={todo.id} className={`todo-item dashboard postit-note ${todo.done ? 'done' : ''}`}>
                  <span>{todo.text}</span>
                  <div className="task-meta-chip">
                    {(todo.completedPomodoros || 0)}/{Math.max(1, todo.assignedPomodoros || 1)} sessions
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-panel">
            <h4>No tasks linked yet</h4>
            <p>Use the field above to add a task, then start a focus block from this screen.</p>
          </div>
        )}
      </div>

      <div className="cycle-panel card inset-card">
        <div className="section-heading">
          <div>
            <div className="section-kicker">{phase === 'work' ? 'Work session' : 'Break session'}</div>
            <h3>{phase === 'work' ? 'Focus on the selected task' : 'Reset before the next focus block'}</h3>
          </div>
          {selectedTask && (
            <div className="task-meta-chip">
              {completedSessions}/{sessionTarget} sessions complete
            </div>
          )}
        </div>

        <div className="controls">
          {DURATION_OPTIONS.map((mins) => (
            <button
              key={mins}
              type="button"
              className={`difficulty-chip ${workMinutes === mins ? 'active' : ''}`}
              disabled={running}
              onClick={() => {
                setWorkMinutes(mins)
                setSeconds(mins * 60)
                setPhase('work')
                setRunning(false)
                setStatusNote(`Session length set to ${mins} minutes.`)
              }}
            >
              {mins} min
            </button>
          ))}
        </div>

        <div className="timer-display">{formatTime(Math.max(0, seconds))}</div>
        <p className="muted">{statusNote}</p>

        <div className="controls">
          <button onClick={toggleRunning}>{running ? 'Pause cycle' : phase === 'work' ? 'Start cycle' : 'Resume break'}</button>
          <button onClick={setWorkPhase}>Reset to work</button>
        </div>

        {phase === 'break' && (
          <div className="break-ideas">
            <div className="achievement-pill unlocked">
              <strong>Move</strong>
              <span>Walk, stretch, or drink water while the break timer runs.</span>
            </div>
            <div className="achievement-pill unlocked">
              <strong>Quick game</strong>
              <span>Open the Games room for a fast reset, then come back for the next session.</span>
            </div>
            <div className="controls">
              <button onClick={() => onSelect?.('breakroom')}>Open break room</button>
              <button onClick={() => onSelect?.('planner')}>Open planner</button>
            </div>
          </div>
        )}
      </div>

      {showReflection && (
        <div className="reflection-overlay">
          <div className="reflection-card card">
            <div className="section-kicker">Session complete</div>
            <h3>What did you finish?</h3>
            <p className="muted">One sentence. Then your break starts.</p>
            <textarea
              className="intention-input"
              style={{ minHeight: '80px' }}
              placeholder="e.g. Finished the auth bug fix, drafted intro paragraph..."
              value={reflectionText}
              onChange={(event) => setReflectionText(event.target.value)}
              autoFocus
            />
            <div className="controls">
              <button className="primary-cta" onClick={() => void saveReflection()}>
                Save and start break
              </button>
              <button className="ghost-btn" onClick={startBreak}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
