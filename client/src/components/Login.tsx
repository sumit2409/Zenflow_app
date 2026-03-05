import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { AuthAccount } from '../types/auth'
import type { GoalIntent } from '../types/experience'
import { apiUrl } from '../utils/api'

type Props = {
  initialMode?: 'login' | 'register'
  goalIntent?: GoalIntent | null
  onLogin: (account: AuthAccount, token: string, remember: boolean) => void
  onClose?: () => void
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

type FormState = {
  identifier: string
  fullName: string
  email: string
  username: string
  password: string
  confirmPassword: string
  verificationCode: string
  resetCode: string
  remember: boolean
}

type AuthConfig = {
  google: { enabled: boolean; clientId: string | null }
  passwordResetEmail: { enabled: boolean }
  emailVerification: { enabled: boolean }
}

const defaultForm: FormState = {
  identifier: '',
  fullName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  verificationCode: '',
  resetCode: '',
  remember: true,
}

const defaultAuthConfig: AuthConfig = {
  google: { enabled: false, clientId: null },
  passwordResetEmail: { enabled: false },
  emailVerification: { enabled: false },
}

const goalContent: Record<GoalIntent, { title: string; copy: string; checklist: string[] }> = {
  focus: {
    title: 'Set up for focus',
    copy: 'Start with the focus timer, a clear task list, and a simple dashboard.',
    checklist: ['Pick one task', 'Run a 25-minute session', 'Review progress'],
  },
  calm: {
    title: 'Set up for calm',
    copy: 'Start with meditation, a short note, and one manageable task.',
    checklist: ['Write a note', 'Run a short meditation', 'Add one task'],
  },
  consistency: {
    title: 'Set up for routine',
    copy: 'Start with repeatable sessions, a visible streak, and a clear dashboard.',
    checklist: ['Choose a daily session', 'Complete one round', 'Come back tomorrow'],
  },
  recovery: {
    title: 'Set up for better breaks',
    copy: 'Start with sudoku, memory training, and a short meditation break.',
    checklist: ['Play one game', 'Take one short break', 'Return to work'],
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

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

export default function Login({ initialMode = 'login', goalIntent, onLogin, onClose }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authConfig, setAuthConfig] = useState<AuthConfig>(defaultAuthConfig)
  const [googleReady, setGoogleReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    async function loadAuthConfig() {
      try {
        const response = await fetch(apiUrl('/api/auth/config'))
        if (!response.ok) return
        const payload = await response.json()
        setAuthConfig({
          google: {
            enabled: Boolean(payload?.google?.enabled),
            clientId: payload?.google?.clientId || null,
          },
          passwordResetEmail: {
            enabled: Boolean(payload?.passwordResetEmail?.enabled),
          },
          emailVerification: {
            enabled: Boolean(payload?.emailVerification?.enabled),
          },
        })
      } catch (configError) {
        console.error(configError)
      }
    }

    void loadAuthConfig()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset') !== '1') return

    const identifier = params.get('identifier') || ''
    const code = params.get('code') || ''
    setForm((current) => ({
      ...current,
      identifier: identifier || current.identifier,
      resetCode: code || current.resetCode,
    }))
    setMode('reset')
    setInfo('Enter a new password to finish the reset.')
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verify') !== '1') return

    const identifier = params.get('identifier') || ''
    const code = params.get('code') || ''
    setForm((current) => ({
      ...current,
      identifier: identifier || current.identifier,
      verificationCode: code || current.verificationCode,
    }))
    setMode('verify')
    setInfo('Enter the verification code to activate your account.')
  }, [])

  useEffect(() => {
    const clientId = authConfig.google.clientId
    if (!authConfig.google.enabled || !clientId || window.google) {
      setGoogleReady(Boolean(window.google && authConfig.google.enabled))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setGoogleReady(true)
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [authConfig.google.clientId, authConfig.google.enabled])

  const passwordScore = useMemo(() => getPasswordScore(form.password), [form.password])
  const passwordLabel = useMemo(() => getPasswordLabel(passwordScore), [passwordScore])
  const passwordsMatch = form.password === form.confirmPassword
  const goalPlan = goalIntent ? goalContent[goalIntent] : null

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function switchMode(nextMode: AuthMode) {
    setError(null)
    setInfo(null)
    setLoading(false)
    setMode(nextMode)
  }

  async function completeLogin(json: any) {
    const fallbackAccount: AuthAccount = {
      username: json?.username || form.username.trim(),
      fullName: json?.account?.fullName || form.fullName.trim() || json?.username || form.identifier.trim(),
      email: json?.account?.email || form.email.trim(),
      emailVerified: Boolean(json?.account?.emailVerified),
      authProvider: json?.account?.authProvider,
      created: json?.account?.created || Date.now(),
      lastLoginAt: json?.account?.lastLoginAt || Date.now(),
      loginCount: Number(json?.account?.loginCount || 1),
    }

    onLogin(json?.account || fallbackAccount, json.token, form.remember)
    onClose?.()
  }

  async function signInWithGoogle(credential: string) {
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      const response = await fetch(apiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credential }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        setError(json?.error || 'Google sign-in failed')
        return
      }

      await completeLogin(json)
    } catch (requestError) {
      console.error(requestError)
      setError('network error while contacting the auth server')
    } finally {
      setLoading(false)
    }
  }

  async function resendVerificationCode() {
    if (!form.identifier.trim()) {
      setError('enter your email or username first')
      return
    }

    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const response = await fetch(apiUrl('/api/email/verify/resend'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: form.identifier.trim() }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        setError(json?.error || `server error ${response.status}`)
        return
      }

      if (json?.previewCode) {
        updateField('verificationCode', json.previewCode)
        setInfo(`Development preview code: ${json.previewCode}`)
      } else {
        setInfo(json?.message || 'A new verification code was sent.')
      }
    } catch (requestError) {
      console.error(requestError)
      setError('network error while contacting the auth server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const clientId = authConfig.google.clientId
    if (!googleReady || !clientId || !window.google || !googleButtonRef.current) return
    if (mode !== 'login' && mode !== 'register') return

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (!response.credential) {
          setError('Google sign-in did not return a valid credential')
          return
        }
        void signInWithGoogle(response.credential)
      },
    })

    googleButtonRef.current.innerHTML = ''
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      shape: 'pill',
      text: mode === 'register' ? 'signup_with' : 'signin_with',
      logo_alignment: 'left',
    })
  }, [authConfig.google.clientId, googleReady, mode])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === 'login') {
      if (!form.identifier.trim() || !form.password) {
        setError('email or username and password are required')
        return
      }
    } else if (mode === 'register') {
      if (!form.fullName.trim() || !form.email.trim() || !form.username.trim() || !form.password || !form.confirmPassword) {
        setError('complete all fields to create your account')
        return
      }
      if (!passwordsMatch) {
        setError('password confirmation does not match')
        return
      }
    } else if (mode === 'forgot') {
      if (!form.identifier.trim()) {
        setError('enter your email or username to recover your password')
        return
      }
    } else if (mode === 'verify') {
      if (!form.identifier.trim() || !form.verificationCode.trim()) {
        setError('identifier and verification code are required')
        return
      }
    } else {
      if (!form.identifier.trim() || !form.resetCode.trim() || !form.password || !form.confirmPassword) {
        setError('identifier, reset code, and new password are required')
        return
      }
      if (!passwordsMatch) {
        setError('password confirmation does not match')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'forgot') {
        const response = await fetch(apiUrl('/api/password/forgot'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identifier: form.identifier.trim() }),
        })

        const json = await response.json().catch(() => null)
        if (!response.ok) {
          setError(json?.error || `server error ${response.status}`)
          return
        }

        if (json?.previewCode) {
          updateField('resetCode', json.previewCode)
          setInfo(`Development preview code: ${json.previewCode}`)
        } else {
          setInfo(json?.message || 'If that account exists, a password reset code has been prepared.')
        }
        setMode('reset')
        return
      }

      if (mode === 'verify') {
        const response = await fetch(apiUrl('/api/email/verify'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            identifier: form.identifier.trim(),
            code: form.verificationCode.trim(),
          }),
        })

        const json = await response.json().catch(() => null)
        if (!response.ok) {
          setError(json?.error || `server error ${response.status}`)
          return
        }

        setInfo(json?.message || 'Email verified. You are now signed in.')
        await completeLogin(json)
        return
      }

      if (mode === 'reset') {
        const response = await fetch(apiUrl('/api/password/reset'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            identifier: form.identifier.trim(),
            code: form.resetCode.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        })

        const json = await response.json().catch(() => null)
        if (!response.ok) {
          setError(json?.error || `server error ${response.status}`)
          return
        }

        setInfo(json?.message || 'Password updated. You can sign in now.')
        setForm((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
        }))
        setMode('login')
        return
      }

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

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        if (json?.requiresEmailVerification) {
          setForm((current) => ({
            ...current,
            identifier: json?.identifier || current.identifier || current.email,
          }))
          setInfo(json?.error || 'Verify your email before signing in.')
          setMode('verify')
          return
        }
        setError(json?.error || `server error ${response.status}`)
        return
      }

      if (mode === 'register' && json?.requiresEmailVerification) {
        setForm((current) => ({
          ...current,
          identifier: json?.identifier || current.email,
          verificationCode: json?.previewCode || current.verificationCode,
          password: '',
          confirmPassword: '',
        }))
        setInfo(json?.previewCode
          ? `Account created. Development verification code: ${json.previewCode}`
          : json?.message || 'Account created. Enter the verification code from your email.')
        setMode('verify')
        return
      }

      await completeLogin(json)
    } catch (requestError) {
      console.error(requestError)
      setError('network error while contacting the auth server')
    } finally {
      setLoading(false)
    }
  }

  const titleByMode: Record<AuthMode, string> = {
    login: 'Welcome back.',
    register: 'Build your account.',
    verify: 'Verify your email.',
    forgot: 'Recover your password.',
    reset: 'Set a new password.',
  }

  const kickerByMode: Record<AuthMode, string> = {
    login: 'Sign in',
    register: 'Create account',
    verify: 'Email verification',
    forgot: 'Password recovery',
    reset: 'Reset password',
  }

  return (
    <div className="auth-experience">
      <div className="auth-sheet card">
        <aside className="auth-story">
          <div className="section-kicker">Account access</div>
          <h3>{goalPlan ? goalPlan.title : 'Sign in to Zenflow'}</h3>
          <p className="muted">
            {goalPlan
              ? goalPlan.copy
              : 'Use one account to keep your profile, timers, notes, and game progress in sync.'}
          </p>
          <div className="auth-story-panel">
            <strong>
              {mode === 'register'
                ? 'New account'
                : mode === 'verify'
                  ? 'Verify email'
                : mode === 'forgot'
                  ? 'Recovery request'
                  : mode === 'reset'
                    ? 'Password reset'
                    : 'Existing account'}
            </strong>
            <span>
              {mode === 'register'
                ? 'Create an account and start with a recommended setup.'
                : mode === 'verify'
                  ? 'Enter the code from your inbox to activate your account.'
                : mode === 'forgot'
                  ? 'Request a reset code for the email on your account.'
                  : mode === 'reset'
                    ? 'Enter the reset code and choose a new password.'
                    : 'Sign in and continue where you left off.'}
            </span>
          </div>
          <div className="auth-checklist">
            {(goalPlan?.checklist || [
              'Create your account',
              'Keep progress tied to your login',
              'Open the app with a clear next step',
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
              <div className="section-kicker">{kickerByMode[mode]}</div>
              <h3>{titleByMode[mode]}</h3>
            </div>
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>Login</button>
              <button type="button" className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>Register</button>
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

            {(mode === 'login' || mode === 'forgot' || mode === 'verify' || mode === 'reset') && (
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

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
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
            )}

            {(mode === 'register' || mode === 'reset') && (
              <>
                <div className="password-meter" aria-live="polite">
                  <div className="password-meter-bar">
                    <span style={{ width: `${(passwordScore / 4) * 100}%` }} />
                  </div>
                  <small>Password strength: {form.password ? passwordLabel : 'Add a stronger password'}</small>
                </div>
                {mode === 'reset' && (
                  <label>
                    Reset code
                    <input
                      autoComplete="one-time-code"
                      placeholder="Enter the 6-digit code"
                      value={form.resetCode}
                      onChange={(event) => updateField('resetCode', event.target.value)}
                    />
                  </label>
                )}
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

            {mode === 'verify' && (
              <>
                <label>
                  Verification code
                  <input
                    autoComplete="one-time-code"
                    placeholder="Enter the 6-digit code"
                    value={form.verificationCode}
                    onChange={(event) => updateField('verificationCode', event.target.value)}
                  />
                </label>
                <div className="auth-help-card">
                  <strong>Verify your account</strong>
                  <p>
                    Enter the code sent to your registration email. This protects accounts from fake signups and mistyped emails.
                  </p>
                  {!authConfig.emailVerification.enabled && (
                    <p className="field-note">
                      Email delivery is not configured yet on this environment, so development preview codes may be shown here for testing.
                    </p>
                  )}
                </div>
              </>
            )}

            {mode === 'forgot' && (
              <div className="auth-help-card">
                <strong>How recovery works</strong>
                <p>
                  Enter the email or username on your account. Zenflow will send a 6-digit reset code to that email when mail delivery is configured.
                </p>
                {!authConfig.passwordResetEmail.enabled && (
                  <p className="field-note">
                    Email delivery is not configured yet on this environment, so development preview codes may be shown here for testing.
                  </p>
                )}
              </div>
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
                {goalPlan ? `Recommended setup: ${goalPlan.title}` : 'Your account keeps your progress available across sessions.'}
              </small>
            </div>

            {(mode === 'login' || mode === 'register') && authConfig.google.enabled && (
              <div className="auth-divider-block">
                <div className="auth-divider"><span>or</span></div>
                <div ref={googleButtonRef} className="google-signin-slot" />
              </div>
            )}

            {error && <div className="form-feedback error" role="alert">{error}</div>}
            {!error && info && <div className="form-feedback">{info}</div>}
            {!error && !info && loading && <div className="form-feedback">Working on your request...</div>}

            <div className="controls">
              <button type="submit" className="primary-cta" disabled={loading}>
                {mode === 'login'
                  ? 'Enter Zenflow'
                  : mode === 'register'
                    ? 'Create account'
                    : mode === 'verify'
                      ? 'Verify email'
                    : mode === 'forgot'
                      ? 'Send reset code'
                      : 'Save new password'}
              </button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>

            <div className="auth-secondary-actions">
              {mode === 'login' && (
                <button type="button" className="auth-inline-link" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" className="auth-inline-link" onClick={() => switchMode('login')}>
                  Back to login
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" className="auth-inline-link" onClick={() => switchMode('forgot')}>
                  Request another reset code
                </button>
              )}
              {mode === 'verify' && (
                <button type="button" className="auth-inline-link" onClick={() => void resendVerificationCode()} disabled={loading}>
                  Resend verification code
                </button>
              )}
              {mode === 'verify' && (
                <button type="button" className="auth-inline-link" onClick={() => switchMode('login')}>
                  Back to login
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
