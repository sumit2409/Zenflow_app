import React, { useEffect, useRef, useState } from 'react'
import type { BlogArticleId } from './BlogPages'
import { apiUrl } from '../utils/api'
import './CoachPanel.css'

type CoachResource =
  | { kind: 'dashboard'; id: 'dashboard'; label: string; description: string }
  | { kind: 'tool'; id: 'pomodoro' | 'meditation' | 'sudoku' | 'arcade' | 'breakroom' | 'planner'; label: string; description: string }
  | { kind: 'account'; id: 'profile'; label: string; description: string }
  | { kind: 'article'; id: BlogArticleId; label: string; description: string }

type CoachMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  resources?: CoachResource[]
}

type Props = {
  displayName: string
  token: string
  onOpenResource: (resource: CoachResource) => void
}

const QUICK_PROMPTS = [
  'How am I doing this week?',
  'Help me plan today.',
  'What should I improve first?',
  'Find a tool for me.',
]

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export type { CoachResource }

export default function CoachPanel({ displayName, token, onOpenResource }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])
  const [consentClearance, setConsentClearance] = useState<number | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    let banner: Element | null = null
    const measure = () => {
      const rect = banner?.getBoundingClientRect()
      const viewport = window.visualViewport
      const keyboardInset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
      const bannerInset = rect && rect.height > 0 ? window.innerHeight - rect.top + 12 : 0
      const clearance = Math.ceil(Math.max(bannerInset, keyboardInset > 0 ? keyboardInset + 12 : 0))
      setConsentClearance(clearance || null)
      setViewportHeight(viewport?.height || window.innerHeight)
    }
    const resize = new ResizeObserver(measure)
    const locate = () => {
      const next = document.querySelector('.cookie-consent')
      if (next !== banner) {
        resize.disconnect()
        banner = next
        if (banner) resize.observe(banner)
      }
      measure()
    }
    const changes = new MutationObserver(locate)
    changes.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('scroll', measure)
    locate()
    return () => {
      changes.disconnect()
      resize.disconnect()
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('scroll', measure)
    }
  }, [])

  useEffect(() => {
    if (!feedRef.current) return
    feedRef.current.scrollTop = messages.length ? feedRef.current.scrollHeight : 0
  }, [messages, isSending, isOpen])

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || requestRef.current) return

    const nextUserMessage: CoachMessage = {
      id: createMessageId(),
      role: 'user',
      content: message,
    }

    const history = messages.slice(-8).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }))

    setMessages((current) => [...current, nextUserMessage])
    setDraft('')
    setError(null)
    setIsSending(true)
    const controller = new AbortController()
    requestRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 130000)

    try {
      const response = await fetch(apiUrl('/api/coach/chat'), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          history,
        }),
      })

      const payload = await response.json().catch((error) => {
        if (controller.signal.aborted) throw error
        throw new Error('Coach returned an unreadable response. Please try again.')
      })
      if (!response.ok) {
        if (response.status === 401) throw new Error('Your sign-in has expired. Sign out and sign in again to use Coach.')
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Coach is unavailable right now.')
      }

      const assistantMessage: CoachMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: String(payload?.reply || 'I could not generate a reply right now.'),
        resources: Array.isArray(payload?.resources) ? payload.resources : [],
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (sendError) {
      setError(controller.signal.aborted
        ? controller.signal.reason === 'cancelled'
          ? 'Request cancelled. You can type and send another message.'
          : 'Coach took too long to reply. Please try again; the local AI computer may be busy or offline.'
        : sendError instanceof Error ? sendError.message : 'Coach is unavailable right now.')
    } finally {
      window.clearTimeout(timeout)
      requestRef.current = null
      setIsSending(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  return (
    <div className={`zc-shell ${isOpen ? 'is-open' : ''}`} style={{
      ...(consentClearance === null ? {} : { bottom: consentClearance, '--zc-clearance': `${consentClearance}px` }),
      ...(viewportHeight === null ? {} : { '--zc-viewport-height': `${viewportHeight}px` }),
    } as React.CSSProperties}>
      {isOpen && (
        <section id="zenflow-coach-panel" className="zc-panel" aria-label="Zenflow Coach">
          <header className="zc-head">
            <div className="zc-avatar" aria-hidden="true">Z</div>
            <div className="zc-heading">
              <h2>Zenflow Coach</h2>
              <p>Your progress, one step at a time.</p>
            </div>
            <button type="button" className="zc-close" onClick={() => setIsOpen(false)} aria-label="Close coach">&times;</button>
          </header>

          <div ref={feedRef} className="zc-feed" role="log" aria-label="Coach conversation" aria-live="polite">
            {messages.length === 0 ? (
              <div className="zc-welcome">
                <span className="zc-eyebrow">A little clarity for your day</span>
                <h3>Hi {displayName.split(' ')[0] || displayName}.</h3>
                <p>Let's look at your progress and find a simple next step.</p>
                <div className="zc-suggestions" aria-label="Suggested prompts">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" className="zc-chip" disabled={isSending} onClick={() => void sendMessage(prompt)}>
                      <span>{prompt}</span><span aria-hidden="true">&rarr;</span>
                    </button>
                  ))}
                </div>
                <p className="zc-context-note">Answers use your recent Zenflow activity.</p>
              </div>
            ) : messages.map((message) => (
              <article key={message.id} className={`zc-message zc-message-${message.role}`}>
                <div className="zc-message-role">{message.role === 'assistant' ? 'Zenflow' : 'You'}</div>
                <p>{message.content}</p>
                {message.role === 'assistant' && !!message.resources?.length && (
                  <div className="zc-resources">
                    {message.resources.map((resource) => (
                      <button key={`${resource.kind}-${resource.id}`} type="button" className="zc-resource" onClick={() => onOpenResource(resource)}>
                        <strong>{resource.label}</strong><span>{resource.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {isSending && <div className="zc-thinking" aria-hidden="true"><span /><span /><span />Thinking through your progress</div>}
          </div>

          <footer className="zc-composer">
            {error && <p className="zc-error" role="alert">{error}</p>}
            <form className="zc-form" onSubmit={handleSubmit} aria-busy={isSending}>
              <label className="zc-input-wrap">
                <span className="zc-sr-only">Ask Zenflow Coach</span>
                <textarea rows={2} maxLength={1600} placeholder="Ask about your progress..." value={draft}
                  onChange={(event) => setDraft(event.target.value)} disabled={isSending} />
              </label>
              <button type="submit" className="zc-send" disabled={isSending || !draft.trim()}>{isSending ? 'Sending...' : 'Send'}</button>
            </form>
            <div className="zc-status-row">
              <p role="status">{isSending ? 'Local AI may take up to 2 minutes.' : 'Small steps. Steady progress.'}</p>
              {isSending && <button type="button" className="zc-cancel" onClick={() => requestRef.current?.abort('cancelled')}>Cancel request</button>}
            </div>
          </footer>
        </section>
      )}
      <button type="button" className="zc-launcher" aria-expanded={isOpen} aria-controls="zenflow-coach-panel" onClick={() => setIsOpen((current) => !current)}>
        <span className="zc-launcher-icon" aria-hidden="true">Z</span><span>Ask Zenflow</span>
      </button>
    </div>
  )
}
