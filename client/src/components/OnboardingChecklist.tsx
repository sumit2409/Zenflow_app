import React from 'react'
import type { ProfileMeta } from '../utils/profile'
import type { LogEntry } from '../utils/wellness'

type Props = {
  meta: ProfileMeta
  logs: LogEntry[]
  onSelect: (id: string) => void
}

export default function OnboardingChecklist({ meta, logs, onSelect }: Props) {
  const steps = [
    {
      id: 'note',
      title: 'Add today’s note',
      done: Boolean(meta.intention?.trim()),
      action: () => onSelect('profile'),
      cta: 'Write note',
      help: 'A short note helps you set the day before starting a session.',
    },
    {
      id: 'tasks',
      title: 'Add 1 to 3 tasks',
      done: Boolean((meta.todosByDate && Object.values(meta.todosByDate).some((todos) => todos.length > 0))),
      action: () => onSelect('profile'),
      cta: 'Add tasks',
      help: 'Tasks connect directly to your focus timer and completion tracking.',
    },
    {
      id: 'focus',
      title: 'Complete your first focus session',
      done: logs.some((entry) => entry.type === 'pomodoro' && entry.value > 0),
      action: () => onSelect('pomodoro'),
      cta: 'Start focus session',
      help: 'This confirms that your account, timer, and progress tracking are working.',
    },
  ]

  const completeCount = steps.filter((step) => step.done).length
  const percent = Math.round((completeCount / steps.length) * 100)

  return (
    <section className="onboarding-card card fade-rise">
      <div className="section-heading">
        <div>
          <div className="section-kicker">Setup checklist</div>
          <h3>Finish these 3 steps to complete your setup</h3>
        </div>
        <div className="task-meta-chip">{completeCount}/3 complete</div>
      </div>
      <div className="progress-rail">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="onboarding-list">
        {steps.map((step) => (
          <div key={step.id} className={`onboarding-item ${step.done ? 'done' : ''}`}>
            <div>
              <strong>{step.title}</strong>
              <span>{step.help}</span>
            </div>
            <button onClick={step.action} disabled={step.done}>{step.done ? 'Done' : step.cta}</button>
          </div>
        ))}
      </div>
    </section>
  )
}
