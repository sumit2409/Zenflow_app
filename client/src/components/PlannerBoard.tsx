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
  removePlannerItem,
  schedulePlannerNotifications,
  updatePlannerCompletion,
  type PlannerMeta,
  type RequiredPlannerTaskKey,
} from '../utils/planner'
import { todayKey } from '../utils/wellness'

type Props = {
  user: string | null
  token?: string | null
  onRequireLogin?: () => void
  onMetaSaved?: () => void
}

const requiredTaskOrder: RequiredPlannerTaskKey[] = ['water', 'exercise', 'meditation']

export default function PlannerBoard({ user, token, onRequireLogin, onMetaSaved }: Props) {
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [customTitle, setCustomTitle] = useState('')
  const [customTime, setCustomTime] = useState('12:00')
  const [customDate, setCustomDate] = useState(todayKey())
  const [saveMessage, setSaveMessage] = useState('Reminders are ready to configure.')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user || !token) return
      try {
        const response = await fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const payload = await response.json()
        const nextMeta = payload.meta || {}
        setMeta(nextMeta)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [user, token])

  const planner = meta.planner || { remindersEnabled: true, reminderTimes: defaultReminderTimes, customItems: [], completions: {} }
  const reminderTimes = getReminderTimes(planner)
  const plannerEntries = useMemo(() => getPlannerEntries(selectedDate, planner), [planner, selectedDate])
  const requiredEntries = plannerEntries.filter((entry) => entry.required)
  const customEntries = plannerEntries.filter((entry) => !entry.required)
  const requiredCompleted = requiredEntries.filter((entry) => entry.completed).length
  const quickDates = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => {
      const nextDate = new Date()
      nextDate.setHours(0, 0, 0, 0)
      nextDate.setDate(nextDate.getDate() + index)
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
    })
  }, [])

  useEffect(() => {
    setCustomDate(selectedDate)
  }, [selectedDate])

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

  async function toggleRequired(taskId: string, completed: boolean) {
    const nextPlanner = updatePlannerCompletion(planner, selectedDate, taskId, completed)
    await persistPlanner(nextPlanner, completed ? 'Task marked complete. Pending reminders were updated.' : 'Task marked incomplete. Reminders restored.')
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
    })
    setCustomTitle('')
    await persistPlanner(nextPlanner, 'Planner task added.')
  }

  async function removeCustomTask(taskId: string) {
    const nextPlanner = removePlannerItem(planner, taskId)
    await persistPlanner(nextPlanner, 'Planner task removed.')
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

  return (
    <div>
      <div className="module-meta">
        <h2>Planner</h2>
        <p>Water, exercise, and meditation are included every day. Add extra reminders with your own date and time.</p>
        <div className="session-reward">Required daily items keep sending reminders until you tick them complete.</div>
      </div>

      <div className="planner-layout">
        <section className="planner-card card inset-card">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Daily schedule</div>
              <h3>{selectedDate === todayKey() ? 'Today' : formatPlannerDate(selectedDate)}</h3>
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

          <div className="mini-stats planner-stats">
            <div>
              <strong>{requiredCompleted}/3</strong>
              <span>Required done</span>
            </div>
            <div>
              <strong>{customEntries.length}</strong>
              <span>Custom items</span>
            </div>
            <div>
              <strong>{planner.remindersEnabled === false ? 'Off' : 'On'}</strong>
              <span>Reminders</span>
            </div>
          </div>

          <div className="planner-reminder-toggle">
            <label className="check-row">
              <input
                type="checkbox"
                checked={planner.remindersEnabled !== false}
                onChange={(event) => void toggleReminders(event.target.checked)}
                disabled={isSaving}
              />
              <span>Enable repeating reminders</span>
            </label>
            <button onClick={() => void enableReminderPermissions()} disabled={isSaving}>Refresh notification schedule</button>
          </div>

          <div className="planner-section-head">
            <div className="section-kicker">Required every day</div>
            <span className="muted">These reminders repeat until completed.</span>
          </div>
          <div className="planner-task-list">
            {requiredEntries.map((entry) => (
              <div key={entry.id} className={`planner-item ${entry.completed ? 'done' : ''} ${entry.required ? 'required' : ''}`}>
                <input
                  type="checkbox"
                  checked={entry.completed}
                  onChange={(event) => void toggleRequired(entry.id, event.target.checked)}
                  disabled={isSaving}
                />
                <div className="planner-item-copy">
                  <strong>{entry.title}</strong>
                  <span>{entry.time} {entry.required ? 'Required every day' : 'Custom reminder'}</span>
                </div>
                {!entry.required && (
                  <button type="button" className="ghost-btn" onClick={() => void removeCustomTask(entry.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>

          <div className="planner-section-head planner-section-spaced">
            <div className="section-kicker">Custom reminders</div>
            <span className="muted">Add reminders for specific tasks, dates, and times.</span>
          </div>
          <div className="planner-task-list">
            {customEntries.length > 0 ? customEntries.map((entry) => (
              <div key={entry.id} className={`planner-item ${entry.completed ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={entry.completed}
                  onChange={(event) => void toggleRequired(entry.id, event.target.checked)}
                  disabled={isSaving}
                />
                <div className="planner-item-copy">
                  <strong>{entry.title}</strong>
                  <span>{formatPlannerDate(entry.date)} at {entry.time}</span>
                </div>
                <button type="button" className="ghost-btn" onClick={() => void removeCustomTask(entry.id)} disabled={isSaving}>Remove</button>
              </div>
            )) : (
              <div className="empty-panel">
                <h4>No custom reminders</h4>
                <p>Add tasks below for calls, study sessions, appointments, or anything else with a date and time.</p>
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
          <p className="muted">These items appear every day in the planner and continue to remind you until you check them off.</p>
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
          <div className="section-kicker">Add planner item</div>
          <div className="planner-form">
            <label>
              Task
              <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Add a reminder task" disabled={isSaving} />
            </label>
            <label>
              Date
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} disabled={isSaving} />
            </label>
            <label>
              Time
              <input type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} disabled={isSaving} />
            </label>
          </div>
          <div className="controls">
            <button onClick={() => void addCustomTask()} disabled={isSaving}>Add reminder</button>
          </div>
          <p className="muted">{saveMessage}</p>
        </section>
      </div>
    </div>
  )
}
