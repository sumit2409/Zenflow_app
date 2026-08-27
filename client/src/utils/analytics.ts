import { Capacitor } from '@capacitor/core'
import type { AuthAccount } from '../types/auth'
import { getConsent } from './preferences'

const GA_MEASUREMENT_ID = 'G-B0H2J0ZX9T'
const ENABLE_IN_DEV = String(import.meta.env.VITE_ENABLE_ANALYTICS_IN_DEV || '').trim() === 'true'
const SENSITIVE_QUERY_PARAMS = new Set(['code', 'identifier', 'token', 'email'])

let initialized = false
let lastPageKey = ''

type PageViewInput = {
  key: string
  name: string
  path: string
  section: 'public' | 'app'
  kind: 'landing' | 'static' | 'blog' | 'dashboard' | 'tool'
  authenticated: boolean
}

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: any[]) => void
  }
}

function analyticsAvailable() {
  return getConsent()?.choice === 'all' && Boolean(GA_MEASUREMENT_ID) && (!import.meta.env.DEV || ENABLE_IN_DEV)
}

function getPlatformLabel() {
  return Capacitor.getPlatform() === 'android' ? 'android' : 'web'
}

function sendAnalyticsCommand(...args: any[]) {
  window.gtag?.(...args)
}

function sanitizeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, window.location.origin)
    for (const key of SENSITIVE_QUERY_PARAMS) {
      url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return rawUrl
  }
}

function buildTrackingUrl(path: string) {
  const currentUrl = new URL(window.location.href)
  const trackingUrl = new URL(currentUrl.origin)

  trackingUrl.pathname = path.startsWith('/') ? path : `/${path}`

  for (const [key, value] of currentUrl.searchParams.entries()) {
    if (!SENSITIVE_QUERY_PARAMS.has(key)) {
      trackingUrl.searchParams.append(key, value)
    }
  }

  return trackingUrl.toString()
}

export function initAnalytics() {
  if (!analyticsAvailable() || initialized) return
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function (...args: any[]) { window.dataLayer.push(args) }
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  script.dataset.zenflowAnalytics = 'true'
  document.head.appendChild(script)
  sendAnalyticsCommand('js', new Date())
  sendAnalyticsCommand('config', GA_MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true })
  initialized = true
}

window.addEventListener('zenflow:consent', () => {
  if (getConsent()?.choice === 'all') initAnalytics()
  else {
    sendAnalyticsCommand('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' })
    document.querySelectorAll('script[data-zenflow-analytics]').forEach((node) => node.remove())
    initialized = false
  }
})

export function identifyAnalyticsUser(account: AuthAccount) {
  if (!analyticsAvailable() || !initialized) return
  if (!account.analyticsId) return

  sendAnalyticsCommand('set', 'user_id', account.analyticsId)
}

export function resetAnalyticsUser() {
  if (!analyticsAvailable() || !initialized) return

  lastPageKey = ''
  sendAnalyticsCommand('set', 'user_id', null)
}

export function trackLogin(account: AuthAccount) {
  if (!analyticsAvailable() || !initialized) return

  sendAnalyticsCommand('event', 'login', {
    method: account.authProvider || 'local',
    zenflow_platform: getPlatformLabel(),
    ...(import.meta.env.DEV && ENABLE_IN_DEV ? { debug_mode: true } : {}),
  })
}

export function trackPageView({ key, name, path, section, kind, authenticated }: PageViewInput) {
  if (!analyticsAvailable() || !initialized) return
  if (lastPageKey === key) return

  lastPageKey = key

  sendAnalyticsCommand('event', 'page_view', {
    page_title: name,
    page_path: path,
    page_location: buildTrackingUrl(path),
    page_referrer: sanitizeUrl(document.referrer || ''),
    zenflow_platform: getPlatformLabel(),
    zenflow_section: section,
    zenflow_kind: kind,
    zenflow_authenticated: authenticated ? 'true' : 'false',
    ...(import.meta.env.DEV && ENABLE_IN_DEV ? { debug_mode: true } : {}),
  })
}
