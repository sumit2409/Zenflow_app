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
import type { ProfileMeta } from './utils/profile'
import PlannerBoard from './components/PlannerBoard'
import { schedulePlannerNotifications } from './utils/planner'
import { todayKey } from './utils/wellness'

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

function formatDateLabel(value: number | string | null | undefined) {
  if (!value) return 'Not set'

  const date = typeof value === 'number' ? new Date(value) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return 'Not set'

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function App() {
  const initialSession = readStoredSession()
  const [selected, setSelected] = useState<string | null>(null)
  const [account, setAccount] = useState<AuthAccount | null>(initialSession?.account || null)
  const [token, setToken] = useState<string | null>(initialSession?.token || null)
  const [profileMeta, setProfileMeta] = useState<ProfileMeta>({})
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [goalIntent, setGoalIntent] = useState<GoalIntent | null>(null)
  const [plannerFocusDate, setPlannerFocusDate] = useState(todayKey())
  const [penguinOffset, setPenguinOffset] = useState({ x: 0, y: 0 })
  const [penguinHopping, setPenguinHopping] = useState(false)
  const [penguinKissing, setPenguinKissing] = useState(false)

  const user = account?.username || null
  const guestLandingMode = !account && !selected

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

  useEffect(() => {
    async function loadProfileMeta() {
      if (!account || !token) {
        setProfileMeta({})
        return
      }

      try {
        const response = await fetch(apiUrl('/api/meta'), {
          headers: { authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const payload = await response.json()
        setProfileMeta(payload.meta || {})
      } catch (error) {
        console.error(error)
      }
    }

    void loadProfileMeta()
  }, [account, token, profileRefreshKey])

  useEffect(() => {
    if (!account || !token) return
    void schedulePlannerNotifications(profileMeta.planner)
  }, [account, token, profileMeta.planner])

  useEffect(() => {
    const theme = profileMeta.appearance?.theme || 'sand'
    document.documentElement.setAttribute('data-theme', theme)

    return () => {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [profileMeta.appearance?.theme])

  useEffect(() => {
    const positions = [
      { x: 0, y: 0 },
      { x: -24, y: -8 },
      { x: 12, y: 10 },
      { x: -12, y: 16 },
      { x: 18, y: -4 },
    ]

    const interval = window.setInterval(() => {
      const next = positions[Math.floor(Math.random() * positions.length)]
      setPenguinOffset(next)
      setPenguinHopping(true)
      window.setTimeout(() => setPenguinHopping(false), 1500)
    }, 9000)

    return () => window.clearInterval(interval)
  }, [])

  function handlePenguinClick() {
    setPenguinKissing(true)
    setPenguinHopping(true)
    window.setTimeout(() => {
      setPenguinKissing(false)
      setPenguinHopping(false)
    }, 1600)
  }

  const setView = (view: string | null) => setSelected(view)

  function openPlannerAt(dateKey: string) {
    setPlannerFocusDate(dateKey)
    setSelected('planner')
  }

  function openAuth(mode: 'login' | 'register', goal?: GoalIntent) {
    setAuthMode(mode)
    if (goal) setGoalIntent(goal)
    setShowLogin(true)
  }

  function handleLogout() {
    setAccount(null)
    setToken(null)
    setProfileMeta({})
    setProfileRefreshKey(0)
    setGoalIntent(null)
    clearStoredSession()
  }

  const profile = profileMeta.profile || {}
  const accountDetails = [
    { label: 'Email', value: account?.email || 'Not set' },
    { label: 'Height', value: profile.heightCm ? `${profile.heightCm} cm` : 'Not set' },
    { label: 'Weight', value: profile.weightKg ? `${profile.weightKg} kg` : 'Not set' },
    { label: 'Birth date', value: formatDateLabel(profile.dateOfBirth) },
    { label: 'Member since', value: formatDateLabel(account?.created) },
    { label: 'Last sign in', value: formatDateLabel(account?.lastLoginAt) },
  ]

  return (
    <div className="app-root">
      <button
        type="button"
        className={`penguin-mascot ${penguinHopping ? 'is-hopping' : ''} ${penguinKissing ? 'is-kissing' : ''}`}
        style={
          {
            '--penguin-shift-x': `${penguinOffset.x}px`,
            '--penguin-shift-y': `${penguinOffset.y}px`,
          } as React.CSSProperties
        }
        onClick={handlePenguinClick}
        aria-label="Penguin mascot"
      >
        <div className="penguin-shadow" />
        <div className="penguin-body">
          <div className="penguin-belly" />
          <div className="penguin-eye penguin-eye-left" />
          <div className="penguin-eye penguin-eye-right" />
          <div className="penguin-beak" />
          <div className="penguin-wing penguin-wing-left" />
          <div className="penguin-wing penguin-wing-right" />
          <div className="penguin-feet" />
          <div className="penguin-kiss">mwah</div>
          <div className="penguin-heart penguin-heart-left">❤</div>
          <div className="penguin-heart penguin-heart-right">❤</div>
        </div>
      </button>
      <header className={`app-header fade-rise ${guestLandingMode ? 'guest-header' : ''}`}>
        <div className="brand-wrap">
          <div className="brand-dot" aria-hidden />
          <div>
            <div className="brand">Zenflow</div>
            <div className="brand-sub">Focus, meditation, sudoku, and quick games</div>
          </div>
        </div>
        {(account || selected) && (
          <nav className="nav" aria-label="Main navigation">
            <button className={`nav-link ${selected === null ? 'active' : ''}`} onClick={() => setView(null)}>Dashboard</button>
            <button className={`nav-link ${selected === 'pomodoro' ? 'active' : ''}`} onClick={() => setView('pomodoro')}>Focus Timer</button>
            <button className={`nav-link ${selected === 'meditation' ? 'active' : ''}`} onClick={() => setView('meditation')}>Meditation</button>
            <button className={`nav-link ${selected === 'sudoku' ? 'active' : ''}`} onClick={() => setView('sudoku')}>Sudoku</button>
            <button className={`nav-link ${selected === 'arcade' ? 'active' : ''}`} onClick={() => setView('arcade')}>Games</button>
            <button className={`nav-link ${selected === 'planner' ? 'active' : ''}`} onClick={() => setView('planner')}>Planner</button>
            <button className={`nav-link ${selected === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>Account</button>
          </nav>
        )}
        <div className={`auth ${guestLandingMode ? 'guest-auth' : ''}`}>
          {account ? (
            <>
              <div className="auth-summary account-summary">
                <strong>{account.fullName}</strong>
                <span className="muted">@{account.username}</span>
                <span className="account-summary-line">{account.email}</span>
                <span className="account-summary-line">Sign-ins: {account.loginCount}</span>
              </div>
              <button className="login-btn" onClick={() => setView('profile')}>Account</button>
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
                      <div className="eyebrow">Personal dashboard</div>
                      <h1>Keep your focus tools, notes, and games in one place.</h1>
                      <p className="lead">Track work sessions, meditation time, sudoku progress, and quick memory or reaction drills without jumping between apps.</p>
                      <div className="hero-tags">
                        <span>Session history</span>
                        <span>Task tracking</span>
                        <span>Game progress</span>
                      </div>
                    </div>
                    <div className="hero-panel">
                      <div className="hero-stat">
                        <strong>01</strong>
                        <span>Start with your daily note and key tasks.</span>
                      </div>
                      <div className="hero-stat">
                        <strong>02</strong>
                        <span>Run a focus session, meditation timer, or quick game.</span>
                      </div>
                      <div className="hero-stat">
                        <strong>03</strong>
                        <span>Review progress, streaks, and account details in one screen.</span>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="account-strip card fade-rise">
                  <div className="account-strip-head">
                    <div>
                      <div className="section-kicker">Account</div>
                      <h2>{account.fullName}</h2>
                      <p className="muted">Signed in as @{account.username}</p>
                    </div>
                    <button className="login-btn" onClick={() => setView('profile')}>Edit account</button>
                  </div>
                  <div className="account-grid">
                    {accountDetails.map((item) => (
                      <div key={item.label} className="account-stat">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <Dashboard onSelect={(id: string) => setView(id)} onOpenPlannerDate={openPlannerAt} user={user} token={token} />
                <section className="detail-strip fade-rise">
                  <article className="detail-card">
                    <h3>Focused layout</h3>
                    <p>The home screen keeps your key actions visible without crowding the small screen.</p>
                  </article>
                  <article className="detail-card">
                    <h3>Clear progress</h3>
                    <p>Session totals, streaks, and recent activity are available at a glance.</p>
                  </article>
                  <article className="detail-card">
                    <h3>Personal account</h3>
                    <p>Your profile, notes, tasks, and game history stay attached to your account.</p>
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
            {selected === 'pomodoro' && <PomodoroTimer user={user} token={token} onRequireLogin={() => openAuth('login')} onSelect={setView} />}
            {selected === 'meditation' && <MeditationTimer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'sudoku' && <SudokuTrainer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'arcade' && <BrainArcade user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'planner' && <PlannerBoard initialDate={plannerFocusDate} user={user} token={token} onRequireLogin={() => openAuth('login')} onMetaSaved={() => setProfileRefreshKey((value) => value + 1)} />}
            {selected === 'profile' && <ProfileCenter user={user} token={token} onRequireLogin={() => openAuth('login')} onMetaSaved={() => setProfileRefreshKey((value) => value + 1)} />}
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
