export type LogEntry = {
  date: string
  type: string
  value: number
}

export type WellnessMeta = {
  goal?: number
  intention?: string
  rewardCount?: number
  lastClaimedDate?: string
}

type Quest = {
  id: string
  title: string
  detail: string
  progress: number
  target: number
  unit: string
  reward: number
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getTodayTotals(logs: LogEntry[]) {
  const today = todayKey()
  return logs
    .filter((entry) => entry.date === today)
    .reduce(
      (acc, entry) => {
        const normalizedType = entry.type.startsWith('sudoku') ? 'sudoku' : entry.type
        acc[normalizedType] = (acc[normalizedType] || 0) + Number(entry.value || 0)
        return acc
      },
      { pomodoro: 0, meditation: 0, sudoku: 0, memory: 0, reaction: 0, steps: 0 } as Record<string, number>
    )
}

export function getTotalPoints(logs: LogEntry[]) {
  return logs.reduce((sum, entry) => {
    const normalizedType = entry.type.startsWith('sudoku') ? 'sudoku' : entry.type
    if (normalizedType === 'pomodoro') return sum + Math.round(entry.value * 4)
    if (normalizedType === 'meditation') return sum + Math.round(entry.value * 5)
    if (normalizedType === 'sudoku') return sum + Math.round(entry.value * 70)
    if (normalizedType === 'memory') return sum + Math.round(entry.value * 55)
    if (normalizedType === 'reaction') return sum + Math.round(entry.value * 55)
    if (normalizedType === 'steps') return sum + Math.round(entry.value / 250)
    return sum
  }, 0)
}

export function getLevel(points: number) {
  const pointsPerLevel = 180
  const level = Math.max(1, Math.floor(points / pointsPerLevel) + 1)
  const currentLevelPoints = points % pointsPerLevel
  const progress = Math.round((currentLevelPoints / pointsPerLevel) * 100)
  return {
    level,
    progress,
    nextLevelIn: pointsPerLevel - currentLevelPoints,
  }
}

export function getCurrentStreak(logs: LogEntry[]) {
  const activeDays = Array.from(
    new Set(logs.filter((entry) => entry.value > 0).map((entry) => entry.date))
  ).sort((a, b) => b.localeCompare(a))

  if (activeDays.length === 0) return 0

  let streak = 0
  let cursor = parseDateKey(todayKey())

  for (;;) {
    const key = todayKey(cursor)
    if (!activeDays.includes(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function getRecentActiveDays(logs: LogEntry[]) {
  const start = new Date()
  start.setDate(start.getDate() - 6)

  const days = new Set<string>()
  logs.forEach((entry) => {
    if (parseDateKey(entry.date) >= start && entry.value > 0) {
      days.add(entry.date)
    }
  })

  return days.size
}

export function getQuests(logs: LogEntry[], goal = 8000) {
  const today = getTodayTotals(logs)
  return [
    {
      id: 'focus',
      title: 'Focus Ritual',
      detail: 'Complete one deep-work block.',
      progress: Math.min(today.pomodoro, 25),
      target: 25,
      unit: 'min',
      reward: 80,
    },
    {
      id: 'calm',
      title: 'Calm Ritual',
      detail: 'Take a short breathing reset.',
      progress: Math.min(today.meditation, 5),
      target: 5,
      unit: 'min',
      reward: 60,
    },
    {
      id: 'mind',
      title: 'Mind Ritual',
      detail: 'Solve one Sudoku grid to sharpen pattern memory.',
      progress: Math.min(today.sudoku, 1),
      target: 1,
      unit: 'puzzle',
      reward: 70,
    },
    {
      id: 'arcade',
      title: 'Arcade Ritual',
      detail: 'Complete one memory or reaction reset.',
      progress: Math.min(today.memory + today.reaction, 1),
      target: 1,
      unit: 'game',
      reward: 55,
    },
  ]
}

export function allQuestsComplete(quests: Quest[]) {
  return quests.every((quest) => quest.progress >= quest.target)
}

export function getAchievements(logs: LogEntry[]) {
  const totals = logs.reduce(
    (acc, entry) => {
      const normalizedType = entry.type.startsWith('sudoku') ? 'sudoku' : entry.type
      acc[normalizedType] = (acc[normalizedType] || 0) + Number(entry.value || 0)
      return acc
    },
    { steps: 0, pomodoro: 0, meditation: 0, sudoku: 0, memory: 0, reaction: 0 } as Record<string, number>
  )

  return [
    {
      id: 'lantern',
      title: 'Lantern Keeper',
      detail: 'Log 100 focus minutes.',
      unlocked: totals.pomodoro >= 100,
    },
    {
      id: 'oasis',
      title: 'Oasis Breath',
      detail: 'Log 30 meditation minutes.',
      unlocked: totals.meditation >= 30,
    },
    {
      id: 'mindsmith',
      title: 'Mindsmith',
      detail: 'Solve 5 Sudoku puzzles.',
      unlocked: totals.sudoku >= 5,
    },
    {
      id: 'spark',
      title: 'Synapse Spark',
      detail: 'Complete 10 brain arcade rounds.',
      unlocked: totals.memory + totals.reaction >= 10,
    },
  ]
}

export function getRewardTitle(count: number) {
  const rewards = [
    'Tea House Glow',
    'Quiet Garden Pass',
    'Golden Hour Ribbon',
    'Moonlight Retreat',
  ]
  return rewards[count % rewards.length]
}
