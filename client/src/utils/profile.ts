import type { WellnessMeta } from './wellness'
import type { PlannerMeta } from './planner'

export type TodoItem = {
  id: string
  text: string
  done: boolean
  focusCount?: number
  assignedPomodoros?: number
  completedPomodoros?: number
  bonusAwarded?: boolean
  linkedPlannerTaskId?: string
}

export type JournalNote = {
  id: string
  text: string
  createdAt: number
}

export type ProfileMeta = WellnessMeta & {
  appearance?: {
    theme?: 'sand' | 'forest' | 'ocean' | 'sunset'
  }
  profile?: {
    heightCm?: string
    weightKg?: string
    dateOfBirth?: string
  }
  journals?: Record<string, JournalNote[] | string>
  todosByDate?: Record<string, TodoItem[]>
  sudoku?: {
    bestTimesMs?: Partial<Record<'easy' | 'medium' | 'hard', number>>
  }
  brainArcade?: {
    memoryBestMoves?: number
    memoryBestSpan?: number
    reactionBestMs?: number
  }
  planner?: PlannerMeta
}

export function getJournalNotes(journals: ProfileMeta['journals'] | undefined, dateKey: string): JournalNote[] {
  const stored = journals?.[dateKey]

  if (Array.isArray(stored)) {
    return stored
      .filter((note) => note && typeof note.text === 'string' && note.text.trim())
      .map((note) => ({
        id: String(note.id || `note-${dateKey}-${note.createdAt || 0}`),
        text: note.text.trim(),
        createdAt: Number(note.createdAt || 0),
      }))
  }

  const legacyText = String(stored || '').trim()
  if (!legacyText) return []

  return [
    {
      id: `legacy-${dateKey}`,
      text: legacyText,
      createdAt: 0,
    },
  ]
}

export function hasAnyJournalNotes(journals: ProfileMeta['journals'] | undefined) {
  return Object.keys(journals || {}).some((dateKey) => getJournalNotes(journals, dateKey).length > 0)
}
