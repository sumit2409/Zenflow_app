import React, { useEffect, useRef, useState } from 'react'
import Dashboard from './components/Dashboard'
import PomodoroTimer from './components/PomodoroTimer'
import MeditationTimer from './components/MeditationTimer'
import Login from './components/Login'
import SudokuTrainer from './components/SudokuTrainer'
import ProfileCenter from './components/ProfileCenter'
import BrainArcade from './components/BrainArcade'
import MarketingLanding from './components/MarketingLanding'
import BreakRoom from './components/BreakRoom'
import { BlogIndexPage, BlogArticlePage, BlogPreviewSection, blogPageMeta, isBlogArticleId, type BlogArticleId } from './components/BlogPages'
import type { AuthAccount, StoredSession } from './types/auth'
import type { GoalIntent } from './types/experience'
import { apiUrl } from './utils/api'
import { identifyAnalyticsUser, resetAnalyticsUser, trackLogin, trackPageView } from './utils/analytics'
import type { ProfileMeta } from './utils/profile'
import PlannerBoard from './components/PlannerBoard'
import { schedulePlannerNotifications } from './utils/planner'
import { todayKey } from './utils/wellness'
import {
  type StaticPageId,
  SiteFooterLinks,
  staticPageMeta,
  PrivacyPolicyPage,
  TermsOfServicePage,
  CookiePolicyPage,
  AboutPage,
  FAQPage,
  ContactPage,
  InfoPageBreadcrumb,
} from './components/StaticPages'

const LOCAL_SESSION_KEY = 'zenflow_session'
const TEMP_SESSION_KEY = 'zenflow_session_temp'
const BREAK_ROOM_ENABLED = true
const isAndroidApp = /ZenflowAndroid/.test(navigator.userAgent)

if (isAndroidApp) {
  document.documentElement.setAttribute('data-platform', 'android')
}

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

type PublicPageRoute =
  | { kind: 'static'; id: StaticPageId }
  | { kind: 'blogIndex' }
  | { kind: 'blogArticle'; id: BlogArticleId }

const STATIC_PAGES: readonly StaticPageId[] = ['privacy', 'terms', 'cookie', 'about', 'contact', 'faq']
const ADSENSE_CLIENT = 'ca-pub-8360208538374772'
const ADSENSE_SCRIPT_ID = 'zenflow-adsense-script'
const SITE_ORIGIN = 'https://zenflow.bio'

function normalizePublicPath(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, '').toLowerCase()
  if (!trimmed || trimmed === '#') return '/'

  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (!withoutHash) return '/'
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
}

