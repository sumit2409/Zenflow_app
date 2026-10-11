const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

const source = fs.readFileSync(require.resolve('./index.js'), 'utf8')
const senderFunction = source.slice(source.indexOf('async function sendTransactionalEmail('),
  source.indexOf('async function sendPasswordResetEmail('))
const senderSettings = source.match(/^const RESEND_FROM = .+$/m)[0] + '\n' +
  source.match(/^const RESEND_ADMIN_FROM = .+$/m)[0]

function mockSender(adminFrom) {
  const messages = []
  const context = {
    process: { env: { RESEND_FROM: 'Zenflow <no-reply@zenflow.bio>', RESEND_ADMIN_FROM: adminFrom } },
    SMTP_FROM: '', RESEND_API_KEY: 'mock-key', SMTP_RESET_BCC: '',
    MAILBOX: 'sumit.tiwari@zenflow.bio',
    normalizeEmail: (value) => String(value || '').trim().toLowerCase(),
    AbortController, setTimeout, clearTimeout, console,
    fetch: async (_url, options) => {
      messages.push(JSON.parse(options.body))
      return { ok: true }
    },
  }
  vm.createContext(context)
  vm.runInContext(senderSettings + '\n' + senderFunction, context)
  return { send: context.sendTransactionalEmail, messages }
}

test('transactional email always keeps the original sender even with personal sender configured', async () => {
  const { send, messages } = mockSender('Zenflow <sumit.tiwari@zenflow.bio>')
  const email = { to: 'recipient@example.com', subject: 'Test', text: 'Hello', preferredProvider: 'resend' }
  assert.equal((await send(email)).delivered, true)
  assert.equal((await send({ ...email, replyTo: 'contactsumit2409@gmail.com' })).delivered, true)
  assert.equal(messages[0].from, 'Zenflow <no-reply@zenflow.bio>')
  assert.equal(messages[1].from, 'Zenflow <no-reply@zenflow.bio>')
})

test('existing deployments keep their sender when the new variable is absent', async () => {
  const { send, messages } = mockSender(undefined)
  await send({ to: 'recipient@example.com', subject: 'Test', preferredProvider: 'resend' })
  assert.equal(messages[0].from, 'Zenflow <no-reply@zenflow.bio>')
})

test('transactional email retains an explicit reply address', async () => {
  const { send, messages } = mockSender('Zenflow <sumit.tiwari@zenflow.bio>')
  await send({ to: 'recipient@example.com', subject: 'Test',
    preferredProvider: 'resend', replyTo: 'sumit.tiwari@zenflow.bio' })
  assert.equal(messages[0].reply_to, 'sumit.tiwari@zenflow.bio')
})
