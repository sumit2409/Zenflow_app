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
    label: 'Focus better',
    prompt: 'I keep getting distracted and want to lock in.',
    reply: 'Then we should start with task-linked focus blocks and a lighter dashboard so you can move from intention to output fast.',
    route: 'Start with Focus Room + task queue + end-of-day proof.',
    rooms: ['Focus Room', 'Profile Queue', 'Dashboard'],
    timeline: 'Best first session: 25 minutes',
  },
  {
    id: 'calm',
    label: 'Feel calmer',
    prompt: 'My head is noisy and I need to slow down.',
    reply: 'Then the better path is lower-friction breathing, short rituals, and a quieter first session so the app feels restorative instead of demanding.',
    route: 'Start with Calm Room + intention + one gentle task.',
    rooms: ['Calm Room', 'Intention Card', 'Dashboard'],
    timeline: 'Best first session: 8 minutes',
  },
  {
    id: 'consistency',
    label: 'Build routine',
    prompt: 'I start strong but I never stay consistent.',
    reply: 'Then we optimize for visible streaks, small daily wins, and rewards that make coming back feel earned.',
    route: 'Start with Dashboard rituals + reward loop + one repeatable habit.',
    rooms: ['Dashboard', 'Reward Shelf', 'Onboarding'],
    timeline: 'Best first session: 12 minutes',
  },
  {
    id: 'recovery',
    label: 'Stop doomscrolling',
    prompt: 'I want breaks that wake me up instead of frying my brain.',
    reply: 'Then we swap passive scrolling for active resets like Sudoku, reaction training, and short breathing windows.',
    route: 'Start with Brain Arcade + Sudoku + short reset loop.',
    rooms: ['Brain Arcade', 'Mind Puzzle', 'Calm Room'],
    timeline: 'Best first session: 10 minutes',
  },
]

const faqs = [
  {
    question: 'What does the concierge actually do?',
    answer: 'It asks what outcome you want, then recommends the shortest starting path through Zenflow instead of dumping every feature on screen.',
  },
  {
    question: 'Do I need to use every room?',
    answer: 'No. The point of the new flow is to narrow the experience to what matters first, then widen it after the first useful session.',
  },
  {
    question: 'Will my progress stay attached to my account?',
    answer: 'Yes. Your rituals, journal state, and rewards stay tied to your authenticated account session.',
  },
]

export default function MarketingLanding({ onOpenAuth }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<GoalIntent>('focus')
  const selectedPlan = useMemo(
    () => goalOptions.find((goal) => goal.id === selectedGoal) || goalOptions[0],
    [selectedGoal],
  )

  return (
    <div className="landing-shell">
      <section className="welcome-stage fade-rise">
        <div className="welcome-copy card">
          <div className="eyebrow">A calmer start for distracted people</div>
          <h1>Tell Zenflow what you want, and it will shape the first session around that.</h1>
          <p className="lead">
            The old experience asked users to decipher the product alone. The new one starts with a concierge conversation, a recommended path, and an auth flow that never hides below the viewport.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => onOpenAuth('register', selectedPlan.id)}>Start my recommended setup</button>
            <button className="ghost-btn" onClick={() => onOpenAuth('login', selectedPlan.id)}>I already have an account</button>
          </div>
          <div className="landing-metrics">
            <div>
              <strong>1 goal</strong>
              <span>chosen before account creation</span>
            </div>
            <div>
              <strong>3 rooms</strong>
              <span>recommended instead of showing all five at once</span>
            </div>
            <div>
              <strong>{selectedPlan.timeline}</strong>
              <span>for the first meaningful win</span>
            </div>
          </div>
        </div>

        <aside className="concierge-card card">
          <div className="section-kicker">Zenflow concierge</div>
          <div className="chat-thread" aria-live="polite">
            <div className="chat-bubble bot">
              What are you trying to change first?
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
              Build this setup
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
          <div className="section-kicker">New onboarding</div>
          <h2>Instead of feature overload, the app now starts with a short conversation.</h2>
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
          <div className="section-kicker">What changed</div>
          <h3>Cleaner public UX, stronger auth, better first-run guidance</h3>
          <ul className="trust-list">
            <li>Goal-first entry instead of a generic landing wall</li>
            <li>Scroll-safe auth sheet for long registration forms</li>
            <li>Tailored CTA copy based on what the user wants</li>
            <li>Guided path into focus, calm, routine, or recovery flows</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}
