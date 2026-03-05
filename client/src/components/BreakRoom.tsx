import React from 'react'

type Props = {
  onSelect: (id: string) => void
  lastSessionMinutes?: number
}

const activities = [
  {
    id: 'meditation',
    title: 'Breathing Reset',
    desc: 'Guided breathing patterns to lower stress after deep work.',
    sigil: 'M',
    suggested: (mins: number) => mins >= 25,
    recommendLabel: 'Recommended after any session',
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    desc: 'Light pattern work to shift from output mode to recovery mode.',
    sigil: 'S',
    suggested: (mins: number) => mins >= 50,
    recommendLabel: 'Best after 50+ min sessions',
  },
  {
    id: 'arcade',
    title: 'Brain Games',
    desc: 'Fast memory and reaction drills for active reset.',
    sigil: 'G',
    suggested: (mins: number) => mins < 50,
    recommendLabel: 'Best after 25-min sessions',
  },
]

export default function BreakRoom({ onSelect, lastSessionMinutes = 25 }: Props) {
  return (
    <div>
      <div className="module-meta">
        <div className="session-reward">Break time</div>
        <h2>Active Recovery Room</h2>
        <p>Choose an activity that helps you reset before the next session.</p>
      </div>

      <div className="feature-grid" style={{ marginTop: '24px' }}>
        {activities.map((activity) => {
          const isRecommended = activity.suggested(lastSessionMinutes)
          return (
            <button
              key={activity.id}
              className="feature-card fade-rise"
              onClick={() => onSelect(activity.id)}
              style={{ position: 'relative' }}
            >
              {isRecommended && (
                <div className="eyebrow" style={{ marginBottom: '10px', fontSize: '10px' }}>
                  * {activity.recommendLabel}
                </div>
              )}
              <div className="feature-sigil" style={{ fontSize: '24px' }}>{activity.sigil}</div>
              <div className="feature-stack">
                <div className="feature-title">{activity.title}</div>
                <div className="feature-desc">{activity.desc}</div>
              </div>
              <div className="arrow">&gt;</div>
            </button>
          )
        })}
      </div>

      <div className="card" style={{ padding: '20px', marginTop: '20px' }}>
        <div className="section-kicker">Offline reset</div>
        <p className="muted" style={{ marginTop: '6px' }}>Walk, stretch, or drink water. Come back when your break ends.</p>
      </div>
    </div>
  )
}

