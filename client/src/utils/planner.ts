import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'

export type RequiredPlannerTaskKey = 'water' | 'exercise' | 'meditation'
export type PlannerRepeat = 'once' | 'daily'
export const plannerDaySectionIds = [
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
] as const

export type PlannerDaySectionId = (typeof plannerDaySectionIds)[number]
export type PlannerWeatherKey = 'sunny' | 'cloudy' | 'rainy' | 'stormy'

export type PlannerCustomItem = {
  id: string
  title: string
  date: string
  time: string
  repeat?: PlannerRepeat
}

export type PlannerDaySheetItem = {
  id: string
  text: string
  checked?: boolean
}

export type PlannerDaySheet = {
  sections?: Partial<Record<PlannerDaySectionId, PlannerDaySheetItem[]>>
  weather?: PlannerWeatherKey
  waterIntake?: number
}

export type PlannerDaySheetState = {
  sections: Record<PlannerDaySectionId, PlannerDaySheetItem[]>
  weather: PlannerWeatherKey | null
  waterIntake: number
}

export type PlannerMeta = {
  remindersEnabled?: boolean
  reminderTimes?: Partial<Record<RequiredPlannerTaskKey, string>>
  customItems?: PlannerCustomItem[]
  completions?: Record<string, Record<string, boolean>>
  daySheets?: Record<string, PlannerDaySheet>
}

export type PlannerEntry = {
  id: string
  title: string
  date: string
  time: string
  required: boolean
  completed: boolean
  repeat: PlannerRepeat
}

export const defaultReminderTimes: Record<RequiredPlannerTaskKey, string> = {
  water: '06:45',
  exercise: '07:15',
  meditation: '07:45',
}

const requiredTaskDefinitions: Array<{ key: RequiredPlannerTaskKey; title: string }> = [
  { key: 'water', title: 'Drink water' },
  { key: 'exercise', title: 'Exercise' },
  { key: 'meditation', title: 'Meditation' },
]

const requiredNotificationChannels: Record<RequiredPlannerTaskKey, { id: string; sound: string }> = {
  water: { id: 'planner-water-reminders', sound: 'water_ping.wav' },
  exercise: { id: 'planner-exercise-reminders', sound: 'exercise_alert.wav' },
  meditation: { id: 'planner-meditation-reminders', sound: 'meditation_bell.wav' },
}

const requiredReminderSteps: Record<RequiredPlannerTaskKey, number[]> = {
  water: [10, 20, 30, 45, 60],
  exercise: [15, 30, 45],
  meditation: [15, 30, 45],
}

