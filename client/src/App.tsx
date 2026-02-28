import React, { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import PomodoroTimer from './components/PomodoroTimer'
import MeditationTimer from './components/MeditationTimer'
import Login from './components/Login'
import SudokuTrainer from './components/SudokuTrainer'
import ProfileCenter from './components/ProfileCenter'
import BrainArcade from './components/BrainArcade'
import MarketingLanding from './components/MarketingLanding'
import type { AuthAccount, StoredSession } from './types/auth'
import type { GoalIntent } from './types/experience'
import { apiUrl } from './utils/api'

const LOCAL_SESSION_KEY = 'zenflow_session'
const TEMP_SESSION_KEY = 'zenflow_session_temp'

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(LOCAL_SESSION_KEY) || sessionStorage.getItem(TEMP_SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed?.account?.username || !parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

function persistSession(session: StoredSession, remember: boolean) {
  const payload = JSON.stringify(session)
  if (remember) {
    localStorage.setItem(LOCAL_SESSION_KEY, payload)
    sessionStorage.removeItem(TEMP_SESSION_KEY)
    return
  }
  sessionStorage.setItem(TEMP_SESSION_KEY, payload)
  localStorage.removeItem(LOCAL_SESSION_KEY)
}

function clearStoredSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY)
  sessionStorage.removeItem(TEMP_SESSION_KEY)
}

export default function App() {
  const initialSession = readStoredSession()
  const [selected, setSelected] = useState<string | null>(null)
  const [account, setAccount] = useState<AuthAccount | null>(initialSession?.account || null)
  const [token, setToken] = useState<string | null>(initialSession?.token || null)
  const [showLogin, setShowLogin] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [goalIntent, setGoalIntent] = useState<GoalIntent | null>(null)

  const user = account?.username || null

  useEffect(() => {
    async function validateSession() {
      if (!token) return

      try {
        const res = await fetch(apiUrl('/api/me'), {
          headers: { authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = await res.json()
          if (json.account) {
            const nextSession = { account: json.account as AuthAccount, token }
            setAccount(json.account)
            persistSession(nextSession, Boolean(localStorage.getItem(LOCAL_SESSION_KEY)))
          }
          return
        }
        if (res.status === 401 || res.status === 404) {
          setAccount(null)
          setToken(null)
          clearStoredSession()
        }
      } catch (error) {
        console.error(error)
      }
    }

    void validateSession()
  }, [token])

  const setView = (view: string | null) => setSelected(view)

  function openAuth(mode: 'login' | 'register', goal?: GoalIntent) {
    setAuthMode(mode)
    if (goal) setGoalIntent(goal)
    setShowLogin(true)
  }

  function handleLogout() {
    setAccount(null)
    setToken(null)
    setGoalIntent(null)
    clearStoredSession()
  }

  return (
    <div className="app-root">
      <header className="app-header fade-rise">
        <div className="brand-wrap">
          <div className="brand-dot" aria-hidden />
          <div>
            <div className="brand">Zenflow</div>
            <div className="brand-sub">Sanctuary for focus, breath, and motion</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <button className={`nav-link ${selected === null ? 'active' : ''}`} onClick={() => setView(null)}>Dashboard</button>
          <button className={`nav-link ${selected === 'pomodoro' ? 'active' : ''}`} onClick={() => setView('pomodoro')}>Focus Room</button>
          <button className={`nav-link ${selected === 'meditation' ? 'active' : ''}`} onClick={() => setView('meditation')}>Calm Room</button>
          <button className={`nav-link ${selected === 'sudoku' ? 'active' : ''}`} onClick={() => setView('sudoku')}>Mind Puzzle</button>
          <button className={`nav-link ${selected === 'arcade' ? 'active' : ''}`} onClick={() => setView('arcade')}>Arcade</button>
          <button className={`nav-link ${selected === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>Profile</button>
        </nav>
        <div className="auth">
          {account ? (
            <>
              <div className="auth-summary">
                <strong>{account.fullName}</strong>
                <span className="muted">@{account.username}</span>
              </div>
              <button className="login-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="login-btn" onClick={() => openAuth('login')}>Login</button>
              <button className="primary-cta auth-cta" onClick={() => openAuth('register')}>Create account</button>
            </>
          )}
        </div>
      </header>
      <main>
        {!selected ? (
          <>
            {user ? (
              <>
                <section className="hero fade-rise">
                  <div className="hero-inner">
                    <div className="hero-copy">
                      <div className="eyebrow">Psychologically soothing wellness design</div>
                      <h1>Build a day that feels quieter and more rewarding.</h1>
                      <p className="lead">A ritual-first workspace inspired by calming wellness products and gentle progression systems, so your effort feels meaningful instead of mechanical.</p>
                      <div className="hero-tags">
                        <span>Sanctuary points</span>
                        <span>Daily rituals</span>
                        <span>Reward shelf</span>
                      </div>
                    </div>
                    <div className="hero-panel">
                      <div className="hero-stat">
                        <strong>01</strong>
                        <span>Set an intention before the day speeds up.</span>
                      </div>
                      <div className="hero-stat">
                        <strong>02</strong>
                        <span>Complete focus, calm, and mind rituals for rewards.</span>
                      </div>
                      <div className="hero-stat">
                        <strong>03</strong>
                        <span>Watch points and streaks grow without aggressive pressure.</span>
                      </div>
                    </div>
                  </div>
                </section>
                <Dashboard onSelect={(id: string) => setView(id)} user={user} token={token} />
                <section className="detail-strip fade-rise">
                  <article className="detail-card">
                    <h3>Ritual pacing</h3>
                    <p>Every tool is framed as a room, not a task list, so the UI feels restorative instead of punitive.</p>
                  </article>
                  <article className="detail-card">
                    <h3>Reward psychology</h3>
                    <p>Points, levels, streaks, and symbolic unlocks create momentum while keeping the emotional tone soft.</p>
                  </article>
                  <article className="detail-card">
                    <h3>Reflective design</h3>
                    <p>Intentions, calmer copy, and ambient visuals make the experience feel more like a retreat than a dashboard.</p>
                  </article>
                </section>
              </>
            ) : (
              <MarketingLanding onOpenAuth={openAuth} />
            )}
          </>
        ) : (
          <section className="focus-card fade-rise">
            <button className="back" onClick={() => setView(null)}>&lt; Back to dashboard</button>
            {selected === 'pomodoro' && <PomodoroTimer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'meditation' && <MeditationTimer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'sudoku' && <SudokuTrainer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'arcade' && <BrainArcade user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'profile' && <ProfileCenter user={user} token={token} onRequireLogin={() => openAuth('login')} />}
          </section>
        )}
      </main>
      {showLogin && (
        <div className="overlay">
          <Login
            initialMode={authMode}
            goalIntent={goalIntent}
            onLogin={(nextAccount, nextToken, remember) => {
              const nextSession = { account: nextAccount, token: nextToken }
              setAccount(nextAccount)
              setToken(nextToken)
              persistSession(nextSession, remember)
              setGoalIntent(null)
              setShowLogin(false)
            }}
            onClose={() => {
              setGoalIntent(null)
              setShowLogin(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
