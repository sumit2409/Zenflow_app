import React, { useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../utils/api'
import { getJournalNotes, type ProfileMeta, type TodoItem } from '../utils/profile'
import {
  addPlannerDaySheetItem,
  addPlannerItem,
  defaultReminderTimes,
  formatPlannerDate,
  getPlannerDaySheet,
  getPlannerEntries,
  getRequiredReminderLabel,
  getReminderTimes,
  movePlannerItem,
  parsePlannerDate,
  removePlannerDaySheetItem,
  removePlannerItem,
  schedulePlannerNotifications,
  setPlannerDaySheetWaterIntake,
  setPlannerDaySheetWeather,
  shiftPlannerDate,
  updatePlannerCompletion,
  updatePlannerDaySheetItem,
  type PlannerDaySectionId,
  type PlannerDaySheetItem,
  type PlannerMeta,
  type PlannerRepeat,
  type PlannerWeatherKey,
  type RequiredPlannerTaskKey,
} from '../utils/planner'
import { todayKey } from '../utils/wellness'

type Props = {
  initialDate?: string
  user: string | null
  token?: string | null
  onRequireLogin?: () => void
  onOpenFocusTask?: (taskId: string) => void
  onMetaSaved?: () => void
}

type CalendarMode = 'day' | 'week' | 'month' | 'year'

type PlannerSectionConfig = {
  id: PlannerDaySectionId
  title: string
  subtitle: string
  placeholder: string
  empty: string
  checkable?: boolean
  multiline?: boolean
}

const requiredTaskOrder: RequiredPlannerTaskKey[] = ['water', 'exercise', 'meditation']
const calendarModes: CalendarMode[] = ['day', 'week', 'month', 'year']
const plannerSectionIds: PlannerDaySectionId[] = [
  'important',
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'todo',
  'chores',
  'morning',
  'evening',
  'todayGoals',
  'tomorrowGoals',
  'notes',
]

const plannerSections: Record<PlannerDaySectionId, PlannerSectionConfig> = {
  important: {
    id: 'important',
    title: "Today's important tasks",
    subtitle: 'Keep the real priorities visible.',
    placeholder: 'Add the one thing that really matters',
    empty: 'Pin the tasks you do not want to lose in the noise.',
    checkable: true,
  },
  breakfast: {
    id: 'breakfast',
    title: 'Breakfast',
    subtitle: 'Keep the morning simple.',
    placeholder: 'Breakfast idea or reminder',
    empty: 'Add a quick breakfast plan.',
  },
  lunch: {
    id: 'lunch',
    title: 'Lunch',
    subtitle: 'Protect your midday reset.',
    placeholder: 'Lunch plan',
    empty: 'Add lunch so the day does not get away from you.',
  },
  dinner: {
    id: 'dinner',
    title: 'Dinner',
    subtitle: 'Close the day with intention.',
    placeholder: 'Dinner plan',
    empty: 'Add dinner or an evening meal reminder.',
  },
  snacks: {
    id: 'snacks',
    title: 'Snacks',
    subtitle: 'Keep easy fuel in reach.',
    placeholder: 'Snack idea or prep note',
    empty: 'Add the snacks that help you stay steady.',
  },
  todo: {
    id: 'todo',
    title: "Today's to-do list",
    subtitle: 'Everything that needs a slot.',
    placeholder: 'Add a task for today',
    empty: 'Build the working list for this date.',
    checkable: true,
  },
  chores: {
    id: 'chores',
    title: 'Household routines / chores',
    subtitle: 'Small resets still count.',
    placeholder: 'Add a routine or chore',
    empty: 'Track the chores you want done without holding them in your head.',
    checkable: true,
  },
  morning: {
    id: 'morning',
    title: 'Schedule: morning',
    subtitle: 'Shape the first half of the day.',
    placeholder: 'Morning block or appointment',
    empty: 'Map your morning cadence here.',
    checkable: true,
  },
  evening: {
    id: 'evening',
    title: 'Schedule: evening',
    subtitle: 'Plan the landing, not just the launch.',
    placeholder: 'Evening block or appointment',
    empty: 'Sketch how you want the evening to feel.',
    checkable: true,
  },
  todayGoals: {
    id: 'todayGoals',
    title: "Today's goals",
    subtitle: 'Outcome over busyness.',
    placeholder: 'Add a goal for today',
    empty: 'Write what would make this day feel complete.',
    checkable: true,
  },
  tomorrowGoals: {
    id: 'tomorrowGoals',
    title: "Tomorrow's goals",
    subtitle: 'Leave a softer runway for tomorrow.',
    placeholder: 'Add a goal for tomorrow',
    empty: 'Use this space to lower tomorrow morning friction.',
    checkable: true,
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    subtitle: 'Loose thoughts, reminders, and reflections.',
    placeholder: 'Capture a note, reflection, or prep thought',
    empty: 'This is the scratch space for anything that does not fit elsewhere.',
    multiline: true,
  },
}

const weatherOptions: Array<{ value: PlannerWeatherKey; label: string }> = [
  { value: 'sunny', label: 'Clear' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'rainy', label: 'Rain' },
  { value: 'stormy', label: 'Storm' },
]

function createSectionDrafts() {
  return Object.fromEntries(plannerSectionIds.map((sectionId) => [sectionId, ''])) as Record<PlannerDaySectionId, string>
}

function getItemDraftKey(sectionId: PlannerDaySectionId, itemId: string) {
  return `${sectionId}:${itemId}`
}

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
  const daySheet = getPlannerDaySheet(dateKey, planner)
  const sectionItemCount = plannerSectionIds.reduce((sum, sectionId) => sum + daySheet.sections[sectionId].length, 0)

  return {
    entries,
    requiredCompleted,
    requiredTotal: required.length,
    customCount,
    sectionItemCount,
  }
}

