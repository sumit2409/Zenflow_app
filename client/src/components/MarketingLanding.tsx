import React, { useMemo, useState } from 'react'
import type { GoalIntent } from '../types/experience'

type Props = {
  onOpenAuth: (mode: 'login' | 'register', goal?: GoalIntent) => void
}

const goalOptions: Array<{
  id: GoalIntent
  label: string
  prompt: string
  reply: string
  route: string
  rooms: string[]
  timeline: string
}> = [
  {
    id: 'focus',
    label: 'Improve focus',
    prompt: 'I want stronger concentration and a cleaner work routine.',
    reply: 'Start with the focus timer, your task list, and the main dashboard.',
    route: 'Start with Focus Timer, Tasks, and Dashboard.',
    rooms: ['Focus Timer', 'Tasks', 'Dashboard'],
    timeline: 'Best first session: 25 minutes',
  },
  {
    id: 'calm',
    label: 'Reduce stress',
    prompt: 'I need a short routine that helps me slow down.',
    reply: 'Start with meditation, a simple daily note, and a short task list.',
    route: 'Start with Meditation, Daily Note, and Tasks.',
    rooms: ['Meditation', 'Daily Note', 'Tasks'],
    timeline: 'Best first session: 8 minutes',
  },
  {
    id: 'consistency',
    label: 'Build routine',
    prompt: 'I want a setup that is easy to repeat every day.',
    reply: 'Start with the dashboard, streak tracking, and one repeatable daily action.',
    route: 'Start with Dashboard, Streaks, and One Daily Session.',
    rooms: ['Dashboard', 'Streaks', 'Session Log'],
    timeline: 'Best first session: 12 minutes',
  },
  {
    id: 'recovery',
    label: 'Use better breaks',
    prompt: 'I want short breaks that help me reset and refocus.',
    reply: 'Start with Sudoku, memory training, and a quick meditation break.',
    route: 'Start with Sudoku, Memory, and Meditation.',
    rooms: ['Sudoku', 'Memory Game', 'Meditation'],
    timeline: 'Best first session: 10 minutes',
  },
]

const faqs = [
  {
    question: 'How does the setup help?',
    answer: 'It suggests the most useful starting tools based on what you want to improve first.',
  },
  {
    question: 'Do I need every section right away?',
    answer: 'No. You can start with the tools that match your goal and use the rest later.',
  },
  {
    question: 'Will my progress stay attached to my account?',
    answer: 'Yes. Your timers, notes, profile details, and game progress stay with your account.',
  },
]

export default function MarketingLanding({ onOpenAuth }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<GoalIntent>('focus')
  const selectedPlan = useMemo(
    () => goalOptions.find((goal) => goal.id === selectedGoal) || goalOptions[0],
    [selectedGoal],
  )
  const androidDownloadUrl = 'https://drive.google.com/file/d/12EeOX8QlHT2ubYcWiHqgyR_91MU7bIaZ/view?usp=sharing'

  return (
    <div className="landing-shell">
      <section className="welcome-stage fade-rise">
        <div className="welcome-copy card">
          <div className="eyebrow">Get started</div>
          <h1>Pick a goal and start with the right tools.</h1>
          <p className="lead">
            Zenflow combines focus timers, meditation, sudoku, memory training, and account tracking in one mobile app. You can use it on the web or <a className="inline-download-link" href={androidDownloadUrl} target="_blank" rel="noreferrer">download the Android pre-release</a> today, with Google Play availability coming soon.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => onOpenAuth('register', selectedPlan.id)}>Create account</button>
            <button className="ghost-btn" onClick={() => onOpenAuth('login', selectedPlan.id)}>I already have an account</button>
          </div>
          <div className="landing-metrics">
            <div>
              <strong>4 tools</strong>
              <span>focus, meditation, sudoku, and games</span>
            </div>
            <div>
              <strong>1 account</strong>
              <span>stores your profile, notes, and progress</span>
            </div>
            <div>
              <strong>{selectedPlan.timeline}</strong>
              <span>to get through the first session</span>
            </div>
          </div>
        </div>

        <aside className="concierge-card card">
          <div className="section-kicker">Choose a starting point</div>
          <div className="chat-thread" aria-live="polite">
            <div className="chat-bubble bot">
              What do you want to improve first?
            </div>
            {goalOptions.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className={`goal-chip ${goal.id === selectedPlan.id ? 'active' : ''}`}
                onClick={() => setSelectedGoal(goal.id)}
              >
                {goal.label}
              </button>
            ))}
            <div className="chat-bubble user">
              {selectedPlan.prompt}
            </div>
            <div className="chat-bubble bot accent">
              {selectedPlan.reply}
            </div>
          </div>

          <div className="concierge-plan">
            <strong>{selectedPlan.route}</strong>
            <div className="plan-tags">
              {selectedPlan.rooms.map((room) => (
                <span key={room}>{room}</span>
              ))}
            </div>
            <button className="primary-cta" onClick={() => onOpenAuth('register', selectedPlan.id)}>
              Use this setup
            </button>
          </div>
        </aside>
      </section>

      <section className="experience-grid fade-rise">
        {goalOptions.map((goal) => (
          <article key={goal.id} className={`experience-card card ${goal.id === selectedPlan.id ? 'highlight' : ''}`}>
            <div className="section-kicker">Recommended path</div>
            <h3>{goal.label}</h3>
            <p>{goal.route}</p>
            <div className="plan-tags">
              {goal.rooms.map((room) => (
                <span key={room}>{room}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="faq-grid fade-rise">
        <div>
          <div className="section-kicker">Overview</div>
          <h2>Start with a clear goal instead of sorting through every feature at once.</h2>
          <div className="faq-list">
            {faqs.map((faq) => (
              <article key={faq.question} className="faq-card card">
                <strong>{faq.question}</strong>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="trust-card card">
          <div className="section-kicker">Included</div>
          <h3>Simple setup, clean account flow, and fast access to the main tools</h3>
          <ul className="trust-list">
            <li>Goal-based setup instead of a crowded home screen</li>
            <li>Account creation and login optimized for mobile</li>
            <li>Direct access to focus, meditation, sudoku, and games</li>
            <li>Profile and progress saved to your account</li>
            <li>Android pre-release available now, with Google Play release coming soon</li>
          </ul>
          <p className="muted">
            Prefer Android? <a className="inline-download-link" href={androidDownloadUrl} target="_blank" rel="noreferrer">Download the pre-release build here</a>.
          </p>
        </aside>
      </section>
    </div>
  )
}
