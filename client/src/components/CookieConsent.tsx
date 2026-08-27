import React, { useEffect, useState } from 'react'
import { clearOptionalPreferences, getConsent, saveConsent, type ConsentChoice } from '../utils/preferences'

export default function CookieConsent({ onOpenPolicy }: { onOpenPolicy: () => void }) {
  const [open, setOpen] = useState(() => !getConsent())
  const [customize, setCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    const handler = () => { setCustomize(true); setOpen(true); setAnalytics(getConsent()?.choice === 'all') }
    window.addEventListener('zenflow:open-cookie-preferences', handler)
    return () => window.removeEventListener('zenflow:open-cookie-preferences', handler)
  }, [])

  const choose = (choice: ConsentChoice) => { saveConsent(choice); setOpen(false); setCustomize(false) }
  if (!open) return null

  return <div className="cookie-consent" role="dialog" aria-modal="false" aria-labelledby="cookie-title">
    <div><h2 id="cookie-title">Your privacy choices</h2><p>Zenflow uses essential storage to keep the app working. Optional analytics helps us understand broad usage without collecting tasks, notes, or CV content.</p></div>
    {customize && <div className="cookie-categories">
      <label><span><strong>Essential</strong><small>Sign-in, security, consent, and requested preferences.</small></span><input type="checkbox" checked disabled aria-label="Essential storage always enabled" /></label>
      <label><span><strong>Analytics</strong><small>Anonymous product events and device category. Disabled until you agree.</small></span><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /></label>
      <button className="text-button" onClick={() => { clearOptionalPreferences(); choose('essential') }}>Reset non-essential preferences</button>
    </div>}
    <div className="cookie-actions">
      <button className="ghost-btn" onClick={() => choose('all')}>Accept all</button>
      <button className="ghost-btn" onClick={() => choose('essential')}>Reject non-essential</button>
      {customize ? <button className="primary-cta" onClick={() => choose(analytics ? 'all' : 'essential')}>Save choices</button> : <button className="ghost-btn" onClick={() => setCustomize(true)}>Customize</button>}
      <button className="text-button" onClick={onOpenPolicy}>Cookie Policy</button>
    </div>
  </div>
}
