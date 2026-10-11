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
