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

function emailAddress(value) {
  const address = String(value || '').trim().toLowerCase()
  return address.match(/<([^<>]+)>$/)?.[1] || address
}

function createResendInbox(apiKey, fetchImpl = fetch, personalFrom = `Sumit Tiwari <${MAILBOX}>`) {
  async function request(path, options = {}) {
    if (!apiKey) throw inboxError(503, 'Resend is not configured on this server.')
    let response
    try {
      response = await fetchImpl(`https://api.resend.com${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${apiKey}`, ...options.headers },
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw inboxError(502, 'Resend could not be reached. Try again shortly.')
    }
    if (!response.ok) {
      if ([401, 403].includes(response.status)) {
        throw inboxError(503, 'The server\'s Resend API key needs permission to send and read emails.')
      }
      if (response.status === 404) throw inboxError(404, 'Email not found.')
      if (response.status === 429) throw inboxError(429, 'Resend is busy. Try again shortly.')
      if (response.status === 409) throw inboxError(409, 'This send is still processing. Wait briefly and retry the same message.')
      if (response.status === 422) throw inboxError(502, 'Resend could not send this email. Check the sender domain verification and recipient.')
      throw inboxError(502, 'Resend could not complete the email request.')
    }
    try { return await response.json() } catch {
      throw inboxError(502, 'Resend returned an unreadable response.')
    }
  }

  const inbox = {
    async list(after = '', folder = 'inbox') {
      if (after && !/^[a-zA-Z0-9-]{1,100}$/.test(after)) throw inboxError(400, 'Invalid email cursor.')
      const query = new URLSearchParams({ limit: '50' })
      if (after) query.set('after', after)
      const result = await request(`${folder === 'sent' ? '/emails' : '/emails/receiving'}?${query}`)
      if (!Array.isArray(result.data)) throw inboxError(502, 'Resend returned an unreadable email list.')
      return {
        mailbox: MAILBOX,
        items: result.data.filter(folder === 'sent' ? (email) => emailAddress(email.from) === MAILBOX : belongsToMailbox).map(({ id, from, to, subject, created_at, attachments }) =>
          ({ id, from, to, subject, created_at, attachmentCount: attachments?.length || 0 })),
        nextCursor: result.has_more ? result.data.at(-1)?.id || null : null,
      }
    },
    async get(id, folder = 'inbox') {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw inboxError(400, 'Invalid email ID.')
      const result = await request(`${folder === 'sent' ? '/emails' : '/emails/receiving'}/${encodeURIComponent(id)}`)
      if (folder === 'sent' ? emailAddress(result.from) !== MAILBOX : !belongsToMailbox(result)) throw inboxError(404, 'Email not found.')
      const { from, to, subject, created_at, text, html, attachments } = result
      return { id, from, to, subject, created_at, text, html, reply_to: result.reply_to || [], message_id: result.message_id,
        attachments: (attachments || []).map(({ filename, size }) => ({ filename, size })) }
    },
    async send(input) {
      const to = String(input.to || '').trim().toLowerCase()
      const subject = String(input.subject || '').trim()
      const text = String(input.text || '').trim()
      const requestId = String(input.requestId || '')
      if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(to) || to.length > 254) {
        throw inboxError(400, 'Enter one valid recipient email address.')
      }
      if (!subject || subject.length > 220 || /[\r\n]/.test(subject)) throw inboxError(400, 'Enter a subject of up to 220 characters.')
      if (!text || text.length > 20000) throw inboxError(400, 'Enter a message of up to 20,000 characters.')
      if (!/^[a-zA-Z0-9-]{16,100}$/.test(requestId)) throw inboxError(400, 'Invalid send request ID.')
      if (emailAddress(personalFrom) !== MAILBOX || /[\r\n]/.test(personalFrom)) {
        throw inboxError(503, `RESEND_ADMIN_FROM must use ${MAILBOX}.`)
      }
      let headers
      if (input.replyToId) {
        const original = await inbox.get(String(input.replyToId))
        const recipient = emailAddress(original.reply_to[0] || original.from)
        if (to !== recipient) throw inboxError(400, 'Reply recipient does not match this email.')
        if (original.message_id && !/[\r\n]/.test(original.message_id)) {
          headers = { 'In-Reply-To': original.message_id, References: original.message_id }
        }
      }
      const result = await request('/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `personal-email/${requestId}` },
        body: JSON.stringify({ from: personalFrom, to: [to], subject, text, reply_to: MAILBOX, headers }),
      })
      if (!result.id) throw inboxError(502, 'Resend did not confirm the send. Retry the same message.')
      return { id: result.id }
    },
  }
  return inbox
}

module.exports = { createResendInbox, belongsToMailbox, MAILBOX }
