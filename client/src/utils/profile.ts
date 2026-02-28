import type { WellnessMeta } from './wellness'

export type TodoItem = {
  id: string
  text: string
  done: boolean
  focusCount?: number
}

export type ProfileMeta = WellnessMeta & {
  profile?: {
    heightCm?: string
    weightKg?: string
    dateOfBirth?: string
  }
  journals?: Record<string, string>
  todosByDate?: Record<string, TodoItem[]>
  brainArcade?: {
    memoryBestMoves?: number
    reactionBestMs?: number
  }
}
