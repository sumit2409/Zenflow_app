import React, { useMemo, useState } from 'react'
import type { GoalIntent } from '../types/experience'

type LandingToolView = 'pomodoro' | 'meditation' | 'sudoku' | 'arcade' | 'breakroom' | 'cv' | 'planner'

type Props = {
  onOpenAuth: (mode: 'login' | 'register', goal?: GoalIntent) => void
  onOpenTool: (view: LandingToolView) => void
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

const freeTools: Array<{
  view: Exclude<LandingToolView, 'planner'>
  title: string
  promise: string
  desc: string
  tag: string
}> = [
  {
    view: 'pomodoro',
    title: 'Focus Timer',
    promise: 'Take back your life',
    desc: 'Start a timed work block without creating an account.',
    tag: 'Deep work',
  },
  {
    view: 'meditation',
    title: 'Meditation',
    promise: 'Calm your nervous system',
    desc: 'Run a calm timer with breathing patterns and ambient sound.',
    tag: 'Calm',
  },
  {
    view: 'sudoku',
    title: 'Sudoku',
    promise: 'Sharpen your mind',
    desc: 'Play a fresh puzzle and sign in later if you want saved best times.',
    tag: 'Puzzle',
  },
  {
    view: 'arcade',
    title: 'Games',
    promise: 'Train your reaction',
    desc: 'Try quick memory and reaction drills during short breaks.',
    tag: 'Reset',
  },
  {
    view: 'breakroom',
    title: 'Break Room',
    promise: 'Reset without scrolling',
    desc: 'Pick a reset activity after a focus session or long task.',
    tag: 'Recovery',
  },
  {
    view: 'cv',
    title: 'CV Maker',
    promise: 'Create a CV',
    desc: 'Calm down, it is still free. Login to build a private CV and download the PDF.',
    tag: 'Career',
  },
]

export default function MarketingLanding({ onOpenAuth, onOpenTool }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<GoalIntent>('focus')
  const androidAppUrl = 'https://raw.githubusercontent.com/sumit2409/Zenflow_app/main/downloads/zenflow-app.apk'
  const selectedPlan = useMemo(
    () => goalOptions.find((goal) => goal.id === selectedGoal) || goalOptions[0],
    [selectedGoal],
  )
  const getPlanAction = (goal: (typeof goalOptions)[number]) => {
    if (goal.id === 'focus') {
      return {
        label: 'Try Focus Timer',
        action: () => onOpenTool('pomodoro'),
      }
    }

    if (goal.id === 'calm') {
      return {
        label: 'Try Meditation',
        action: () => onOpenTool('meditation'),
      }
    }

    if (goal.id === 'consistency') {
      return {
        label: 'Log in for Planner',
        action: () => onOpenTool('planner'),
      }
    }

    return {
      label: 'Try Sudoku',
      action: () => onOpenTool('sudoku'),
    }
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectedPlanAction = getPlanAction(selectedPlan)

  return (
    <div className="landing-shell">
      <a className="marketing-skip-link" href="#main-content">Skip to main content</a>
      <section id="start" className="welcome-stage fade-rise">
        <div className="welcome-copy">
          <div className="eyebrow">Get started</div>
          <h1>Pick a goal and start with the right tools.</h1>
          <p className="lead">
            Zenflow combines focus timers, meditation, sudoku, memory training, and account tracking in one place. You can use it on the web, and you can also{' '}
            <a className="public-link" href={androidAppUrl} target="_blank" rel="noreferrer">
              Download for Android
            </a>{' '}
            <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
              (.apk file - requires "Install unknown apps" enabled on your device)
            </span>{' '}
            while the Google Play release is being prepared.
          </p>
          <nav className="marketing-page-nav" aria-label="Page sections">
            <button type="button" className="page-nav-btn" onClick={() => scrollTo('start')}>Start here</button>
            <button type="button" className="page-nav-btn" onClick={() => scrollTo('plans')}>Explore plans</button>
            <button type="button" className="page-nav-btn" onClick={() => scrollTo('overview')}>Overview</button>
            <button type="button" className="page-nav-btn" onClick={() => scrollTo('about')}>About</button>
          </nav>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => onOpenAuth('register', selectedPlan.id)}>Create account</button>
            <button className="ghost-btn" onClick={() => onOpenTool('pomodoro')}>Try Focus Timer</button>
            <button className="ghost-btn" onClick={() => onOpenTool('meditation')}>Try Meditation</button>
            <button className="ghost-btn" onClick={() => onOpenAuth('login', selectedPlan.id)}>I already have an account</button>
          </div>
        </div>

        <div className="landing-showcase">
          <div className="workspace-preview" aria-label="Zenflow workspace preview">
            <div className="workspace-titlebar">
              <div className="window-controls" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>Zenflow workspace</strong>
              <span>Today</span>
            </div>
            <div className="workspace-body">
              <div className="workspace-sidebar" aria-label="Workspace preview navigation">
                <button type="button" className="workspace-nav-btn active" onClick={() => onOpenAuth('login', 'consistency')}>
                  Dashboard
                </button>
                <button type="button" className="workspace-nav-btn" onClick={() => onOpenTool('pomodoro')}>
                  Focus Timer
                </button>
                <button type="button" className="workspace-nav-btn" onClick={() => onOpenTool('meditation')}>
                  Meditation
                </button>
                <button type="button" className="workspace-nav-btn" onClick={() => onOpenTool('sudoku')}>
                  Sudoku
                </button>
                <button type="button" className="workspace-nav-btn" onClick={() => onOpenTool('arcade')}>
                  Games
                </button>
              </div>
              <div className="workspace-main">
                <button type="button" className="workspace-panel focus-panel" onClick={() => onOpenTool('pomodoro')}>
                  <span className="panel-kicker">Focus Timer</span>
                  <strong>25:00</strong>
                  <div className="focus-progress" aria-hidden="true">
                    <span />
                  </div>
                </button>
                <button type="button" className="workspace-panel" onClick={() => onOpenTool('planner')}>
                  <span className="panel-kicker">Tasks</span>
                  <p>Daily Note</p>
                  <p>One Daily Session</p>
                </button>
                <button type="button" className="workspace-panel calm-panel" onClick={() => onOpenTool('meditation')}>
                  <span className="panel-kicker">Meditation</span>
                  <strong>8 min</strong>
                </button>
                <button type="button" className="workspace-panel game-panel" onClick={() => onOpenTool('sudoku')}>
                  <span className="panel-kicker">Sudoku</span>
                  <strong>Level up</strong>
                </button>
              </div>
            </div>
          </div>

          <aside className="concierge-card">
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
              <button className="primary-cta" onClick={selectedPlanAction.action}>
                {selectedPlan.id === 'focus' || selectedPlan.id === 'calm' ? 'Use this setup' : selectedPlanAction.label}
              </button>
            </div>
          </aside>
        </div>

        <div className="landing-metrics">
          <div>
            <strong>6 free tools</strong>
            <span>focus, meditation, sudoku, games, break picks, and CV maker</span>
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
      </section>

      <section className="free-tools-band fade-rise">
        <div className="section-heading-block">
          <div className="section-kicker">Free tools</div>
          <h2>Take back your life, create a CV, and sharpen your mind.</h2>
          <p className="lead">
            Use these tools immediately. No account is needed unless you want Zenflow to save progress.
          </p>
        </div>
        <div className="free-tools-grid">
          {freeTools.map((tool) => (
            <button key={tool.view} type="button" className="free-tool-card" onClick={() => onOpenTool(tool.view)}>
              <span>{tool.tag}</span>
              <strong>{tool.promise}</strong>
              <em>{tool.title}</em>
              <small>{tool.desc}</small>
            </button>
          ))}
        </div>
      </section>

      <section id="plans" className="experience-grid fade-rise">
        {goalOptions.map((goal, index) => {
          const planAction = getPlanAction(goal)
          return (
            <article key={goal.id} className={`experience-card card ${goal.id === selectedPlan.id ? 'highlight' : ''}`}>
              <div className="section-kicker">Recommended path</div>
              <span className="experience-number">0{index + 1}</span>
              <h3>{goal.label}</h3>
              <p>{goal.route}</p>
              <div className="plan-tags">
                {goal.rooms.map((room) => (
                  <span key={room}>{room}</span>
                ))}
              </div>
              <button type="button" className="ghost-btn plan-action-btn" onClick={planAction.action}>
                {planAction.label}
              </button>
            </article>
          )
        })}
      </section>

      <section id="main-content" className="faq-grid fade-rise">
        <div id="overview">
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
            <li>Android app available for early sharing, with Google Play release coming soon</li>
          </ul>
          <p className="muted">
            Prefer Android? <a className="public-link" href={androidAppUrl} target="_blank" rel="noreferrer">Share the Android version here</a>, then move to Google Play once the public release is ready.
          </p>
        </aside>
      </section>

      <section id="about" className="about-grid fade-rise">
        <article className="about-card card">
          <div className="section-kicker">About us</div>
          <h2>Built independently to cut through noise and make daily work feel manageable again.</h2>
          <p>
            Zenflow is developed by independent developers based in India and France. We built it to push back against brain rot, reduce digital drift, and help people manage tasks with more structure.
          </p>
          <p>
            The goal is simple: give people one place to focus, plan, reset, and actually finish what matters.
          </p>
        </article>
        <aside className="about-contact card">
          <div className="section-kicker">Contact</div>
          <h3>Questions, suggestions, or support</h3>
          <p>
            Thank you for being part of our growing community and supporting us in our fight against brain rot. Feel free to spread the word so more people can use our free resources.
          </p>
          <p>
            <a className="public-link" href="mailto:zenflow.bio@zohomail.eu">zenflow.bio@zohomail.eu</a>
          </p>
          <p>
            Have a nice day,
            <br />
            Sumit Tiwari
          </p>
        </aside>
      </section>
    </div>
  )
}