export default function PlannerBoard({ initialDate, user, token, onRequireLogin, onOpenFocusTask, onMetaSaved }: Props) {
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [selectedDate, setSelectedDate] = useState(initialDate || todayKey())
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('day')
  const [customTitle, setCustomTitle] = useState('')
  const [customTime, setCustomTime] = useState('12:00')
  const [customDate, setCustomDate] = useState(todayKey())
  const [customRepeat, setCustomRepeat] = useState<PlannerRepeat>('once')
  const [saveMessage, setSaveMessage] = useState('Your planner sheet is ready.')
  const [isSaving, setIsSaving] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [sectionDrafts, setSectionDrafts] = useState<Record<PlannerDaySectionId, string>>(createSectionDrafts)
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})

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
    setSectionDrafts(createSectionDrafts())
    setItemDrafts({})
  }, [selectedDate])

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      setCalendarMode('day')
    }
  }, [initialDate])

  const planner: PlannerMeta = meta.planner || {
    remindersEnabled: true,
    reminderTimes: defaultReminderTimes,
    customItems: [],
    completions: {},
    daySheets: {},
  }
  const reminderTimes = getReminderTimes(planner)
  const selectedJournalNotes = useMemo(() => getJournalNotes(meta.journals, selectedDate), [meta.journals, selectedDate])
  const selectedSummary = useMemo(() => getDaySummary(selectedDate, planner), [planner, selectedDate])
  const daySheet = useMemo(() => getPlannerDaySheet(selectedDate, planner), [planner, selectedDate])
  const plannerEntries = selectedSummary.entries
  const requiredEntries = plannerEntries.filter((entry) => entry.required)
  const customEntries = plannerEntries.filter((entry) => !entry.required)
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const monthCells = useMemo(() => getMonthCells(selectedDate), [selectedDate])
  const yearMonths = useMemo(() => getYearMonths(selectedDate), [selectedDate])
  const quickDates = useMemo(() => Array.from({ length: 4 }, (_, index) => shiftPlannerDate(todayKey(), index)), [])

  async function persistPlanner(nextPlanner: PlannerMeta, message: string, extraMetaPatch?: Partial<ProfileMeta>) {
    const previousPlanner = meta.planner
    const previousMeta = meta
    setMeta((current) => ({ ...current, planner: nextPlanner, ...(extraMetaPatch || {}) }))
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
        body: JSON.stringify({ meta: { planner: nextPlanner, ...(extraMetaPatch || {}) } }),
      })
      if (!response.ok) {
        throw new Error(`Planner save failed with status ${response.status}`)
      }
      await schedulePlannerNotifications(nextPlanner)
      setSaveMessage(message)
      onMetaSaved?.()
    } catch (error) {
      console.error(error)
      setMeta({ ...previousMeta, planner: previousPlanner })
      setSaveMessage('Planner save failed.')
    } finally {
      setIsSaving(false)
    }
  }

  function openPlannerDate(dateKey: string) {
    setSelectedDate(dateKey)
    setCalendarMode('day')
  }

  async function linkTaskToFocus(task: { id: string; title: string }, dateKey: string) {
    const currentTodos = meta.todosByDate || {}
    const targetTodos = [...(currentTodos[dateKey] || [])]
    const existing = targetTodos.find((todo) => todo.linkedPlannerTaskId === task.id)
    if (existing) {
      setSaveMessage('This planner task is already linked to the focus timer.')
      onOpenFocusTask?.(existing.id)
      return
    }

    const linkedTodo: TodoItem = {
      id: `focus-${task.id}-${Date.now()}`,
      text: task.title,
      done: false,
      assignedPomodoros: 1,
      completedPomodoros: 0,
      bonusAwarded: false,
      linkedPlannerTaskId: task.id,
    }
    const nextTodosByDate = {
      ...currentTodos,
      [dateKey]: [...targetTodos, linkedTodo],
    }

    await persistPlanner(planner, `Linked "${task.title}" to the focus timer for ${formatPlannerDate(dateKey)}.`, {
      todosByDate: nextTodosByDate,
    })
    onOpenFocusTask?.(linkedTodo.id)
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
      daySheets: { ...(planner.daySheets || {}) },
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
      daySheets: { ...(planner.daySheets || {}) },
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

  async function addSectionItem(sectionId: PlannerDaySectionId) {
    const text = sectionDrafts[sectionId].trim()
    if (!text) {
      setSaveMessage(`Add something to ${plannerSections[sectionId].title.toLowerCase()} before saving.`)
      return
    }

    const nextPlanner = addPlannerDaySheetItem(planner, selectedDate, sectionId, {
      id: `sheet-${sectionId}-${Date.now()}`,
      text,
      checked: false,
    })
    setSectionDrafts((current) => ({ ...current, [sectionId]: '' }))
    await persistPlanner(nextPlanner, `${plannerSections[sectionId].title} updated.`)
  }

  async function removeSectionItem(sectionId: PlannerDaySectionId, itemId: string) {
    const draftKey = getItemDraftKey(sectionId, itemId)
    const nextPlanner = removePlannerDaySheetItem(planner, selectedDate, sectionId, itemId)
    setItemDrafts((current) => {
      const nextDrafts = { ...current }
      delete nextDrafts[draftKey]
      return nextDrafts
    })
    await persistPlanner(nextPlanner, `${plannerSections[sectionId].title} updated.`)
  }

  async function commitSectionItem(sectionId: PlannerDaySectionId, item: PlannerDaySheetItem) {
    const draftKey = getItemDraftKey(sectionId, item.id)
    const nextText = (itemDrafts[draftKey] ?? item.text).trim()

    if (!nextText) {
      await removeSectionItem(sectionId, item.id)
      return
    }

    setItemDrafts((current) => {
      const nextDrafts = { ...current }
      delete nextDrafts[draftKey]
      return nextDrafts
    })

    if (nextText === item.text) return

    const nextPlanner = updatePlannerDaySheetItem(planner, selectedDate, sectionId, item.id, { text: nextText })
    await persistPlanner(nextPlanner, `${plannerSections[sectionId].title} updated.`)
  }

  async function toggleSectionItem(sectionId: PlannerDaySectionId, item: PlannerDaySheetItem) {
    const nextPlanner = updatePlannerDaySheetItem(planner, selectedDate, sectionId, item.id, { checked: !item.checked })
    await persistPlanner(nextPlanner, `${plannerSections[sectionId].title} updated.`)
  }

  async function saveWeather(weather: PlannerWeatherKey | null) {
    const nextPlanner = setPlannerDaySheetWeather(planner, selectedDate, weather)
    await persistPlanner(nextPlanner, 'Daily weather saved.')
  }

  async function saveWaterIntake(waterIntake: number) {
    const nextPlanner = setPlannerDaySheetWaterIntake(planner, selectedDate, waterIntake)
    await persistPlanner(nextPlanner, 'Water intake updated.')
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

  function renderDaySection(sectionId: PlannerDaySectionId, extraClassName = '') {
    const config = plannerSections[sectionId]
    const items = daySheet.sections[sectionId]

    return (
      <article key={sectionId} className={`planner-sheet-section ${extraClassName}`.trim()}>
        <div className="planner-sheet-section-head">
          <div>
            <div className="section-kicker">{config.title}</div>
            <p>{config.subtitle}</p>
          </div>
          <span className="planner-section-count">{items.length}</span>
        </div>

        <div className="planner-sheet-list">
          {items.length > 0 ? items.map((item) => {
            const draftKey = getItemDraftKey(sectionId, item.id)
            const inputValue = itemDrafts[draftKey] ?? item.text
            return (
              <div key={item.id} className={`planner-sheet-item ${item.checked ? 'done' : ''}`}>
                {config.checkable ? (
                  <button
                    type="button"
                    className={`planner-sheet-check ${item.checked ? 'active' : ''}`}
                    onClick={() => void toggleSectionItem(sectionId, item)}
                    disabled={isSaving}
                    aria-label={item.checked ? `Mark ${config.title} item as not done` : `Mark ${config.title} item as done`}
                  >
                    {item.checked ? 'Done' : 'Open'}
                  </button>
                ) : null}
                {config.multiline ? (
                  <textarea
                    rows={2}
                    value={inputValue}
                    onChange={(event) => setItemDrafts((current) => ({ ...current, [draftKey]: event.target.value }))}
                    onBlur={() => void commitSectionItem(sectionId, item)}
                    placeholder={config.placeholder}
                    disabled={isSaving}
                  />
                ) : (
                  <input
                    value={inputValue}
                    onChange={(event) => setItemDrafts((current) => ({ ...current, [draftKey]: event.target.value }))}
                    onBlur={() => void commitSectionItem(sectionId, item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    placeholder={config.placeholder}
                    disabled={isSaving}
                  />
                )}
                <button
                  type="button"
                  className="planner-sheet-remove"
                  onClick={() => void removeSectionItem(sectionId, item.id)}
                  disabled={isSaving}
                >
                  Remove
                </button>
              </div>
            )
          }) : (
            <div className="planner-sheet-empty">{config.empty}</div>
          )}
        </div>

        <div className="planner-sheet-add">
          {config.multiline ? (
            <textarea
              rows={2}
              value={sectionDrafts[sectionId]}
              onChange={(event) => setSectionDrafts((current) => ({ ...current, [sectionId]: event.target.value }))}
              placeholder={config.placeholder}
              disabled={isSaving}
            />
          ) : (
            <input
              value={sectionDrafts[sectionId]}
              onChange={(event) => setSectionDrafts((current) => ({ ...current, [sectionId]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void addSectionItem(sectionId)
                }
              }}
              placeholder={config.placeholder}
              disabled={isSaving}
            />
          )}
          <button type="button" onClick={() => void addSectionItem(sectionId)} disabled={isSaving}>
            Add
          </button>
        </div>
      </article>
    )
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Planner</h2>
        <p>Move between calendar views, then drop into a richer daily sheet for meals, goals, notes, routines, and the timed reminders that keep your day moving.</p>
        <div className="session-reward">Click any date in the planner and it opens the full daily page for that day.</div>
      </div>

      <div className="planner-layout planner-layout-wide planner-studio-layout">
        <section className="planner-card card inset-card planner-calendar-card">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Calendar</div>
              <h3>{calendarMode === 'year' ? parsePlannerDate(selectedDate).getFullYear() : formatPlannerDate(selectedDate)}</h3>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => openPlannerDate(event.target.value)}
            />
          </div>

          <div className="planner-date-strip">
            {quickDates.map((dateKey) => (
              <button
                key={dateKey}
                className={`planner-date-chip ${selectedDate === dateKey ? 'active' : ''}`}
                onClick={() => openPlannerDate(dateKey)}
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
              <span>Timed tasks</span>
            </div>
            <div>
              <strong>{selectedSummary.sectionItemCount}</strong>
              <span>Sheet items</span>
            </div>
            <div>
              <strong>{monthRequiredTotal === 0 ? 0 : Math.round((monthRequiredDone / monthRequiredTotal) * 100)}%</strong>
              <span>Month routine</span>
            </div>
          </div>

          {calendarMode === 'day' && (
            <div className="planner-day-board">
              <div className="planner-day-hero">
                <div>
                  <div className="section-kicker">Daily planner</div>
                  <h3>{formatPlannerDate(selectedDate)}</h3>
                </div>
                <button type="button" onClick={() => openPlannerDate(todayKey())}>
                  Jump to today
                </button>
              </div>
              <p className="muted">Use the sheet below for structure, then keep reminders and repeating tasks in the timed sections further down.</p>
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
                    onClick={() => openPlannerDate(dateKey)}
                    {...bindDrop(dateKey)}
                  >
                    <span className="planner-weekday">{formatWeekdayShort(dateKey)}</span>
                    <strong>{parsePlannerDate(dateKey).getDate()}</strong>
                    <span>{summary.requiredCompleted}/{summary.requiredTotal} required</span>
                    <span>{summary.sectionItemCount} sheet items</span>
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
                      onClick={() => openPlannerDate(cell.dateKey)}
                      {...bindDrop(cell.dateKey)}
                    >
                      <strong>{cell.dayNumber}</strong>
                      <span>{summary.requiredCompleted}/{summary.requiredTotal} required</span>
                      <small>{summary.sectionItemCount + summary.customCount} planned</small>
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
                const plannedCount = monthDays.reduce((sum, cell) => {
                  const summary = getDaySummary(cell.dateKey, planner)
                  return sum + summary.customCount + summary.sectionItemCount
                }, 0)
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
                    <small>{plannedCount} planned entries</small>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="planner-card card inset-card planner-sheet-card">
          <div className="planner-sheet-head">
            <div>
              <div className="section-kicker">Daily sheet</div>
              <h3>{formatPlannerDate(selectedDate)}</h3>
              <p className="muted">A calmer page for meals, goals, routines, and everything you want to hold for this specific day.</p>
            </div>
            <div className="planner-sheet-status">
              <strong>{saveMessage}</strong>
              <span>{isSaving ? 'Syncing changes...' : 'Edits save straight into your account.'}</span>
            </div>
          </div>

          <div className="planner-sheet-toolbar">
            <article className="planner-tracker-card">
              <div className="section-kicker">Weather</div>
              <div className="planner-weather-row">
                {weatherOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`planner-weather-chip ${daySheet.weather === option.value ? 'active' : ''}`}
                    onClick={() => void saveWeather(daySheet.weather === option.value ? null : option.value)}
                    disabled={isSaving}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </article>

            <article className="planner-tracker-card">
              <div className="section-kicker">Water intake</div>
              <div className="planner-water-row">
                {Array.from({ length: 8 }, (_, index) => {
                  const count = index + 1
                  return (
                    <button
                      key={count}
                      type="button"
                      className={`planner-water-dot ${daySheet.waterIntake >= count ? 'active' : ''}`}
                      onClick={() => void saveWaterIntake(daySheet.waterIntake === count ? count - 1 : count)}
                      disabled={isSaving}
                      aria-label={`Set water intake to ${count}`}
                    >
                      {count}
                    </button>
                  )
                })}
              </div>
            </article>

            <article className="planner-tracker-card planner-routine-card">
              <div className="section-kicker">Daily anchors</div>
              <div className="planner-routine-row">
                {requiredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`planner-routine-pill ${entry.completed ? 'done' : ''}`}
                    onClick={() => void toggleEntry(entry.id, !entry.completed)}
                    disabled={isSaving}
                  >
                    <strong>{entry.title}</strong>
                    <span>{entry.time}</span>
                  </button>
                ))}
              </div>
            </article>
          </div>

          <div className="planner-sheet-cluster planner-sheet-cluster-top">
            {renderDaySection('important', 'planner-sheet-section-important')}
            <div className="planner-meals-grid">
              {renderDaySection('breakfast')}
              {renderDaySection('lunch')}
              {renderDaySection('dinner')}
              {renderDaySection('snacks')}
            </div>
          </div>

          <div className="planner-sheet-cluster planner-sheet-cluster-middle">
            {renderDaySection('todo')}
            {renderDaySection('chores')}
          </div>

          <div className="planner-sheet-cluster planner-sheet-cluster-bottom">
            <div className="planner-schedule-grid">
              {renderDaySection('morning')}
              {renderDaySection('evening')}
            </div>
            {renderDaySection('todayGoals')}
            {renderDaySection('tomorrowGoals')}
          </div>

          {renderDaySection('notes', 'planner-sheet-section-notes')}
        </section>

        <section className="planner-card card inset-card">
          <div className="section-kicker">Timed reminders</div>
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

          <div className="planner-timed-grid">
            <div className="planner-timed-column">
              <div className="planner-section-head">
                <div className="section-kicker">Required every day</div>
                <span className="muted">Water, exercise, and meditation stay in motion every day.</span>
              </div>
              <div className="planner-task-list">
                {requiredEntries.map((entry) => (
                  <div key={entry.id} className={`planner-item postit-note ${entry.completed ? 'done' : ''} required`}>
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
                    <button type="button" className="ghost-btn" onClick={() => void linkTaskToFocus(entry, selectedDate)} disabled={isSaving}>
                      Link to focus
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="planner-timed-column">
              <div className="planner-section-head">
                <div className="section-kicker">Selected date reminders</div>
                <span className="muted">{formatPlannerDate(selectedDate)}</span>
              </div>
              <div className="planner-task-list">
                {customEntries.length > 0 ? customEntries.map((entry) => (
                  <div key={entry.id} className={`planner-item postit-note ${entry.completed ? 'done' : ''}`}>
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
                    <button type="button" className="ghost-btn" onClick={() => void linkTaskToFocus(entry, selectedDate)} disabled={isSaving}>
                      Link to focus
                    </button>
                    <button type="button" className="ghost-btn" onClick={() => void removeCustomTask(entry.id)} disabled={isSaving}>Remove</button>
                  </div>
                )) : (
                  <div className="empty-panel">
                    <h4>No timed tasks</h4>
                    <p>Add one-time reminders or daily repeating tasks below and drag them onto a new date from week or month view.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="planner-card card inset-card">
          <div className="section-kicker">Required reminder times</div>
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
          <div className="section-kicker">Add timed task</div>
          <div className="planner-form planner-form-wide">
            <label>
              Task
              <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Add a timed planner task" disabled={isSaving} />
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
          <p className="muted">Use timed tasks for reminders and recurring prompts. Use the daily sheet above for planning the actual shape of the day.</p>
        </section>

        <section className="planner-card card inset-card">
          <div className="planner-section-head">
            <div className="section-kicker">Saved account notes for this date</div>
            <span className="muted">{formatPlannerDate(selectedDate)}</span>
          </div>
          {selectedJournalNotes.length > 0 ? (
            <div className="note-stack">
              {selectedJournalNotes
                .slice()
                .reverse()
                .map((note) => (
                  <article key={note.id} className="journal-postit note-card">
                    <div className="planner-item-copy">
                      <strong>{note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Saved note'}</strong>
                      <span>{note.text}</span>
                    </div>
                  </article>
                ))}
            </div>
          ) : (
            <div className="empty-panel">
              <h4>No account notes saved</h4>
              <p>Use the Notes section in this planner sheet, or save longer journal notes from your Account area if you want them to appear here too.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
