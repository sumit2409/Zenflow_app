import React, { useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../utils/api'
import { type ProfileMeta } from '../utils/profile'
import {
  addPlannerItem,
  defaultReminderTimes,
  formatPlannerDate,
  getPlannerEntries,
  getRequiredReminderLabel,
  getReminderTimes,
  movePlannerItem,
  parsePlannerDate,
  removePlannerItem,
  schedulePlannerNotifications,
  shiftPlannerDate,
  updatePlannerCompletion,
  type PlannerMeta,
  type PlannerRepeat,
  type RequiredPlannerTaskKey,
} from '../utils/planner'
import { todayKey } from '../utils/wellness'

type Props = {
  initialDate?: string
  user: string | null
  token?: string | null
  onRequireLogin?: () => void
  onMetaSaved?: () => void
}

type CalendarMode = 'day' | 'week' | 'month' | 'year'

const requiredTaskOrder: RequiredPlannerTaskKey[] = ['water', 'exercise', 'meditation']
const calendarModes: CalendarMode[] = ['day', 'week', 'month', 'year']

function getStartOfWeek(dateKey: string) {
  const date = parsePlannerDate(dateKey)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekDates(dateKey: string) {
  const start = getStartOfWeek(dateKey)
  return Array.from({ length: 7 }, (_, index) => shiftPlannerDate(start, index))
}

function getMonthCells(dateKey: string) {
  const anchor = parsePlannerDate(dateKey)
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  firstDay.setDate(firstDay.getDate() - offset)

  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(firstDay)
    cell.setDate(firstDay.getDate() + index)
    const cellKey = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`
    return {
      dateKey: cellKey,
      inMonth: cell.getMonth() === month,
      dayNumber: cell.getDate(),
    }
  })
}

function getYearMonths(dateKey: string) {
  const year = parsePlannerDate(dateKey).getFullYear()
  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(year, index, 1)
    return {
      key: `${year}-${String(index + 1).padStart(2, '0')}-01`,
      label: monthDate.toLocaleDateString(undefined, { month: 'long' }),
    }
  })
}

function formatWeekdayShort(dateKey: string) {
  return parsePlannerDate(dateKey).toLocaleDateString(undefined, { weekday: 'short' })
}

function getDaySummary(dateKey: string, planner: PlannerMeta | undefined) {
  const entries = getPlannerEntries(dateKey, planner)
  const required = entries.filter((entry) => entry.required)
  const requiredCompleted = required.filter((entry) => entry.completed).length
  const customCount = entries.filter((entry) => !entry.required).length
  const completedCount = entries.filter((entry) => entry.completed).length

  return {
    entries,
    requiredCompleted,
    requiredTotal: required.length,
    customCount,
    completedCount,
  }
}

export default function PlannerBoard({ initialDate, user, token, onRequireLogin, onMetaSaved }: Props) {
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [selectedDate, setSelectedDate] = useState(initialDate || todayKey())
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week')
  const [customTitle, setCustomTitle] = useState('')
  const [customTime, setCustomTime] = useState('12:00')
  const [customDate, setCustomDate] = useState(todayKey())
  const [customRepeat, setCustomRepeat] = useState<PlannerRepeat>('once')
  const [saveMessage, setSaveMessage] = useState('Reminders are ready to configure.')
  const [isSaving, setIsSaving] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)

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
    setCustomDate(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      setCalendarMode('day')
    }
  }, [initialDate])

  const planner = meta.planner || { remindersEnabled: true, reminderTimes: defaultReminderTimes, customItems: [], completions: {} }
  const reminderTimes = getReminderTimes(planner)
  const selectedSummary = useMemo(() => getDaySummary(selectedDate, planner), [planner, selectedDate])
  const plannerEntries = selectedSummary.entries
  const requiredEntries = plannerEntries.filter((entry) => entry.required)
  const customEntries = plannerEntries.filter((entry) => !entry.required)
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const monthCells = useMemo(() => getMonthCells(selectedDate), [selectedDate])
  const yearMonths = useMemo(() => getYearMonths(selectedDate), [selectedDate])
  const quickDates = useMemo(() => Array.from({ length: 4 }, (_, index) => shiftPlannerDate(todayKey(), index)), [])

  async function persistPlanner(nextPlanner: PlannerMeta, message: string) {
    const previousPlanner = meta.planner
    setMeta((current) => ({ ...current, planner: nextPlanner }))
    if (!user || !token) {
      onRequireLogin?.()
      return
    }

    setIsSaving(true)
    setSaveMessage('Saving planner...')
    try {
      const response = await fetch(apiUrl('/api/meta'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ meta: { planner: nextPlanner } }),
      })
      if (!response.ok) {
        throw new Error(`Planner save failed with status ${response.status}`)
      }
      await schedulePlannerNotifications(nextPlanner)
      setSaveMessage(message)
      onMetaSaved?.()
    } catch (error) {
      console.error(error)
      setMeta((current) => ({ ...current, planner: previousPlanner }))
      setSaveMessage('Planner save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleEntry(taskId: string, completed: boolean) {
    const nextPlanner = updatePlannerCompletion(planner, selectedDate, taskId, completed)
    await persistPlanner(nextPlanner, completed ? 'Task marked complete. Progress and reminders updated.' : 'Task reopened. Reminders restored.')
  }

  async function saveReminderTime(key: RequiredPlannerTaskKey, value: string) {
    const nextPlanner: PlannerMeta = {
      ...planner,
      remindersEnabled: planner.remindersEnabled ?? true,
      reminderTimes: {
        ...reminderTimes,
        [key]: value,
      },
      customItems: [...(planner.customItems || [])],
      completions: { ...(planner.completions || {}) },
    }
    await persistPlanner(nextPlanner, 'Daily reminder times updated.')
  }

  async function addCustomTask() {
    if (!customTitle.trim()) {
      setSaveMessage('Add a task title before saving a reminder.')
      return
    }

    const nextPlanner = addPlannerItem(planner, {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      date: customDate,
      time: customTime,
      repeat: customRepeat,
    })

    setCustomTitle('')
    setCustomRepeat('once')
    await persistPlanner(nextPlanner, customRepeat === 'daily' ? 'Daily repeating task added.' : 'Planner task added.')
  }

  async function removeCustomTask(taskId: string) {
    const nextPlanner = removePlannerItem(planner, taskId)
    await persistPlanner(nextPlanner, 'Planner task removed.')
  }

  async function moveTask(taskId: string, nextDate: string) {
    const nextPlanner = movePlannerItem(planner, taskId, nextDate)
    setSelectedDate(nextDate)
    await persistPlanner(nextPlanner, `Task moved to ${formatPlannerDate(nextDate)}.`)
  }

  async function toggleReminders(enabled: boolean) {
    const nextPlanner: PlannerMeta = {
      ...planner,
      remindersEnabled: enabled,
      reminderTimes,
      customItems: [...(planner.customItems || [])],
      completions: { ...(planner.completions || {}) },
    }
    await persistPlanner(nextPlanner, enabled ? 'Reminders enabled.' : 'Reminders paused.')
  }

  async function enableReminderPermissions() {
    try {
      await schedulePlannerNotifications(planner)
      setSaveMessage('Notifications are enabled and scheduled.')
    } catch (error) {
      console.error(error)
      setSaveMessage('Notification setup failed.')
    }
  }

  const monthlySnapshot = monthCells.filter((cell) => cell.inMonth).map((cell) => ({ ...cell, summary: getDaySummary(cell.dateKey, planner) }))
  const monthRequiredDone = monthlySnapshot.reduce((sum, cell) => sum + cell.summary.requiredCompleted, 0)
  const monthRequiredTotal = monthlySnapshot.reduce((sum, cell) => sum + cell.summary.requiredTotal, 0)

  function bindDrop(dateKey: string) {
    return {
      onDragOver: (event: React.DragEvent<HTMLElement>) => {
        if (!dragTaskId) return
        event.preventDefault()
      },
      onDrop: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault()
        const taskId = event.dataTransfer.getData('text/planner-task') || dragTaskId
        if (!taskId) return
        setDragTaskId(null)
        void moveTask(taskId, dateKey)
      },
    }
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Planner</h2>
        <p>Run your day from one place with required habits, timed tasks, and repeat rules that show up across daily, weekly, monthly, and yearly views.</p>
        <div className="session-reward">Water, exercise, and meditation stay in the planner every day. You can add one-time or daily repeating tasks around them.</div>
      </div>

      <div className="planner-layout planner-layout-wide">
        <section className="planner-card card inset-card planner-calendar-card">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Calendar</div>
              <h3>{calendarMode === 'year' ? parsePlannerDate(selectedDate).getFullYear() : formatPlannerDate(selectedDate)}</h3>
            </div>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </div>

          <div className="planner-date-strip">
            {quickDates.map((dateKey) => (
              <button
                key={dateKey}
                className={`planner-date-chip ${selectedDate === dateKey ? 'active' : ''}`}
                onClick={() => setSelectedDate(dateKey)}
              >
                {dateKey === todayKey() ? 'Today' : formatPlannerDate(dateKey)}
              </button>
            ))}
          </div>

          <div className="planner-view-toggle">
            {calendarModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`planner-mode-chip ${calendarMode === mode ? 'active' : ''}`}
                onClick={() => setCalendarMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="mini-stats planner-stats">
            <div>
              <strong>{selectedSummary.requiredCompleted}/{selectedSummary.requiredTotal}</strong>
              <span>Required done</span>
            </div>
            <div>
              <strong>{selectedSummary.customCount}</strong>
              <span>Custom tasks</span>
            </div>
            <div>
              <strong>{monthRequiredTotal === 0 ? 0 : Math.round((monthRequiredDone / monthRequiredTotal) * 100)}%</strong>
              <span>Month routine</span>
            </div>
          </div>

          {calendarMode === 'day' && (
            <div className="planner-day-board">
              <div className="planner-section-head">
                <div className="section-kicker">Selected day</div>
                <span className="muted">{formatPlannerDate(selectedDate)}</span>
              </div>
              <div className="planner-task-list">
                {plannerEntries.map((entry) => (
                  <div key={entry.id} className={`planner-item ${entry.completed ? 'done' : ''} ${entry.required ? 'required' : ''}`}>
                    <input
                      type="checkbox"
                      checked={entry.completed}
                      onChange={(event) => void toggleEntry(entry.id, event.target.checked)}
                      disabled={isSaving}
                    />
                    <div className="planner-item-copy">
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.time} {entry.required ? 'Required every day' : entry.repeat === 'daily' ? 'Repeats daily' : 'One-time task'}
                      </span>
                    </div>
                    {!entry.required && (
                      <button type="button" className="ghost-btn" onClick={() => void removeCustomTask(entry.id)} disabled={isSaving}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {calendarMode === 'week' && (
            <div className="planner-week-grid">
              {weekDates.map((dateKey) => {
                const summary = getDaySummary(dateKey, planner)
                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`planner-week-card ${selectedDate === dateKey ? 'active' : ''}`}
                    onClick={() => setSelectedDate(dateKey)}
                    {...bindDrop(dateKey)}
                  >
                    <span className="planner-weekday">{formatWeekdayShort(dateKey)}</span>
                    <strong>{parsePlannerDate(dateKey).getDate()}</strong>
                    <span>{summary.requiredCompleted}/{summary.requiredTotal} required</span>
                    <span>{summary.customCount} custom</span>
                  </button>
                )
              })}
            </div>
          )}

          {calendarMode === 'month' && (
            <div className="planner-month-board">
              <div className="planner-month-head">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="planner-month-grid">
                {monthCells.map((cell) => {
                  const summary = getDaySummary(cell.dateKey, planner)
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      className={`planner-month-cell ${cell.inMonth ? '' : 'outside'} ${selectedDate === cell.dateKey ? 'active' : ''}`}
                      onClick={() => setSelectedDate(cell.dateKey)}
                      {...bindDrop(cell.dateKey)}
                    >
                      <strong>{cell.dayNumber}</strong>
                      <span>{summary.requiredCompleted}/{summary.requiredTotal}</span>
                      <small>{summary.customCount} tasks</small>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {calendarMode === 'year' && (
            <div className="planner-year-grid">
              {yearMonths.map((month) => {
                const monthDays = getMonthCells(month.key).filter((cell) => cell.inMonth)
                const requiredDone = monthDays.reduce((sum, cell) => sum + getDaySummary(cell.dateKey, planner).requiredCompleted, 0)
                const requiredTotal = monthDays.reduce((sum, cell) => sum + getDaySummary(cell.dateKey, planner).requiredTotal, 0)
                const customCount = monthDays.reduce((sum, cell) => sum + getDaySummary(cell.dateKey, planner).customCount, 0)
                return (
                  <button
                    key={month.key}
                    type="button"
                    className="planner-year-card"
                    onClick={() => {
                      setSelectedDate(month.key)
                      setCalendarMode('month')
                    }}
                  >
                    <strong>{month.label}</strong>
                    <span>{requiredTotal === 0 ? 0 : Math.round((requiredDone / requiredTotal) * 100)}% routine complete</span>
                    <small>{customCount} scheduled custom tasks</small>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="planner-card card inset-card">
          <div className="section-kicker">Daily agenda</div>
          <div className="planner-reminder-toggle">
            <label className="check-row">
              <input
                type="checkbox"
                checked={planner.remindersEnabled !== false}
                onChange={(event) => void toggleReminders(event.target.checked)}
                disabled={isSaving}
              />
              <span>Enable reminders</span>
            </label>
            <button onClick={() => void enableReminderPermissions()} disabled={isSaving}>Refresh schedule</button>
          </div>

          <div className="planner-section-head">
            <div className="section-kicker">Required every day</div>
            <span className="muted">These habits always appear and keep reminding until completed.</span>
          </div>
          <div className="planner-task-list">
            {requiredEntries.map((entry) => (
              <div key={entry.id} className={`planner-item ${entry.completed ? 'done' : ''} required`}>
                <input
                  type="checkbox"
                  checked={entry.completed}
                  onChange={(event) => void toggleEntry(entry.id, event.target.checked)}
                  disabled={isSaving}
                />
                <div className="planner-item-copy">
                  <strong>{entry.title}</strong>
                  <span>{entry.time} Required every day</span>
                </div>
              </div>
            ))}
          </div>

          <div className="planner-section-head planner-section-spaced">
            <div className="section-kicker">Selected date tasks</div>
            <span className="muted">{formatPlannerDate(selectedDate)}</span>
          </div>
          <div className="planner-task-list">
            {customEntries.length > 0 ? customEntries.map((entry) => (
              <div key={entry.id} className={`planner-item ${entry.completed ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={entry.completed}
                  onChange={(event) => void toggleEntry(entry.id, event.target.checked)}
                  disabled={isSaving}
                />
                <div
                  className="planner-item-copy planner-item-draggable"
                  draggable
                  onDragStart={(event) => {
                    setDragTaskId(entry.id)
                    event.dataTransfer.setData('text/planner-task', entry.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDragTaskId(null)}
                >
                  <strong>{entry.title}</strong>
                  <span>{entry.repeat === 'daily' ? `Daily at ${entry.time}` : `${formatPlannerDate(entry.date)} at ${entry.time}`}</span>
                </div>
                <button type="button" className="ghost-btn" onClick={() => void removeCustomTask(entry.id)} disabled={isSaving}>Remove</button>
              </div>
            )) : (
              <div className="empty-panel">
                <h4>No custom tasks</h4>
                <p>Use the form below to add one-time tasks or daily repeating items that will appear across the calendar.</p>
              </div>
            )}
          </div>
        </section>

        <section className="planner-card card inset-card">
          <div className="section-kicker">Required reminders</div>
          <div className="planner-time-grid">
            {requiredTaskOrder.map((taskKey) => (
              <label key={taskKey}>
                {taskKey[0].toUpperCase() + taskKey.slice(1)}
                <input
                  type="time"
                  value={reminderTimes[taskKey]}
                  onChange={(event) => void saveReminderTime(taskKey, event.target.value)}
                  disabled={isSaving}
                />
              </label>
            ))}
          </div>
          <div className="planner-cadence-grid">
            {requiredTaskOrder.map((taskKey) => (
              <article key={taskKey} className="planner-cadence-card">
                <strong>{taskKey[0].toUpperCase() + taskKey.slice(1)}</strong>
                <span>Starts at {reminderTimes[taskKey]}</span>
                <p>{getRequiredReminderLabel(taskKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="planner-card card inset-card planner-add-card">
          <div className="section-kicker">Add task</div>
          <div className="planner-form planner-form-wide">
            <label>
              Task
              <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Add a planner task" disabled={isSaving} />
            </label>
            <label>
              Starts on
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} disabled={isSaving} />
            </label>
            <label>
              Time
              <input type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} disabled={isSaving} />
            </label>
            <label>
              Repeat
              <select value={customRepeat} onChange={(event) => setCustomRepeat(event.target.value as PlannerRepeat)} disabled={isSaving}>
                <option value="once">One time</option>
                <option value="daily">Daily</option>
              </select>
            </label>
          </div>
          <div className="controls">
            <button onClick={() => void addCustomTask()} disabled={isSaving}>Add task</button>
          </div>
          <p className="muted">{saveMessage}</p>
        </section>
      </div>
    </div>
  )
}
