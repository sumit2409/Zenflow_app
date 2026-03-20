import React, { useEffect, useRef, useState } from 'react'
import type { BlogArticleId } from './BlogPages'
import { apiUrl } from '../utils/api'

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
  'Help me plan today around my current progress.',
  'What should I improve first?',
  'Which Zenflow tool or article fits me right now?',
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

  useEffect(() => {
    if (!feedRef.current) return
    feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages, isSending, isOpen])

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || isSending) return

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

    try {
      const response = await fetch(apiUrl('/api/coach/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          history,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
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
      setError(sendError instanceof Error ? sendError.message : 'Coach is unavailable right now.')
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  return (
    <div className={`coach-shell ${isOpen ? 'is-open' : ''}`}>
      {isOpen && (
        <section id="zenflow-coach-panel" className="coach-panel card" aria-label="Zenflow Coach">
          <header className="coach-head">
            <div>
              <div className="section-kicker">Zenflow Coach</div>
              <h3>Ask about your progress, next step, or plan.</h3>
              <p className="coach-subline">I use your recent Zenflow activity to answer more personally.</p>
            </div>
            <button type="button" className="ghost-btn coach-close-btn" onClick={() => setIsOpen(false)} aria-label="Close coach">
              Close
            </button>
          </header>

          <div className="coach-quick-prompts" aria-label="Suggested prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" className="coach-chip" onClick={() => void sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div ref={feedRef} className="coach-feed">
            {messages.length === 0 ? (
              <article className="coach-empty-state">
                <strong>Hi {displayName.split(' ')[0] || displayName}.</strong>
                <p>I can summarize your recent performance, suggest the right Zenflow tool or article, and help you make a simple plan for today or this week.</p>
              </article>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`coach-message coach-message-${message.role}`}>
                  <div className="coach-message-role">{message.role === 'assistant' ? 'Coach' : 'You'}</div>
                  <p>{message.content}</p>
                  {message.role === 'assistant' && message.resources && message.resources.length > 0 && (
                    <div className="coach-resource-list">
                      {message.resources.map((resource) => (
                        <button key={`${resource.kind}-${resource.id}`} type="button" className="coach-resource-btn" onClick={() => onOpenResource(resource)}>
                          <strong>{resource.label}</strong>
                          <span>{resource.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
            {isSending && (
              <article className="coach-message coach-message-assistant coach-message-loading" aria-live="polite">
                <div className="coach-message-role">Coach</div>
                <p>Thinking through your recent patterns...</p>
              </article>
            )}
          </div>

          {error && (
            <div className="form-feedback error coach-feedback" role="alert">
              {error}
            </div>
          )}

          <form className="coach-form" onSubmit={handleSubmit}>
            <label className="coach-input-wrap">
              <span className="sr-only">Ask Zenflow Coach</span>
              <textarea
                rows={3}
                placeholder="Ask about your focus, streaks, planning, or what to use next..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={isSending}
              />
            </label>
            <button type="submit" className="primary-cta coach-send-btn" disabled={isSending || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="coach-launcher"
        aria-expanded={isOpen}
        aria-controls="zenflow-coach-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="coach-launcher-badge">Coach</span>
        <strong>Ask Zenflow</strong>
      </button>
    </div>
  )
}
