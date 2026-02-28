import { Capacitor } from '@capacitor/core'

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const configuredAndroidBaseUrl = (import.meta.env.VITE_ANDROID_API_BASE_URL || '').trim().replace(/\/+$/, '')

function resolveBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl
  if (Capacitor.getPlatform() === 'android') {
    return configuredAndroidBaseUrl || 'http://10.0.2.2:4100'
  }
  return ''
}

const resolvedBaseUrl = resolveBaseUrl()

export function apiUrl(path: string) {
  if (!resolvedBaseUrl) return path
  return `${resolvedBaseUrl}${path}`
}
