import React, { useState } from 'react'
import type { GoalIntent } from '../types/experience'
import '../styles/landing.css'

type Tool = 'pomodoro' | 'meditation' | 'sudoku' | 'arcade' | 'breakroom' | 'cv' | 'planner'
type Props = { onOpenAuth: (mode: 'login' | 'register', goal?: GoalIntent) => void; onOpenTool: (view: Tool) => void }
const tools: { view: Tool; name: string; detail: string }[] = [
  { view: 'planner', name: 'Make a little plan', detail: 'Tasks, notes, and a place to start.' },
  { view: 'pomodoro', name: 'Find your focus', detail: 'One task. A timer. A proper break.' },
  { view: 'meditation', name: 'Take a breath', detail: 'A few quiet minutes, whenever you need them.' },
  { view: 'breakroom', name: 'Step away for a bit', detail: 'Small breaks for a tired mind.' },
]
export default function MarketingLanding({ onOpenAuth, onOpenTool }: Props) {
  const [done, setDone] = useState([false, false, false])
  return <div className="natural-landing" id="main-content">
    <a className="marketing-skip-link" href="#everyday-tools">Skip to tools</a>
    <section className="nl-hero" id="start" aria-labelledby="nl-title">
      <div className="nl-intro">
        <p className="nl-overline"><span /> A little room to think</p>
        <h1 id="nl-title">A slower start.<br />A <em>clearer</em> day.</h1>
        <p className="nl-description">Some days, you just need to write things down and begin. A simple plan, a little focus, a moment to yourself. That’s Zenflow.</p>
        <div className="nl-actions"><button className="nl-button" onClick={() => onOpenTool('pomodoro')}>Find a little focus <span aria-hidden="true">↗</span></button><a href="#everyday-tools" className="nl-text-link">Look around <span aria-hidden="true">↓</span></a></div>
        <p className="nl-note">Free to try. No account needed for a focus session.</p>
      </div>
      <div className="nl-desk">
        <span className="nl-desk-caption">A small beginning, for today.</span>
        <div className="nl-notebook">
          <div className="nl-notebook-top"><span>THE DAILY PAGE</span><span>01 / A fresh start</span></div>
          <h2>One thing at a time.</h2><p className="nl-handwritten">You don’t have to do it all.</p>
          <div className="nl-checklist" aria-label="Try a sample daily checklist">{['Write down what’s on your mind', 'Pick one thing to work on', 'Leave a little space for a break'].map((task, i) => <label key={task} className={done[i] ? 'is-done' : ''}><input type="checkbox" checked={done[i]} onChange={() => setDone(previous => previous.map((value, index) => index === i ? !value : value))} /><span>{task}</span></label>)}</div>
          <div className="nl-notebook-bottom"><span>Less on your list.<br />More room in your day.</span><svg aria-hidden="true" viewBox="0 0 90 64"><path d="M8 52C28 48 32 25 48 12M27 43C12 24 18 13 26 15C36 18 34 34 27 43ZM38 29C39 9 55 2 61 8C63 17 49 26 38 29ZM31 38C54 30 70 36 68 44C63 53 44 45 31 38ZM49 13C64 7 76 10 78 17" /></svg></div>
        </div>
        <div className="nl-timer"><div className="nl-timer-label"><span className="nl-live-dot" /> A moment of focus <span aria-hidden="true">↗</span></div><div className="nl-timer-face">25:00<span>Take it one minute at a time.</span></div><p className="nl-timer-caption">25 minutes of focus · 5 minutes off</p><button className="nl-timer-start" onClick={() => onOpenTool('pomodoro')}>Open focus timer <span aria-hidden="true">→</span></button></div>
        <span className="nl-margin-note">a bit of calm,<br />in the middle of it all.</span>
      </div>
    </section>
    <section className="nl-tools" id="everyday-tools" aria-labelledby="nl-tools-title"><div className="nl-section-intro"><p className="nl-overline">For the everyday</p><h2 id="nl-tools-title">What would help<br /><em>right now?</em></h2><p>No perfect routine required.<br />Just choose somewhere to begin.</p></div><div className="nl-tool-list">{tools.map((tool, i) => <button key={tool.view} onClick={() => onOpenTool(tool.view)}><span className="nl-tool-number">0{i + 1}</span><span><strong>{tool.name}</strong><small>{tool.detail}</small></span><span className="nl-tool-arrow" aria-hidden="true">↗</span></button>)}</div></section>
    <section className="nl-interlude" id="how-it-works"><span className="nl-asterisk" aria-hidden="true">✳</span><div><p>Not every day needs to be your most productive.</p><h2>Some days, a little<br />progress is <em>plenty.</em></h2></div><p className="nl-interlude-note">Make a plan you can change.<br />Take the break you need.<br />Come back when you’re ready.</p></section>
    <section className="nl-account" id="product"><div><p className="nl-overline">Keep a place for yourself</p><h2>Your day, picked up<br />where you left it.</h2><p>Create a free account to keep your tasks, notes, and progress together across devices.</p></div><button className="nl-button" onClick={() => onOpenAuth('register', 'focus')}>Make yourself at home <span aria-hidden="true">↗</span></button></section>
  </div>
}
