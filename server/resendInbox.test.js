const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createResendInbox, belongsToMailbox, MAILBOX } = require('./resendInbox')

test('matches exact recipients, including envelope and display names', () => {
  assert(belongsToMailbox({ to: [`Sumit <${MAILBOX.toUpperCase()}>`] }))
  assert(belongsToMailbox({ received_for: [MAILBOX] }))
  assert(belongsToMailbox({ bcc: [MAILBOX] }))
  assert(!belongsToMailbox({ to: [`other+${MAILBOX}`] }))
  assert(!belongsToMailbox({ to: 'not-an-array', from: MAILBOX }))
})

test('filters other mailboxes but preserves the unfiltered pagination cursor', async () => {
  const requests = []
  const inbox = createResendInbox('test-key', async (url, options) => {
    requests.push({ url, options })
    return { ok: true, json: async () => ({ has_more: true, data: [
      { id: 'mine', to: [MAILBOX], subject: 'Hello' },
      { id: 'other', to: ['private@example.com'] },
    ] }) }
  })
  const result = await inbox.list('previous')
  assert.deepEqual(result.items.map((item) => item.id), ['mine'])
  assert.equal(result.nextCursor, 'other')
  assert.match(requests[0].url, /limit=50&after=previous$/)
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-key')
  assert.equal(requests[0].options.signal.aborted, false)
})

test('an empty filtered page still allows fetching older mail', async () => {
  const inbox = createResendInbox('key', async () => ({ ok: true,
    json: async () => ({ has_more: true, data: [{ id: 'next', to: ['other@example.com'] }] }) }))
  const result = await inbox.list()
  assert.deepEqual(result.items, [])
  assert.equal(result.nextCursor, 'next')
})

test('detail cannot expose messages addressed to another mailbox', async () => {
  const inbox = createResendInbox('key', async () => ({ ok: true,
    json: async () => ({ to: ['other@example.com'], text: 'private' }) }))
  await assert.rejects(inbox.get('valid-id'), { status: 404 })
})

test('detail returns body and attachment metadata without private download URLs', async () => {
  const inbox = createResendInbox('key', async () => ({ ok: true,
    json: async () => ({ to: [MAILBOX], text: 'Hello', raw: { download_url: 'secret' },
      attachments: [{ filename: 'file.txt', size: 5, download_url: 'secret' }] }) }))
  const result = await inbox.get('valid-id')
  assert.equal(result.text, 'Hello')
  assert.equal(result.raw, undefined)
  assert.deepEqual(result.attachments, [{ filename: 'file.txt', size: 5 }])
})

test('rejects missing key and invalid IDs before making network requests', async () => {
  const noFetch = async () => { throw new Error('Must not fetch') }
  await assert.rejects(createResendInbox('', noFetch).list(), { status: 503 })
  const inbox = createResendInbox('key', noFetch)
  await assert.rejects(inbox.list('../secret'), { status: 400 })
  await assert.rejects(inbox.get('../secret'), { status: 400 })
})

test('provider errors never return the API key or raw provider response', async () => {
  for (const [upstream, status] of [[403, 503], [429, 429], [500, 502], [404, 404]]) {
    const inbox = createResendInbox('secret-key', async () => ({ ok: false, status: upstream }))
    await assert.rejects(inbox.list(), (error) => error.status === status && !error.message.includes('secret-key'))
  }
  const unavailable = createResendInbox('key', async () => { throw new Error('secret-key') })
  await assert.rejects(unavailable.list(), { status: 502 })
})

const personalDraft = { to: 'friend@example.com', subject: 'Hello', text: 'Personal message', requestId: '01234567-89ab-cdef-0123-456789abcdef' }

test('personal sends use mailbox sender and reply address without auth-email BCC', async () => {
  let sent
  const inbox = createResendInbox('key', async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) }
    return { ok: true, json: async () => ({ id: 'sent-id' }) }
  })
  assert.deepEqual(await inbox.send(personalDraft), { id: 'sent-id' })
  assert.equal(sent.url, 'https://api.resend.com/emails')
  assert.equal(sent.options.method, 'POST')
  assert.equal(sent.body.from, `Sumit Tiwari <${MAILBOX}>`)
  assert.equal(sent.body.reply_to, MAILBOX)
  assert.equal(sent.body.bcc, undefined)
  assert.equal(sent.options.headers['Idempotency-Key'], `personal-email/${personalDraft.requestId}`)
})

test('reply checks original mailbox and adds conversation headers', async () => {
  let sent
  const inbox = createResendInbox('key', async (url, options) => {
    if (options.method === 'POST') {
      sent = JSON.parse(options.body)
      return { ok: true, json: async () => ({ id: 'sent-id' }) }
    }
    assert.match(url, /receiving\/original$/)
    return { ok: true, json: async () => ({ to: [MAILBOX], from: 'Sender <sender@example.com>',
      reply_to: ['Friend <friend@example.com>'], message_id: '<original@example.com>' }) }
  })
  await inbox.send({ ...personalDraft, replyToId: 'original' })
  assert.deepEqual(sent.headers, { 'In-Reply-To': '<original@example.com>', References: '<original@example.com>' })
  await assert.rejects(inbox.send({ ...personalDraft, replyToId: 'original', to: 'other@example.com' }), { status: 400 })
})

test('rejects invalid drafts and a sender outside the personal mailbox', async () => {
  const noFetch = async () => { throw new Error('Must not fetch') }
  const inbox = createResendInbox('key', noFetch)
  for (const changes of [{ to: 'a@example.com,b@example.com' }, { to: 'bad' }, { subject: 'Injected\r\nBcc: a@example.com' },
    { subject: '' }, { text: '' }, { text: 'x'.repeat(20001) }, { requestId: '' }]) {
    await assert.rejects(inbox.send({ ...personalDraft, ...changes }), { status: 400 })
  }
  await assert.rejects(createResendInbox('key', noFetch, 'Zenflow <no-reply@zenflow.bio>').send(personalDraft), { status: 503 })
})

test('sent folder excludes automated mail and protects sent detail', async () => {
  const inbox = createResendInbox('key', async (url) => ({ ok: true, json: async () =>
    url.includes('?') ? { data: [{ id: 'mine', from: `Sumit <${MAILBOX}>`, to: ['friend@example.com'] },
      { id: 'automated', from: 'no-reply@zenflow.bio' }], has_more: false }
      : { from: 'no-reply@zenflow.bio', to: [MAILBOX] } }))
  assert.deepEqual((await inbox.list('', 'sent')).items.map((item) => item.id), ['mine'])
  await assert.rejects(inbox.get('automated', 'sent'), { status: 404 })
})
