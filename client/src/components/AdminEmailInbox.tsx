import React, { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../utils/api'

type Email = {
  id: string
  from: string
  to: string[]
  subject: string
  created_at: string
  text?: string | null
  html?: string | null
  reply_to?: string[]
  attachments?: Array<{ filename: string; size: number }>
}
type InboxPage = { mailbox: string; items: Email[]; nextCursor: string | null }

export default function AdminEmailInbox({ token }: { token: string }) {
  const [cursor, setCursor] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [page, setPage] = useState<InboxPage | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [email, setEmail] = useState<Email | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox')
  const [draft, setDraft] = useState<{ to: string; subject: string; text: string; replyToId?: string } | null>(null)
  const [sendError, setSendError] = useState('')
  const [sendStatus, setSendStatus] = useState('')
  const [sending, setSending] = useState(false)
  const sendLock = useRef(false)
  const sendAttempt = useRef<{ fingerprint: string; id: string } | null>(null)

  async function request<T>(path: string, signal?: AbortSignal, init?: RequestInit): Promise<T> {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: { authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) }, signal,
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Email could not load.')
    return data
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setPage(null)
    setSelectedId('')
    setEmail(null)
    void request<InboxPage>(`/api/admin/email-inbox?${new URLSearchParams({ after: cursor, folder })}`, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPage(data) })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, cursor, refresh, folder])

  useEffect(() => {
    const controller = new AbortController()
    setEmail(null)
    setDetailError('')
    setDetailLoading(Boolean(selectedId))
    if (selectedId) {
      void request<Email>(`/api/admin/email-inbox/${encodeURIComponent(selectedId)}?folder=${folder}`, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setEmail(data) })
        .catch((err) => { if (!controller.signal.aborted) setDetailError(err.message) })
        .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    }
    return () => controller.abort()
  }, [token, selectedId, folder])

  function openComposer(reply?: Email) {
    sendAttempt.current = null
    setSendError(''); setSendStatus('')
    const recipient = reply?.reply_to?.[0] || reply?.from || ''
    setDraft({ to: recipient.match(/<([^<>]+)>$/)?.[1] || recipient,
      subject: reply ? (/^re:/i.test(reply.subject) ? reply.subject : `Re: ${reply.subject || '(No subject)'}`) : '',
      text: '', ...(reply ? { replyToId: reply.id } : {}) })
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!draft || sendLock.current) return
    sendLock.current = true; setSending(true); setSendError(''); setSendStatus('')
    const fingerprint = JSON.stringify(draft)
    if (sendAttempt.current?.fingerprint !== fingerprint) {
      sendAttempt.current = { fingerprint, id: crypto.randomUUID() }
    }
    try {
      await request('/api/admin/email-inbox/send', undefined, {
        method: 'POST', body: JSON.stringify({ ...draft, requestId: sendAttempt.current.id }),
      })
      setDraft(null); sendAttempt.current = null
      setSendStatus('Email submitted successfully. You can find it in Sent.')
      if (folder === 'sent') setRefresh((value) => value + 1)
    } catch (err) {
      setSendError((err as Error).message || 'Email could not be sent. Your draft is still here.')
    } finally { sendLock.current = false; setSending(false) }
  }

  return (
    <section className="admin-section card">
      <div className="admin-section-head">
        <div><h3>Email inbox</h3><p>sumit.tiwari@zenflow.bio</p></div>
        <div className="admin-inline-actions"><button type="button" className="login-btn" disabled={sending || !!draft} onClick={() => openComposer()}>Compose</button>
        <button type="button" className="ghost-btn" disabled={loading} onClick={() => {
          setCursor(''); setHistory([]); setRefresh((value) => value + 1)
        }}>Refresh</button></div>
      </div>
      <div className="admin-inline-actions" aria-label="Email folders">
        {(['inbox', 'sent'] as const).map((value) => <button key={value} type="button" className="ghost-btn"
          aria-pressed={folder === value} onClick={() => { setFolder(value); setCursor(''); setHistory([]) }}>
          {value === 'inbox' ? 'Inbox' : 'Sent'}</button>)}
      </div>
      {sendStatus && <p role="status">{sendStatus}</p>}
      {draft && <form className="admin-form-stack admin-detail-card" onSubmit={sendMessage}>
        <h4>{draft.replyToId ? 'Reply' : 'New email'}</h4>
        <p>From: sumit.tiwari@zenflow.bio</p>
        <label>To<input type="email" required maxLength={254} value={draft.to} disabled={sending || !!draft.replyToId}
          onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
        <label>Subject<input required maxLength={220} value={draft.subject} disabled={sending}
          onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label>
        <label>Message<textarea required maxLength={20000} rows={9} value={draft.text} disabled={sending}
          onChange={(event) => setDraft({ ...draft, text: event.target.value })} /></label>
        {sendError && <p role="alert" className="admin-error-line">{sendError}</p>}
        <div className="admin-inline-actions"><button type="submit" className="login-btn" disabled={sending}>
          {sending ? 'Sending...' : 'Send email'}</button>
          <button type="button" className="ghost-btn" disabled={sending} onClick={() => { setDraft(null); setSendError(''); sendAttempt.current = null }}>Cancel</button>
        </div>
      </form>}
      {error && <p role="alert" className="admin-error-line">{error}</p>}
      {loading && <p role="status">Loading emails…</p>}
      {page && <div className="admin-message-layout">
        <div className="admin-list">
          {page.items.length === 0 && <p className="admin-empty-state">
            No emails for this address on this page.{page.nextCursor ? ' Check the next page for older emails.' : folder === 'sent' ? ' Messages you send will appear here.' : ' New messages will appear here after receiving is enabled in Resend.'}
          </p>}
          {page.items.map((item) => <button key={item.id} type="button" className="admin-message-card"
            aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)} style={{ textAlign: 'left', cursor: 'pointer' }}>
            <strong>{item.subject || '(No subject)'}</strong>
            <span>{folder === 'sent' ? `To: ${item.to.join(', ')}` : item.from}</span>
            <small>{new Date(item.created_at).toLocaleString()}</small>
          </button>)}
          <div className="admin-pagination">
            <button type="button" className="ghost-btn" disabled={!history.length || loading} onClick={() => {
              setCursor(history[history.length - 1]); setHistory((value) => value.slice(0, -1))
            }}>Previous</button>
            <span>Page {history.length + 1}</span>
            <button type="button" className="ghost-btn" disabled={!page.nextCursor || loading} onClick={() => {
              setHistory((value) => [...value, cursor]); setCursor(page.nextCursor || '')
            }}>Next</button>
          </div>
        </div>
        <div className="admin-detail-card">
          {detailLoading && <p role="status">Opening email…</p>}
          {detailError && <p role="alert">{detailError}</p>}
          {!selectedId && <p>Select an email to read it.</p>}
          {email && <>
            <h4>{email.subject || '(No subject)'}</h4>
            <p>From: {email.from}</p>
            <p>To: {email.to.join(', ')}</p>
            <p>{new Date(email.created_at).toLocaleString()}</p>
            {folder === 'inbox' && <button type="button" className="ghost-btn" disabled={sending || !!draft} onClick={() => openComposer(email)}>Reply</button>}
            {email.text ? <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit' }}>{email.text}</pre>
              : email.html ? <iframe title="Email content" sandbox="" referrerPolicy="no-referrer"
                style={{ width: '100%', minHeight: 400, border: 0, background: '#fff' }}
                srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"></head><body>${email.html}</body></html>`} />
                : <p>This email has no message body.</p>}
            {!!email.attachments?.length && <div><strong>Attachments</strong>
              {email.attachments.map((item, index) => <p key={index}>{item.filename} ({item.size} bytes)</p>)}
              <p>Open Resend to download attachments.</p>
            </div>}
          </>}
        </div>
      </div>}
    </section>
  )
}
