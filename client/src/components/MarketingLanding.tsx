import React, { useState } from 'react'
import type { GoalIntent } from '../types/experience'

type LandingToolView = 'pomodoro' | 'meditation' | 'sudoku' | 'arcade' | 'breakroom' | 'cv' | 'planner'

type Props = {
  onOpenAuth: (mode: 'login' | 'register', goal?: GoalIntent) => void
  onOpenTool: (view: LandingToolView) => void
}

const demos = {
  today: { label: 'Today', kicker: 'Your day, made clear', title: 'Choose three priorities', detail: 'A short list keeps the next useful action visible.', action: 'Open planner' },
  focus: { label: 'Focus', kicker: 'Protected attention', title: '25:00', detail: 'Work on one selected task, then pause intentionally.', action: 'Try focus' },
  reset: { label: 'Reset', kicker: 'A better kind of break', title: 'What do you need?', detail: 'Choose calm, movement, energy, or a short mental reset.', action: 'Explore reset' },
} as const

export default function MarketingLanding({ onOpenAuth, onOpenTool }: Props) {
  const [demo, setDemo] = useState<keyof typeof demos>('today')
  const active = demos[demo]

  const openDemo = () => {
    if (demo === 'focus') onOpenTool('pomodoro')
    else if (demo === 'reset') onOpenTool('breakroom')
    else onOpenTool('planner')
  }

  return (
    <div className="landing-shell zen-landing">
      <a className="marketing-skip-link" href="#main-content">Skip to main content</a>
      <section id="start" className="zf-hero fade-rise">
        <div className="zf-hero-copy">
          <div className="eyebrow">Your personal rhythm workspace</div>
          <h1>Make space for what matters.</h1>
          <p className="lead">Plan your day, protect your attention, and reset before overwhelm takes over—all in one calm workspace.</p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => onOpenAuth('register', 'focus')}>Start free</button>
            <button className="ghost-btn" onClick={() => onOpenTool('pomodoro')}>Try a focus session</button>
          </div>
          <p className="zf-reassurance">No credit card. Core tools work without an account.</p>
        </div>
        <div className="zf-dashboard-preview" aria-label="Preview of the Zenflow Today workspace">
          <div className="zf-preview-head"><span className="brand-dot" /> <strong>Today</strong><span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
          <div className="zf-preview-body">
            <p className="section-kicker">What matters today?</p>
            <h2>Finish the work that needs a clear mind.</h2>
            <div className="zf-priority"><span>1</span><p>Choose your first priority</p><em>Next</em></div>
            <div className="zf-priority"><span>2</span><p>Protect one focused block</p></div>
            <button className="zf-focus-button" onClick={() => onOpenTool('pomodoro')}><span>Start focus</span><strong>25 min</strong></button>
            <div className="zf-preview-foot"><span>0 min focused today</span><span>A little progress still counts.</span></div>
          </div>
        </div>
      </section>

      <main id="main-content">
        <section id="how-it-works" className="zf-section zf-loop">
          <div className="zf-section-heading"><span className="section-kicker">A simple daily loop</span><h2>Plan what matters. Focus deeply. Reset intentionally.</h2></div>
          <div className="zf-loop-grid">
            <article><span>01</span><h3>Plan</h3><p>Choose today’s priorities and make the next step easy to see.</p></article>
            <article><span>02</span><h3>Focus</h3><p>Work in a protected session with one task and fewer decisions.</p></article>
            <article><span>03</span><h3>Reset</h3><p>Recover with a short activity, then return when you’re ready.</p></article>
          </div>
        </section>

        <section id="product" className="zf-section zf-demo-section">
          <div className="zf-demo-copy"><span className="section-kicker">See the flow</span><h2>One workspace for the shape of your day.</h2><p>Each space is designed around one meaningful outcome—not a directory of tools.</p></div>
          <div className="zf-demo">
            <div className="zf-demo-tabs" role="tablist" aria-label="Product preview">
              {(Object.keys(demos) as Array<keyof typeof demos>).map((key) => <button key={key} role="tab" aria-selected={demo === key} className={demo === key ? 'active' : ''} onClick={() => setDemo(key)}>{demos[key].label}</button>)}
            </div>
            <div className={`zf-demo-canvas ${demo}`} role="tabpanel">
              <span className="section-kicker">{active.kicker}</span><h3>{active.title}</h3><p>{active.detail}</p><button className="ghost-btn" onClick={openDemo}>{active.action} →</button>
            </div>
          </div>
        </section>

        <section className="zf-section zf-benefits"><div className="zf-section-heading"><span className="section-kicker">Made for real days</span><h2>Less friction. More useful attention.</h2></div><ul><li>Start difficult tasks with less friction</li><li>Keep important priorities visible</li><li>Replace distracting breaks with restorative ones</li><li>Build consistency without guilt</li><li>Understand focus patterns over time</li></ul></section>

        <section className="zf-section zf-access">
          <div><span className="section-kicker">Free access</span><h2>Start before you sign up.</h2><p>Focus sessions, meditation, breathing, Sudoku, memory, reaction games, and break suggestions can be tried as a guest.</p></div>
          <div className="zf-access-grid"><article><h3>On this device</h3><p>Guest preferences and unfinished session state stay in your browser. Personal content is never placed in cookies.</p></article><article><h3>With an account</h3><p>Sync tasks, daily notes, preferences, session history, and progress across your devices.</p></article></div>
        </section>

        <section className="zf-final-cta"><span className="section-kicker">Begin gently</span><h2>Your next clear hour starts here.</h2><button className="primary-cta" onClick={() => onOpenAuth('register', 'focus')}>Start free</button></section>
      </main>
    </div>
  )
}