function createDateTime(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`)
}

export function parsePlannerDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function shiftPlannerDate(dateKey: string, offsetDays: number) {
  const nextDate = parsePlannerDate(dateKey)
  nextDate.setDate(nextDate.getDate() + offsetDays)
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
}

function plannerNotificationId(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash) % 2000000000
}

function clampWaterIntake(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(8, Math.round(value)))
}

function clonePlannerBase(planner: PlannerMeta | undefined): PlannerMeta {
  return {
    ...(planner || {}),
    remindersEnabled: planner?.remindersEnabled ?? true,
    reminderTimes: getReminderTimes(planner),
    customItems: [...(planner?.customItems || [])],
    completions: { ...(planner?.completions || {}) },
    daySheets: { ...(planner?.daySheets || {}) },
  }
}

function cloneDaySheet(sheet: PlannerDaySheet | undefined): PlannerDaySheetState {
  return {
    sections: Object.fromEntries(
      plannerDaySectionIds.map((sectionId) => [
        sectionId,
        (sheet?.sections?.[sectionId] || [])
          .filter((item) => item && typeof item.text === 'string')
          .map((item) => ({
            id: String(item.id || `${sectionId}-${Date.now()}`),
            text: item.text.trim(),
            checked: Boolean(item.checked),
          }))
          .filter((item) => item.text),
      ])
    ) as Record<PlannerDaySectionId, PlannerDaySheetItem[]>,
    weather: sheet?.weather || null,
    waterIntake: clampWaterIntake(sheet?.waterIntake ?? 0),
  }
}

function isDaySheetEmpty(sheet: PlannerDaySheetState) {
  return !sheet.weather
    && sheet.waterIntake === 0
    && plannerDaySectionIds.every((sectionId) => sheet.sections[sectionId].length === 0)
}

function withUpdatedDaySheet(
  planner: PlannerMeta | undefined,
  dateKey: string,
  updater: (sheet: PlannerDaySheetState) => void
) {
  const nextPlanner = clonePlannerBase(planner)
  const nextSheet = cloneDaySheet(nextPlanner.daySheets?.[dateKey])
  updater(nextSheet)

  if (isDaySheetEmpty(nextSheet)) {
    delete nextPlanner.daySheets?.[dateKey]
    return nextPlanner
  }

  nextPlanner.daySheets = {
    ...(nextPlanner.daySheets || {}),
    [dateKey]: {
      sections: nextSheet.sections,
      weather: nextSheet.weather || undefined,
      waterIntake: nextSheet.waterIntake,
    },
  }

  return nextPlanner
}

export function getReminderTimes(planner: PlannerMeta | undefined) {
  return {
    ...defaultReminderTimes,
    ...(planner?.reminderTimes || {}),
  }
}

export function getPlannerDaySheet(dateKey: string, planner: PlannerMeta | undefined): PlannerDaySheetState {
  return cloneDaySheet(planner?.daySheets?.[dateKey])
}

export function formatPlannerDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateKey

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getRequiredReminderLabel(taskKey: RequiredPlannerTaskKey) {
  const repeatSteps = requiredReminderSteps[taskKey].filter((value) => value > 0)
  if (repeatSteps.length === 0) return 'One reminder only.'

  return `Repeats after ${repeatSteps.join(', ')} minutes until complete.`
}

export function getPlannerEntries(dateKey: string, planner: PlannerMeta | undefined): PlannerEntry[] {
  const reminderTimes = getReminderTimes(planner)
  const completions = planner?.completions?.[dateKey] || {}
  const customItems = (planner?.customItems || []).filter((item) => item.repeat === 'daily' ? item.date <= dateKey : item.date === dateKey)

  const requiredEntries = requiredTaskDefinitions.map((task) => ({
    id: `required-${task.key}`,
    title: task.title,
    date: dateKey,
    time: reminderTimes[task.key],
    required: true,
    completed: Boolean(completions[`required-${task.key}`]),
    repeat: 'daily' as PlannerRepeat,
  }))

  const customEntries = customItems.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    time: item.time,
    required: false,
    completed: Boolean(completions[item.id]),
    repeat: item.repeat || 'once',
  }))

  return [...requiredEntries, ...customEntries].sort((left, right) => left.time.localeCompare(right.time))
}

export function updatePlannerCompletion(planner: PlannerMeta | undefined, dateKey: string, taskId: string, completed: boolean): PlannerMeta {
  const nextPlanner = clonePlannerBase(planner)
  const nextCompletions = {
    ...(nextPlanner.completions || {}),
    [dateKey]: {
      ...((nextPlanner.completions || {})[dateKey] || {}),
      [taskId]: completed,
    },
  }

  return {
    ...nextPlanner,
    completions: nextCompletions,
  }
}

export function addPlannerItem(planner: PlannerMeta | undefined, item: PlannerCustomItem): PlannerMeta {
  const nextPlanner = clonePlannerBase(planner)
  return {
    ...nextPlanner,
    customItems: [...(nextPlanner.customItems || []), { ...item, repeat: item.repeat || 'once' }].sort((left, right) => `${left.date}-${left.time}`.localeCompare(`${right.date}-${right.time}`)),
  }
}

export function removePlannerItem(planner: PlannerMeta | undefined, itemId: string): PlannerMeta {
  const nextPlanner = clonePlannerBase(planner)
  const nextCompletions = Object.fromEntries(
    Object.entries(nextPlanner.completions || {}).map(([dateKey, entries]) => [
      dateKey,
      Object.fromEntries(Object.entries(entries).filter(([entryId]) => entryId !== itemId)),
    ])
  )

  return {
    ...nextPlanner,
    customItems: (nextPlanner.customItems || []).filter((item) => item.id !== itemId),
    completions: nextCompletions,
  }
}

export function movePlannerItem(planner: PlannerMeta | undefined, itemId: string, nextDate: string): PlannerMeta {
  const nextPlanner = clonePlannerBase(planner)
  return {
    ...nextPlanner,
    customItems: (nextPlanner.customItems || []).map((item) => (item.id === itemId ? { ...item, date: nextDate } : item)),
  }
}

export function addPlannerDaySheetItem(
  planner: PlannerMeta | undefined,
  dateKey: string,
  sectionId: PlannerDaySectionId,
  item: PlannerDaySheetItem
) {
  return withUpdatedDaySheet(planner, dateKey, (sheet) => {
    sheet.sections[sectionId] = [...sheet.sections[sectionId], { ...item, text: item.text.trim() }].filter((entry) => entry.text)
  })
}

export function updatePlannerDaySheetItem(
  planner: PlannerMeta | undefined,
  dateKey: string,
  sectionId: PlannerDaySectionId,
  itemId: string,
  patch: Partial<PlannerDaySheetItem>
) {
  return withUpdatedDaySheet(planner, dateKey, (sheet) => {
    sheet.sections[sectionId] = sheet.sections[sectionId]
      .map((item) => (item.id === itemId ? { ...item, ...patch, text: String((patch.text ?? item.text) || '').trim() } : item))
      .filter((item) => item.text)
  })
}

export function removePlannerDaySheetItem(
  planner: PlannerMeta | undefined,
  dateKey: string,
  sectionId: PlannerDaySectionId,
  itemId: string
) {
  return withUpdatedDaySheet(planner, dateKey, (sheet) => {
    sheet.sections[sectionId] = sheet.sections[sectionId].filter((item) => item.id !== itemId)
  })
}

export function setPlannerDaySheetWaterIntake(planner: PlannerMeta | undefined, dateKey: string, waterIntake: number) {
  return withUpdatedDaySheet(planner, dateKey, (sheet) => {
    sheet.waterIntake = clampWaterIntake(waterIntake)
  })
}

export function setPlannerDaySheetWeather(planner: PlannerMeta | undefined, dateKey: string, weather: PlannerWeatherKey | null) {
  return withUpdatedDaySheet(planner, dateKey, (sheet) => {
    sheet.weather = weather
  })
}

export async function schedulePlannerNotifications(planner: PlannerMeta | undefined, referenceDate = new Date()) {
  if (Capacitor.getPlatform() === 'web') return

  const reminderTimes = getReminderTimes(planner)
  const permissions = await LocalNotifications.checkPermissions()
  if (permissions.display !== 'granted') {
    const requested = await LocalNotifications.requestPermissions()
    if (requested.display !== 'granted') return
  }

  try {
    const exactAlarmSetting = await LocalNotifications.checkExactNotificationSetting()
    if (exactAlarmSetting.exact_alarm !== 'granted') {
      await LocalNotifications.changeExactNotificationSetting()
    }
  } catch {
    // Best effort on Android versions where exact alarms are unavailable.
  }

  await LocalNotifications.createChannel({
    id: 'planner-reminders',
    name: 'Planner reminders',
    description: 'Daily required tasks and planner reminders',
    importance: 5,
    visibility: 1,
    vibration: true,
  })

  await Promise.all(
    Object.entries(requiredNotificationChannels).map(([taskKey, channel]) =>
      LocalNotifications.createChannel({
        id: channel.id,
        name: `${taskKey[0].toUpperCase()}${taskKey.slice(1)} reminders`,
        description: `Required daily reminder sound for ${taskKey}.`,
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: channel.sound,
      })
    )
  )

  const pending = await LocalNotifications.getPending()
  const plannerNotifications = pending.notifications
    .filter((notification) => notification.extra?.kind === 'planner')
    .map((notification) => ({ id: notification.id }))

  if (plannerNotifications.length > 0) {
    await LocalNotifications.cancel({ notifications: plannerNotifications })
  }

  if (planner?.remindersEnabled === false) return

  const notifications: LocalNotificationSchema[] = []
  const completions = planner?.completions || {}
  const customItems = planner?.customItems || []

  requiredTaskDefinitions.forEach((task, taskIndex) => {
    const [hour, minute] = reminderTimes[task.key].split(':').map((value) => Number.parseInt(value, 10))
    notifications.push({
      id: plannerNotificationId(`daily-${task.key}`),
      title: task.title,
      body: `Daily routine reminder for ${reminderTimes[task.key]}.`,
      schedule: {
        on: { hour, minute },
        repeats: true,
        allowWhileIdle: true,
      },
      channelId: requiredNotificationChannels[task.key].id,
      extra: { kind: 'planner', taskId: `required-${task.key}`, required: true, order: taskIndex, loop: 'daily-base' },
    })
  })

  for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
    const date = new Date(referenceDate)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + dayOffset)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const dayCompletions = completions[dateKey] || {}

    requiredTaskDefinitions.forEach((task, taskIndex) => {
      const taskId = `required-${task.key}`
      if (dayCompletions[taskId]) return

      const baseTime = reminderTimes[task.key]
      const baseDateTime = createDateTime(dateKey, baseTime)
      if (baseDateTime <= referenceDate) return

      requiredReminderSteps[task.key].forEach((offsetMinutes, reminderIndex) => {
        const reminderDateTime = new Date(baseDateTime)
        reminderDateTime.setMinutes(reminderDateTime.getMinutes() + offsetMinutes)
        if (reminderDateTime <= referenceDate) return

        notifications.push({
          id: plannerNotificationId(`${dateKey}-${taskId}-followup-${reminderIndex}`),
          title: task.title,
          body: `${task.title} is still pending. Open the planner and tick it complete.`,
          schedule: { at: reminderDateTime, allowWhileIdle: true },
          channelId: requiredNotificationChannels[task.key].id,
          extra: { kind: 'planner', dateKey, taskId, required: true, order: taskIndex, reminderIndex, loop: 'follow-up' },
        })
      })
    })

    customItems
      .filter((item) => (item.repeat === 'daily' ? item.date <= dateKey : item.date === dateKey) && !dayCompletions[item.id])
      .forEach((item) => {
        if (item.repeat === 'daily') return
        const itemDateTime = createDateTime(item.date, item.time)
        if (itemDateTime <= referenceDate) return
        notifications.push({
          id: plannerNotificationId(`${item.date}-${item.id}`),
          title: item.title,
          body: `Scheduled for ${item.time}.`,
          schedule: { at: itemDateTime, allowWhileIdle: true },
          channelId: 'planner-reminders',
          extra: { kind: 'planner', dateKey: item.date, taskId: item.id, required: false },
        })
      })
  }

  customItems
    .filter((item) => item.repeat === 'daily')
    .forEach((item) => {
      const [hour, minute] = item.time.split(':').map((value) => Number.parseInt(value, 10))
      notifications.push({
        id: plannerNotificationId(`daily-custom-${item.id}`),
        title: item.title,
        body: `Daily reminder for ${item.time}.`,
        schedule: {
          on: { hour, minute },
          repeats: true,
          allowWhileIdle: true,
        },
        channelId: 'planner-reminders',
        extra: { kind: 'planner', taskId: item.id, required: false, loop: 'daily-custom' },
      })
    })

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }
}
