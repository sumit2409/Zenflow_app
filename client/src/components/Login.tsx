import React, { useEffect, useMemo, useState } from 'react'
import type { AuthAccount } from '../types/auth'
import type { GoalIntent } from '../types/experience'
import { apiUrl } from '../utils/api'

type Props = {
  initialMode?: 'login' | 'register'
  goalIntent?: GoalIntent | null
  onLogin: (account: AuthAccount, token: string, remember: boolean) => void
  onClose?: () => void
}

type AuthMode = 'login' | 'register'

type FormState = {
  identifier: string
  fullName: string
  email: string
  username: string
  password: string
  confirmPassword: string
  remember: boolean
}

const defaultForm: FormState = {
  identifier: '',
  fullName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  remember: true,
}

const goalContent: Record<GoalIntent, { title: string; copy: string; checklist: string[] }> = {
  focus: {
    title: 'Built for deeper focus',
    copy: 'Your first session will emphasize task-linked focus blocks, a clean queue, and fast visible progress.',
    checklist: ['Pick one meaningful task', 'Start a 25-minute focus block', 'Leave with proof of work'],
  },
  calm: {
    title: 'Built for a calmer head',
    copy: 'The setup will point you toward slower breathing, lighter copy, and one low-pressure win instead of a hard productivity push.',
    checklist: ['Write a soft intention', 'Run a short calm ritual', 'Add one gentle task'],
  },
  consistency: {
    title: 'Built for consistency',
    copy: 'The app will emphasize repeatable rituals, visible streaks, and small rewards so returning feels natural.',
    checklist: ['Choose one daily ritual', 'Finish one starter loop', 'Return tomorrow with less friction'],
  },
  recovery: {
    title: 'Built for active recovery',
    copy: 'The first path uses brain games, puzzles, and short reset rituals to replace passive scrolling with active recovery.',
    checklist: ['Play one short brain reset', 'Take one breathing break', 'Return to work with less drift'],
  },
}

function getPasswordScore(password: string) {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password) && /[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  return Math.min(score, 4)
}

function getPasswordLabel(score: number) {
  if (score <= 1) return 'Weak'
  if (score === 2) return 'Fair'
  if (score === 3) return 'Strong'
  return 'Excellent'
}

