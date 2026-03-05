import { Capacitor } from '@capacitor/core'

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const configuredAndroidBaseUrl = (import.meta.env.VITE_ANDROID_API_BASE_URL || '').trim().replace(/\/+$/, '')
const productionAndroidBaseUrl = 'https://zenflow.bio'

function resolveBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl
  if (Capacitor.getPlatform() === 'android') {
    if (configuredAndroidBaseUrl) return configuredAndroidBaseUrl
    return import.meta.env.DEV ? 'http://10.0.2.2:4100' : productionAndroidBaseUrl
  }
  return ''
}

const resolvedBaseUrl = resolveBaseUrl()

export function apiUrl(path: string) {
  if (!resolvedBaseUrl) return path
  return `${resolvedBaseUrl}${path}`
}