function resolvePublicPage(pathname: string, hash: string): PublicPageRoute | null {
  const directPath = normalizePublicPath(pathname)
  const candidatePath = directPath !== '/' ? directPath : hash.startsWith('#/') ? normalizePublicPath(hash) : '/'

  if (candidatePath === '/blog') {
    return { kind: 'blogIndex' }
  }

  const slug = candidatePath.replace(/^\//, '')
  if (STATIC_PAGES.includes(slug as StaticPageId)) {
    return { kind: 'static', id: slug as StaticPageId }
  }

  if (isBlogArticleId(slug)) {
    return { kind: 'blogArticle', id: slug }
  }

  return null
}

function getPublicPagePath(page: PublicPageRoute) {
  if (page.kind === 'blogIndex') return '/blog'
  if (page.kind === 'blogArticle') return `/${page.id}`
  return `/${page.id}`
}

function getPublicPageMeta(page: PublicPageRoute) {
  if (page.kind === 'blogIndex') return blogPageMeta.blog
  if (page.kind === 'blogArticle') return blogPageMeta[page.id]
  return staticPageMeta[page.id]
}

function getPublicPageLabel(page: PublicPageRoute) {
  return getPublicPageMeta(page).title
}

function setDescriptionMeta(content: string) {
  const metaTag = document.querySelector('meta[name="description"]')
  if (metaTag) {
    metaTag.setAttribute('content', content)
  }
}

function setMetaValue(selector: string, attribute: 'content' | 'href', value: string) {
  const element = document.querySelector(selector)
  if (element) {
    element.setAttribute(attribute, value)
  }
}

function applyDocumentMeta(title: string, description: string, path: string) {
  const absoluteUrl = new URL(path, SITE_ORIGIN).toString()
  document.title = title
  setDescriptionMeta(description)
  setMetaValue('meta[property="og:title"]', 'content', title)
  setMetaValue('meta[property="og:description"]', 'content', description)
  setMetaValue('meta[property="og:url"]', 'content', absoluteUrl)
  setMetaValue('meta[name="twitter:title"]', 'content', title)
  setMetaValue('meta[name="twitter:description"]', 'content', description)
  setMetaValue('link[rel="canonical"]', 'href', absoluteUrl)
}

function resolveTrackedPage(selected: string | null, activePublicPage: PublicPageRoute | null, hasAccount: boolean) {
  if (activePublicPage) {
    if (activePublicPage.kind === 'blogIndex') {
      return {
        key: 'public:blog',
        name: blogPageMeta.blog.title,
        path: '/blog',
        section: 'public' as const,
        kind: 'blog' as const,
        authenticated: hasAccount,
      }
    }

    if (activePublicPage.kind === 'blogArticle') {
      return {
        key: `public:${activePublicPage.id}`,
        name: blogPageMeta[activePublicPage.id].title,
        path: `/${activePublicPage.id}`,
        section: 'public' as const,
        kind: 'blog' as const,
        authenticated: hasAccount,
      }
    }

    return {
      key: `public:${activePublicPage.id}`,
      name: staticPageMeta[activePublicPage.id].title,
      path: `/${activePublicPage.id}`,
      section: 'public' as const,
      kind: 'static' as const,
      authenticated: hasAccount,
    }
  }

  if (selected) {
    const viewMap: Record<string, { name: string; path: string; kind: 'tool' | 'dashboard' }> = {
      pomodoro: { name: 'Focus Timer', path: '/app/focus-timer', kind: 'tool' },
      meditation: { name: 'Meditation', path: '/app/meditation', kind: 'tool' },
      sudoku: { name: 'Sudoku', path: '/app/sudoku', kind: 'tool' },
      arcade: { name: 'Games', path: '/app/games', kind: 'tool' },
      breakroom: { name: 'Break Room', path: '/app/break-room', kind: 'tool' },
      planner: { name: 'Planner', path: '/app/planner', kind: 'dashboard' },
      profile: { name: 'Account', path: '/app/account', kind: 'dashboard' },
    }
    const tracked = viewMap[selected]
    if (tracked) {
      return {
        key: `${hasAccount ? 'app' : 'public'}:${selected}`,
        name: tracked.name,
        path: tracked.path,
        section: hasAccount ? ('app' as const) : ('public' as const),
        kind: tracked.kind,
        authenticated: hasAccount,
      }
    }
  }

  if (hasAccount) {
    return {
      key: 'app:dashboard',
      name: 'Dashboard',
      path: '/app/dashboard',
      section: 'app' as const,
      kind: 'dashboard' as const,
      authenticated: true,
    }
  }

  return {
    key: 'public:landing',
    name: 'Landing',
    path: '/',
    section: 'public' as const,
    kind: 'landing' as const,
    authenticated: false,
  }
}

export default function App() {
  const initialSession = readStoredSession()
  const [selected, setSelected] = useState<string | null>(null)
  const [lastToolView, setLastToolView] = useState<'pomodoro' | 'meditation' | 'sudoku' | 'arcade' | 'breakroom'>('pomodoro')
  const [lastSessionMinutes, setLastSessionMinutes] = useState(25)
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
  const [navSearch, setNavSearch] = useState('')
  const [account, setAccount] = useState<AuthAccount | null>(initialSession?.account || null)
  const [token, setToken] = useState<string | null>(initialSession?.token || null)
  const [profileMeta, setProfileMeta] = useState<ProfileMeta>({})
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [isValidating, setIsValidating] = useState<boolean>(() => Boolean(initialSession?.token))
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [goalIntent, setGoalIntent] = useState<GoalIntent | null>(null)
  const [activePublicPage, setActivePublicPage] = useState<PublicPageRoute | null>(
    () => resolvePublicPage(window.location.pathname, window.location.hash),
  )
  const [plannerFocusDate, setPlannerFocusDate] = useState(todayKey())
  const [penguinOffset, setPenguinOffset] = useState({ x: 0, y: 0 })
  const [penguinHopping, setPenguinHopping] = useState(false)
  const [penguinKissing, setPenguinKissing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const authTriggerRef = useRef<HTMLElement | null>(null)
  const previousAccountRef = useRef<AuthAccount | null>(initialSession?.account || null)

  const user = account?.username || null
  const guestLandingMode = !account && !selected
  const toolViews = ['pomodoro', 'meditation', 'sudoku', 'arcade', 'breakroom'] as const
  const isToolSelected = Boolean(selected && toolViews.includes(selected as (typeof toolViews)[number]))
  const desktopNavItems: Array<{ id: string | null; label: string }> = [
    { id: null, label: 'Dashboard' },
    { id: 'pomodoro', label: 'Focus Timer' },
    { id: 'meditation', label: 'Meditation' },
    { id: 'sudoku', label: 'Sudoku' },
    { id: 'arcade', label: 'Games' },
    ...(BREAK_ROOM_ENABLED ? [{ id: 'breakroom', label: 'Break Room' }] : []),
    { id: 'planner', label: 'Planner' },
    { id: 'profile', label: 'Account' },
  ]
  const visibleDesktopNav = desktopNavItems.filter((item) => item.label.toLowerCase().includes(navSearch.trim().toLowerCase()))
  const blogRouteActive = activePublicPage?.kind === 'blogIndex' || activePublicPage?.kind === 'blogArticle'
  const landingSectionPrefix = activePublicPage ? '/' : ''

  function showToast(msg: string) {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg(null), 3000)
  }

  function navigatePublicPage(page: PublicPageRoute | null, historyMode: 'push' | 'replace' = 'push') {
    const nextPath = page ? getPublicPagePath(page) : '/'
    const hashRouteActive = window.location.hash.startsWith('#/')
    const pathUnchanged = window.location.pathname === nextPath && !hashRouteActive

    setActivePublicPage(page)

    if (!pathUnchanged) {
      const updateHistory = historyMode === 'replace' ? window.history.replaceState : window.history.pushState
      updateHistory.call(window.history, { zenflowPublic: true }, '', nextPath)
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  function clearPublicRoute() {
    navigatePublicPage(null)
  }

  function openStaticPage(page: StaticPageId) {
    setSelected(null)
    setFocusedTaskId(null)
    setGoalIntent(null)
    navigatePublicPage({ kind: 'static', id: page })
  }

  function openBlogIndex() {
    setSelected(null)
    setFocusedTaskId(null)
    navigatePublicPage({ kind: 'blogIndex' })
  }

  function openBlogArticle(articleId: BlogArticleId) {
    setSelected(null)
    setFocusedTaskId(null)
    navigatePublicPage({ kind: 'blogArticle', id: articleId })
  }

  function closePublicPage() {
    setSelected(null)
    navigatePublicPage(null)
  }

  useEffect(() => {
    async function validateSession() {
      if (!token) {
        setIsValidating(false)
        return
      }

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
      } finally {
        setIsValidating(false)
      }
    }

    void validateSession()
  }, [token])

  useEffect(() => {
    const syncRoute = () => {
      const nextPage = resolvePublicPage(window.location.pathname, window.location.hash)
      setActivePublicPage(nextPage)
      if (nextPage) {
        setSelected(null)
        setFocusedTaskId(null)
      }
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
    }
  }, [])

  useEffect(() => {
    const handlePop = () => {
      if (showLogin) {
        setShowLogin(false)
        setGoalIntent(null)
      }
    }

    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [showLogin])

  useEffect(() => {
    const handleAndroidBack = () => {
      if (showLogin) {
        setShowLogin(false)
        setGoalIntent(null)
        return
      }
      if (selected) {
        setSelected(null)
      }
    }

    window.addEventListener('androidBackPressed', handleAndroidBack)
    return () => window.removeEventListener('androidBackPressed', handleAndroidBack)
  }, [showLogin, selected])

  useEffect(() => {
    if (!showLogin || !overlayRef.current) return

    const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [showLogin])

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
    const script = document.getElementById(ADSENSE_SCRIPT_ID)
    const shouldLoadAds = !account && !selected && !showLogin

    if (!shouldLoadAds) {
      script?.remove()
      document.querySelectorAll('.google-auto-placed').forEach((node) => node.remove())
      return
    }

    if (script) return

    const nextScript = document.createElement('script')
    nextScript.id = ADSENSE_SCRIPT_ID
    nextScript.async = true
    nextScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
    nextScript.crossOrigin = 'anonymous'
    document.head.appendChild(nextScript)
  }, [account, selected, showLogin])

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

  const setView = (view: string | null) => {
    if (activePublicPage) {
      clearPublicRoute()
    }
    setSelected(view)
  }

  useEffect(() => {
    if (selected === 'pomodoro' || selected === 'meditation' || selected === 'sudoku' || selected === 'arcade' || selected === 'breakroom') {
      setLastToolView(selected)
    }
  }, [selected])

  const viewTitles: Record<string, string> = {
    pomodoro: 'Focus Timer — Zenflow',
    meditation: 'Meditation — Zenflow',
    sudoku: 'Sudoku — Zenflow',
    arcade: 'Games — Zenflow',
    breakroom: 'Break Room — Zenflow',
    planner: 'Planner — Zenflow',
    profile: 'Account — Zenflow',
  }

  useEffect(() => {
    if (activePublicPage) {
      const meta = getPublicPageMeta(activePublicPage)
      applyDocumentMeta(`${meta.title} — Zenflow`, meta.description, getPublicPagePath(activePublicPage))
    } else if (selected && viewTitles[selected]) {
      const trackedPage = resolveTrackedPage(selected, null, Boolean(account))
      applyDocumentMeta(viewTitles[selected], 'Zenflow tools for focus, meditation, task planning, and daily rhythm.', trackedPage.path)
    } else if (account) {
      applyDocumentMeta('Dashboard — Zenflow', 'Zenflow dashboard with your account, planner, and progress in one place.', '/app/dashboard')
    } else {
      applyDocumentMeta(
        'Zenflow | Focus, Tasks, and Daily Rhythm',
        'Zenflow combines focus timers, planner tools, daily notes, calm breaks, and public focus articles in one clean flow.',
        '/',
      )
    }
  }, [selected, account, activePublicPage])

  useEffect(() => {
    if (account) {
      identifyAnalyticsUser(account)
    } else if (previousAccountRef.current) {
      resetAnalyticsUser()
    }

    previousAccountRef.current = account
  }, [account])

  useEffect(() => {
    if (isValidating) return

    const trackedPage = resolveTrackedPage(selected, activePublicPage, Boolean(account))
    trackPageView(trackedPage)
  }, [selected, activePublicPage, account, isValidating])

  function openPlannerAt(dateKey: string) {
    if (activePublicPage) {
      clearPublicRoute()
    }
    setPlannerFocusDate(dateKey)
    setSelected('planner')
  }

  function openAuth(mode: 'login' | 'register', goal?: GoalIntent) {
    authTriggerRef.current = document.activeElement as HTMLElement
    setAuthMode(mode)
    if (goal) setGoalIntent(goal)
    setShowLogin(true)
    history.pushState({ zenflowAuth: true }, '')
  }

  function handleLogout() {
    setAccount(null)
    setToken(null)
    setProfileMeta({})
    setProfileRefreshKey(0)
    setGoalIntent(null)
    clearStoredSession()
    showToast("You've been signed out.")
  }

  function handleBottomNav(section: 'home' | 'dashboard' | 'tools' | 'activity' | 'profile') {
    if (activePublicPage) {
      clearPublicRoute()
    }

    if (section === 'home') {
      setSelected(null)
      return
    }
    if (section === 'dashboard') {
      if (!account) {
        openAuth('login')
        return
      }
      setSelected(null)
      return
    }
    if (section === 'tools') {
      if (!account) {
        openAuth('login', 'focus')
        return
      }
      setSelected(lastToolView)
      return
    }
    if (section === 'activity') {
      if (!account) {
        openAuth('login', 'consistency')
        return
      }
      setSelected('planner')
      return
    }
    if (!account) {
      openAuth('login')
      return
    }
    setSelected('profile')
  }

  function handleOpenFocusTask(taskId: string | null) {
    if (!taskId) return
    if (activePublicPage) {
      clearPublicRoute()
    }
    setFocusedTaskId(taskId)
    setSelected('pomodoro')
  }

  function renderPublicPage(page: PublicPageRoute) {
    if (page.kind === 'blogIndex') {
      return <BlogIndexPage onOpenArticle={openBlogArticle} onOpenAuth={openAuth} />
    }
    if (page.kind === 'blogArticle') {
      return (
        <BlogArticlePage
          articleId={page.id}
          onOpenIndex={openBlogIndex}
          onOpenArticle={openBlogArticle}
          onOpenAuth={openAuth}
        />
      )
    }
    if (page.id === 'privacy') return <PrivacyPolicyPage />
    if (page.id === 'terms') return <TermsOfServicePage />
    if (page.id === 'cookie') return <CookiePolicyPage />
    if (page.id === 'about') return <AboutPage />
    if (page.id === 'faq') return <FAQPage />
    return <ContactPage onNotify={showToast} />
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

  if (isValidating) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(180deg, #efe3d5 0%, #f7efe6 100%)',
      }}>
        <div style={{ textAlign: 'center', display: 'grid', gap: '14px' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '38px',
            fontWeight: 700,
            color: '#2f241e',
          }}>
            Zenflow
          </div>
          <div className="skeleton-line" style={{ width: '120px', margin: '0 auto' }} />
        </div>
      </div>
    )
  }

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
        <div className="penguin-shadow" aria-hidden="true" />
        <div className="penguin-body">
          <div className="penguin-belly" aria-hidden="true" />
          <div className="penguin-eye penguin-eye-left" aria-hidden="true" />
          <div className="penguin-eye penguin-eye-right" aria-hidden="true" />
          <div className="penguin-beak" aria-hidden="true" />
          <div className="penguin-wing penguin-wing-left" aria-hidden="true" />
          <div className="penguin-wing penguin-wing-right" aria-hidden="true" />
          <div className="penguin-feet" aria-hidden="true" />
          <div className="penguin-kiss" aria-hidden="true">mwah</div>
          <div className="penguin-heart penguin-heart-left" aria-hidden="true">&#10084;</div>
          <div className="penguin-heart penguin-heart-right" aria-hidden="true">&#10084;</div>
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
        <nav className="nav" aria-label="Main navigation">
          {account ? (
            visibleDesktopNav.length > 0 ? (
              visibleDesktopNav.map((item) => (
                <button key={item.label} className={`nav-link ${selected === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
                  {item.label}
                </button>
              ))
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--ink-soft)', padding: '10px 14px' }}>No sections match</span>
            )
          ) : (
            <>
              <a className="nav-link" href={`${landingSectionPrefix}#start`}>Home</a>
              <a className="nav-link" href={`${landingSectionPrefix}#plans`}>Features</a>
              <a className="nav-link" href={`${landingSectionPrefix}#overview`}>Overview</a>
              <button type="button" className={`nav-link ${blogRouteActive ? 'active' : ''}`} onClick={openBlogIndex}>Blog</button>
              <a className="nav-link" href={`${landingSectionPrefix}#about`}>About</a>
            </>
          )}
        </nav>
        {account && (
          <label className="header-search" aria-label="Search navigation">
            <input
              type="search"
              placeholder="Search section"
              value={navSearch}
              onChange={(event) => setNavSearch(event.target.value)}
            />
          </label>
        )}
        <div className={`auth ${guestLandingMode ? 'guest-auth' : ''}`}>
          {account ? (
            <>
              <div className="auth-summary account-summary">
                <strong>{account.fullName}</strong>
                <span className="muted">@{account.username}</span>
              </div>
              <button className="login-btn" onClick={() => setView('profile')}>Account</button>
              {confirmLogout ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Sign out?</span>
                  <button className="login-btn logout-confirm-btn" onClick={() => { handleLogout(); setConfirmLogout(false) }}>Yes</button>
                  <button className="login-btn" onClick={() => setConfirmLogout(false)}>Cancel</button>
                </div>
              ) : (
                <button className="login-btn logout-btn" onClick={() => setConfirmLogout(true)}>Logout</button>
              )}
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
        {activePublicPage ? (
          <section className="legal-page-wrap fade-rise">
            <InfoPageBreadcrumb label={getPublicPageLabel(activePublicPage)} />
            <div className="legal-page-actions">
              <button className="back tool-back-btn" onClick={closePublicPage}>
                &larr; Back to home
              </button>
              {activePublicPage.kind === 'blogArticle' && (
                <button type="button" className="ghost-btn" onClick={openBlogIndex}>
                  Browse all articles
                </button>
              )}
            </div>
            {renderPublicPage(activePublicPage)}
            <footer className="site-footer legal-footer">
              <span>Zenflow</span>
              <div className="footer-links-group" aria-label="Public links">
                <button type="button" className="ghost-btn" onClick={openBlogIndex}>Blog</button>
                <SiteFooterLinks onNavigate={openStaticPage} />
              </div>
            </footer>
          </section>
        ) : !selected ? (
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
              <>
                <MarketingLanding onOpenAuth={openAuth} />
                <BlogPreviewSection onOpenIndex={openBlogIndex} onOpenArticle={openBlogArticle} />
              </>
            )}
            <footer className="site-footer legal-footer fade-rise">
              <span>Zenflow</span>
              <div className="footer-links-group" aria-label="Public links">
                <button type="button" className="ghost-btn" onClick={openBlogIndex}>Blog</button>
                <SiteFooterLinks onNavigate={openStaticPage} />
              </div>
            </footer>
          </>
        ) : (
          <section className="focus-card fade-rise">
            <button className="back tool-back-btn" onClick={() => setView(null)}>
              &larr; Back to dashboard
            </button>
            {isToolSelected && (
              <div className="tool-switcher" aria-label="Tool switcher">
                <button
                  className={`tool-switch-btn ${selected === 'pomodoro' ? 'active' : ''}`}
                  onClick={() => setView('pomodoro')}
                >
                  Focus
                </button>
                <button
                  className={`tool-switch-btn ${selected === 'meditation' ? 'active' : ''}`}
                  onClick={() => setView('meditation')}
                >
                  Meditate
                </button>
                <button
                  className={`tool-switch-btn ${selected === 'sudoku' ? 'active' : ''}`}
                  onClick={() => setView('sudoku')}
                >
                  Sudoku
                </button>
                <button
                  className={`tool-switch-btn ${selected === 'arcade' ? 'active' : ''}`}
                  onClick={() => setView('arcade')}
                >
                  Games
                </button>
                {BREAK_ROOM_ENABLED && (
                  <button
                    className={`tool-switch-btn ${selected === 'breakroom' ? 'active' : ''}`}
                    onClick={() => setView('breakroom')}
                  >
                    Break Room
                  </button>
                )}
              </div>
            )}
            {selected === 'pomodoro' && (
              <PomodoroTimer
                user={user}
                token={token}
                initialTaskId={focusedTaskId}
                onRequireLogin={() => openAuth('login')}
                onSelect={setView}
                onSessionComplete={(mins) => setLastSessionMinutes(mins)}
              />
            )}
            {selected === 'meditation' && <MeditationTimer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'sudoku' && <SudokuTrainer user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'arcade' && <BrainArcade user={user} token={token} onRequireLogin={() => openAuth('login')} />}
            {selected === 'breakroom' && <BreakRoom onSelect={(id) => setView(id)} lastSessionMinutes={lastSessionMinutes} />}
            {selected === 'planner' && (
              <PlannerBoard
                initialDate={plannerFocusDate}
                user={user}
                token={token}
                onRequireLogin={() => openAuth('login')}
                onOpenFocusTask={handleOpenFocusTask}
                onMetaSaved={() => setProfileRefreshKey((value) => value + 1)}
              />
            )}
            {selected === 'profile' && (
              <ProfileCenter
                user={user}
                token={token}
                onRequireLogin={() => openAuth('login')}
                onOpenFocusTask={handleOpenFocusTask}
                onMetaSaved={() => setProfileRefreshKey((value) => value + 1)}
              />
            )}
          </section>
        )}
      </main>
      {showLogin && (
        <div className="overlay" ref={overlayRef}>
          <Login
            initialMode={authMode}
            goalIntent={goalIntent}
            onLogin={(nextAccount, nextToken, remember) => {
              const nextSession = { account: nextAccount, token: nextToken }
              setAccount(nextAccount)
              setToken(nextToken)
              persistSession(nextSession, remember)
              identifyAnalyticsUser(nextAccount)
              trackLogin(nextAccount)
              setGoalIntent(null)
              setShowLogin(false)
            }}
            onClose={() => {
              setGoalIntent(null)
              setShowLogin(false)
              if (history.state?.zenflowAuth) history.back()
              window.setTimeout(() => authTriggerRef.current?.focus(), 50)
            }}
          />
        </div>
      )}
      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={`bottom-nav-item ${!account && selected === null ? 'active' : ''}`} onClick={() => handleBottomNav('home')}>
          <span>Home</span>
        </button>
        <button className={`bottom-nav-item ${account && selected === null ? 'active' : ''}`} onClick={() => handleBottomNav('dashboard')}>
          <span>Dashboard</span>
        </button>
        <button className={`bottom-nav-item ${isToolSelected ? 'active' : ''}`} onClick={() => handleBottomNav('tools')}>
          <span>Tools</span>
        </button>
        <button className={`bottom-nav-item ${selected === 'planner' ? 'active' : ''}`} onClick={() => handleBottomNav('activity')}>
          <span>Activity</span>
        </button>
        <button className={`bottom-nav-item ${selected === 'profile' ? 'active' : ''}`} onClick={() => handleBottomNav('profile')}>
          <span>Profile</span>
        </button>
      </nav>
      {toastMsg && (
        <div className="toast-notification" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  )
}

