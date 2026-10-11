import React, { useEffect, useState } from 'react'
import { apiUrl } from '../utils/api'

type Email = {
  id: string
  from: string
  to: string[]
  subject: string
  created_at: string
  text?: string | null
  html?: string | null
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

  async function request<T>(path: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(apiUrl(path), {
      headers: { authorization: `Bearer ${token}` }, signal,
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
    void request<InboxPage>(`/api/admin/email-inbox?${new URLSearchParams({ after: cursor })}`, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPage(data) })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, cursor, refresh])

  useEffect(() => {
    const controller = new AbortController()
    setEmail(null)
    setDetailError('')
    setDetailLoading(Boolean(selectedId))
    if (selectedId) {
      void request<Email>(`/api/admin/email-inbox/${encodeURIComponent(selectedId)}`, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setEmail(data) })
        .catch((err) => { if (!controller.signal.aborted) setDetailError(err.message) })
        .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    }
    return () => controller.abort()
  }, [token, selectedId])

  return (
    <section className="admin-section card">
      <div className="admin-section-head">
        <div><h3>Email inbox</h3><p>sumit.tiwari@zenflow.bio</p></div>
        <button type="button" className="ghost-btn" disabled={loading} onClick={() => {
          setCursor(''); setHistory([]); setRefresh((value) => value + 1)
        }}>Refresh inbox</button>
      </div>
      {error && <p role="alert" className="admin-error-line">{error}</p>}
      {loading && <p role="status">Loading emails…</p>}
      {page && <div className="admin-message-layout">
        <div className="admin-list">
          {page.items.length === 0 && <p className="admin-empty-state">
            No emails for this address on this page.{page.nextCursor ? ' Check the next page for older emails.' : ' New messages will appear here after receiving is enabled in Resend.'}
          </p>}
          {page.items.map((item) => <button key={item.id} type="button" className="admin-message-card"
            aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)} style={{ textAlign: 'left', cursor: 'pointer' }}>
            <strong>{item.subject || '(No subject)'}</strong>
            <span>{item.from}</span>
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
