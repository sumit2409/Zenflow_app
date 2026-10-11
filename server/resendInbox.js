const MAILBOX = 'sumit.tiwari@zenflow.bio'

function inboxError(status, message) {
  return Object.assign(new Error(message), { status })
}

function belongsToMailbox(email) {
  return ['to', 'cc', 'bcc', 'received_for'].some((field) =>
    Array.isArray(email?.[field]) && email[field].some((address) => {
      const value = String(address).trim().toLowerCase()
      return value === MAILBOX || value.match(/<([^<>]+)>$/)?.[1] === MAILBOX
    })
  )
}

function createResendInbox(apiKey, fetchImpl = fetch) {
  async function request(path) {
    if (!apiKey) throw inboxError(503, 'Resend is not configured on this server.')
    let response
    try {
      response = await fetchImpl(`https://api.resend.com${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw inboxError(502, 'Resend could not be reached. Try again shortly.')
    }
    if (!response.ok) {
      if ([401, 403].includes(response.status)) {
        throw inboxError(503, 'The server’s Resend API key needs permission to read received emails.')
      }
      if (response.status === 404) throw inboxError(404, 'Email not found.')
      if (response.status === 429) throw inboxError(429, 'Resend is busy. Try again shortly.')
      throw inboxError(502, 'Resend could not load received emails.')
    }
    try { return await response.json() } catch {
      throw inboxError(502, 'Resend returned an unreadable response.')
    }
  }

  return {
    async list(after = '') {
      if (after && !/^[a-zA-Z0-9-]{1,100}$/.test(after)) throw inboxError(400, 'Invalid email cursor.')
      const query = new URLSearchParams({ limit: '50' })
      if (after) query.set('after', after)
      const result = await request(`/emails/receiving?${query}`)
      if (!Array.isArray(result.data)) throw inboxError(502, 'Resend returned an unreadable email list.')
      return {
        mailbox: MAILBOX,
        items: result.data.filter(belongsToMailbox).map(({ id, from, to, subject, created_at, attachments }) =>
          ({ id, from, to, subject, created_at, attachmentCount: attachments?.length || 0 })),
        nextCursor: result.has_more ? result.data.at(-1)?.id || null : null,
      }
    },
    async get(id) {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw inboxError(400, 'Invalid email ID.')
      const result = await request(`/emails/receiving/${encodeURIComponent(id)}`)
      if (!belongsToMailbox(result)) throw inboxError(404, 'Email not found.')
      const { from, to, subject, created_at, text, html, attachments } = result
      return { id, from, to, subject, created_at, text, html,
        attachments: (attachments || []).map(({ filename, size }) => ({ filename, size })) }
    },
  }
}

module.exports = { createResendInbox, belongsToMailbox, MAILBOX }
