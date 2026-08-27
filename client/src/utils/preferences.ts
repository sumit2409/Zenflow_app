export type ConsentChoice = 'all' | 'essential'
export type ConsentRecord = { choice: ConsentChoice; version: string; date: string }

export const CONSENT_VERSION = '2026-08-27'
const CONSENT_COOKIE = 'zenflow_consent'

function cookieOptions(days = 180) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  return `Path=/; Max-Age=${days * 86400}; SameSite=Lax${secure}`
}

export function readCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`
  const item = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return item ? decodeURIComponent(item.slice(prefix.length)) : null
}

export function writePreferenceCookie(name: string, value: string, days = 180) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${cookieOptions(days)}`
}

export function getConsent(): ConsentRecord | null {
  try {
    const parsed = JSON.parse(readCookie(CONSENT_COOKIE) || '') as ConsentRecord
    return parsed.version === CONSENT_VERSION ? parsed : null
  } catch { return null }
}

export function saveConsent(choice: ConsentChoice) {
  const record: ConsentRecord = { choice, version: CONSENT_VERSION, date: new Date().toISOString() }
  writePreferenceCookie(CONSENT_COOKIE, JSON.stringify(record))
  window.dispatchEvent(new CustomEvent('zenflow:consent', { detail: record }))
}

export function clearOptionalPreferences() {
  document.cookie.split(';').forEach((part) => {
    const name = decodeURIComponent(part.split('=')[0].trim())
    if (name.startsWith('zenflow_') && name !== CONSENT_COOKIE) document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`
  })
  ;['zenflow_preferences', 'zenflow_focus_session', 'zenflow_guest_progress'].forEach((key) => localStorage.removeItem(key))
}
