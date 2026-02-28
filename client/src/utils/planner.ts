import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'

export type RequiredPlannerTaskKey = 'water' | 'exercise' | 'meditation'

export type PlannerCustomItem = {
  id: string
  title: string
  date: string
  time: string
}

export type PlannerMeta = {
  remindersEnabled?: boolean
  reminderTimes?: Partial<Record<RequiredPlannerTaskKey, string>>
  customItems?: PlannerCustomItem[]
  completions?: Record<string, Record<string, boolean>>
}

export type PlannerEntry = {
  id: string
  title: string
  date: string
  time: string
  required: boolean
  completed: boolean
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

const requiredReminderSteps: Record<RequiredPlannerTaskKey, number[]> = {
  water: [10, 20, 30, 45, 60],
  exercise: [15, 30, 45],
  meditation: [15, 30, 45],
}

function createDateTime(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`)
}

function plannerNotificationId(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash) % 2000000000
}

export function getReminderTimes(planner: PlannerMeta | undefined) {
  return {
    ...defaultReminderTimes,
    ...(planner?.reminderTimes || {}),
  }
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
  const customItems = (planner?.customItems || []).filter((item) => item.date === dateKey)

  const requiredEntries = requiredTaskDefinitions.map((task) => ({
    id: `required-${task.key}`,
    title: task.title,
    date: dateKey,
    time: reminderTimes[task.key],
    required: true,
    completed: Boolean(completions[`required-${task.key}`]),
  }))

  const customEntries = customItems.map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    time: item.time,
    required: false,
    completed: Boolean(completions[item.id]),
  }))

  return [...requiredEntries, ...customEntries].sort((left, right) => left.time.localeCompare(right.time))
}

export function updatePlannerCompletion(planner: PlannerMeta | undefined, dateKey: string, taskId: string, completed: boolean): PlannerMeta {
  const nextCompletions = {
    ...(planner?.completions || {}),
    [dateKey]: {
      ...((planner?.completions || {})[dateKey] || {}),
      [taskId]: completed,
    },
  }

  return {
    ...(planner || {}),
    reminderTimes: getReminderTimes(planner),
    customItems: [...(planner?.customItems || [])],
    completions: nextCompletions,
    remindersEnabled: planner?.remindersEnabled ?? true,
  }
}

export function addPlannerItem(planner: PlannerMeta | undefined, item: PlannerCustomItem): PlannerMeta {
  return {
    ...(planner || {}),
    reminderTimes: getReminderTimes(planner),
    customItems: [...(planner?.customItems || []), item].sort((left, right) => `${left.date}-${left.time}`.localeCompare(`${right.date}-${right.time}`)),
    completions: { ...(planner?.completions || {}) },
    remindersEnabled: planner?.remindersEnabled ?? true,
  }
}

export function removePlannerItem(planner: PlannerMeta | undefined, itemId: string): PlannerMeta {
  const nextCompletions = Object.fromEntries(
    Object.entries(planner?.completions || {}).map(([dateKey, entries]) => [
      dateKey,
      Object.fromEntries(Object.entries(entries).filter(([entryId]) => entryId !== itemId)),
    ])
  )

  return {
    ...(planner || {}),
    reminderTimes: getReminderTimes(planner),
    customItems: (planner?.customItems || []).filter((item) => item.id !== itemId),
    completions: nextCompletions,
    remindersEnabled: planner?.remindersEnabled ?? true,
  }
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
      channelId: 'planner-reminders',
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
          channelId: 'planner-reminders',
          extra: { kind: 'planner', dateKey, taskId, required: true, order: taskIndex, reminderIndex, loop: 'follow-up' },
        })
      })
    })

    customItems
      .filter((item) => item.date === dateKey && !dayCompletions[item.id])
      .forEach((item) => {
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

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }
}