export default function Login({ initialMode = 'login', goalIntent, onLogin, onClose }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const passwordScore = useMemo(() => getPasswordScore(form.password), [form.password])
  const passwordLabel = useMemo(() => getPasswordLabel(passwordScore), [passwordScore])
  const passwordsMatch = mode === 'register' ? form.password === form.confirmPassword : true
  const goalPlan = goalIntent ? goalContent[goalIntent] : null

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (mode === 'login') {
      if (!form.identifier.trim() || !form.password) {
        setError('email or username and password are required')
        return
      }
    } else {
      if (!form.fullName.trim() || !form.email.trim() || !form.username.trim() || !form.password || !form.confirmPassword) {
        setError('complete all fields to create your account')
        return
      }
      if (!passwordsMatch) {
        setError('password confirmation does not match')
        return
      }
    }

    setLoading(true)
    try {
      const url = apiUrl(mode === 'login' ? '/api/login' : '/api/register')
      const body = mode === 'login'
        ? { identifier: form.identifier.trim(), password: form.password }
        : {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
          }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      let json: any = null
      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok) {
        setError(json?.error || `server error ${res.status}`)
        return
      }

      const fallbackAccount: AuthAccount = {
        username: json?.username || form.username.trim(),
        fullName: json?.account?.fullName || form.fullName.trim() || json?.username || form.identifier.trim(),
        email: json?.account?.email || form.email.trim(),
        created: json?.account?.created || Date.now(),
        lastLoginAt: json?.account?.lastLoginAt || Date.now(),
        loginCount: Number(json?.account?.loginCount || 1),
      }

      onLogin(json?.account || fallbackAccount, json.token, form.remember)
      onClose?.()
    } catch (requestError) {
      console.error(requestError)
      setError('network error while contacting the local auth server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-experience">
      <div className="auth-sheet card">
        <aside className="auth-story">
          <div className="section-kicker">New first-run experience</div>
          <h3>{goalPlan ? goalPlan.title : 'A cleaner way into Zenflow'}</h3>
          <p className="muted">
            {goalPlan
              ? goalPlan.copy
              : 'This onboarding sheet stays scrollable on smaller screens and gives the user a clear next step instead of hiding fields under the fold.'}
          </p>
          <div className="auth-story-panel">
            <strong>{mode === 'login' ? 'Returning user path' : 'First session path'}</strong>
            <span>{mode === 'login' ? 'Sign in, restore your rituals, and continue from the dashboard.' : 'Create an account, then enter with a recommended setup path.'}</span>
          </div>
          <div className="auth-checklist">
            {(goalPlan?.checklist || [
              'Create a stronger account',
              'Keep your progress tied to one session',
              'Enter with a clear first action',
            ]).map((item) => (
              <div key={item} className="auth-check-item">
                <span className="check-dot" aria-hidden />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button type="button" className="ghost-btn auth-close-top" onClick={onClose}>Close</button>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-head">
            <div>
              <div className="section-kicker">{mode === 'login' ? 'Sign in' : 'Create account'}</div>
              <h3>{mode === 'login' ? 'Welcome back.' : 'Build your account.'}</h3>
            </div>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
              <button type="button" className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
            </div>
          </div>

          <form onSubmit={submit} className="login-form auth-form">
            {mode === 'register' && (
              <>
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    placeholder="Aman Sharma"
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                  />
                </label>
                <div className="auth-grid">
                  <label>
                    Email
                    <input
                      autoComplete="email"
                      placeholder="you@example.com"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                    />
                  </label>
                  <label>
                    Username
                    <input
                      autoComplete="username"
                      placeholder="zenflow_user"
                      value={form.username}
                      onChange={(event) => updateField('username', event.target.value)}
                    />
                  </label>
                </div>
              </>
            )}

            {mode === 'login' && (
              <label>
                Email or username
                <input
                  autoComplete="username"
                  placeholder="you@example.com or zenflow_user"
                  value={form.identifier}
                  onChange={(event) => updateField('identifier', event.target.value)}
                />
              </label>
            )}

            <label>
              Password
              <div className="password-field">
                <input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Use 8+ chars with mixed case and a number'}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
                <button type="button" className="ghost-btn inline-btn" onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <>
                <div className="password-meter" aria-live="polite">
                  <div className="password-meter-bar">
                    <span style={{ width: `${(passwordScore / 4) * 100}%` }} />
                  </div>
                  <small>Password strength: {form.password ? passwordLabel : 'Add a stronger password'}</small>
                </div>
                <label>
                  Confirm password
                  <div className="password-field">
                    <input
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(event) => updateField('confirmPassword', event.target.value)}
                    />
                    <button type="button" className="ghost-btn inline-btn" onClick={() => setShowConfirmPassword((current) => !current)}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {form.confirmPassword && !passwordsMatch && <small className="field-note error-text">Passwords do not match yet.</small>}
                </label>
              </>
            )}

            <div className="auth-row">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(event) => updateField('remember', event.target.checked)}
                />
                <span>Keep me signed in on this device</span>
              </label>
              <small className="field-note">
                {goalPlan ? `Recommended track: ${goalPlan.title}` : 'Protected by stronger validation and session restore.'}
              </small>
            </div>

            {error && <div className="form-feedback error" role="alert">{error}</div>}
            {!error && loading && <div className="form-feedback">Securing your workspace...</div>}

            <div className="controls">
              <button type="submit" className="primary-cta" disabled={loading}>
                {mode === 'login' ? 'Enter Zenflow' : 'Create account'}
              </button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
