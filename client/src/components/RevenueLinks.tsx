import React from 'react'
import { Capacitor } from '@capacitor/core'

function externalUrl(value: string | undefined) {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export default function RevenueLinks() {
  if (Capacitor.isNativePlatform() || /ZenflowAndroid/.test(navigator.userAgent)) return null
  const support = externalUrl(import.meta.env.VITE_SUPPORT_URL)
  const affiliate = externalUrl(import.meta.env.VITE_AFFILIATE_URL)
  const label = import.meta.env.VITE_AFFILIATE_LABEL?.trim()
  if (!support && !(affiliate && label)) return null

  return <aside className="revenue-links" aria-label="Support Zenflow">
    {support && <a href={support} target="_blank" rel="noopener noreferrer">Support Zenflow ↗</a>}
    {affiliate && label && <span>
      <a href={affiliate} target="_blank" rel="sponsored noopener noreferrer">{label} ↗</a>
      <small>Affiliate link: we may earn a commission if you purchase through this link.</small>
    </span>}
  </aside>
}
