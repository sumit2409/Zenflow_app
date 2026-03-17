const path = require('path')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const MONGODB_URI = process.env.MONGODB_URI || ''
const SMTP_HOST = String(process.env.SMTP_HOST || '').trim()
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').trim() === 'true'
const SMTP_USER = String(process.env.SMTP_USER || '').trim()
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim()
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER || '').trim()
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim()
const RESEND_FROM = String(process.env.RESEND_FROM || SMTP_FROM || '').trim()
const WEBSITE_URL = String(process.env.PUBLIC_APP_URL || 'https://zenflow.bio').trim().replace(/\/+$/, '')
const LAST_SENT_SETTING_KEY = 'campaign:weekly-wellness:last-sent-week'

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  emailLower: String,
  fullName: String,
  emailVerified: Boolean,
  googleId: String,
}, { strict: false })

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { strict: false })

const User = mongoose.model('User', userSchema)
const Setting = mongoose.model('Setting', settingSchema)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const onlyArg = args.find((arg) => arg.startsWith('--only='))
const providerArg = args.find((arg) => arg.startsWith('--provider='))
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1])) : null
const onlyEmail = onlyArg ? String(onlyArg.split('=')[1] || '').trim().toLowerCase() : ''
const forcedProvider = providerArg ? String(providerArg.split('=')[1] || '').trim().toLowerCase() : ''

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function sanitizeFullName(fullName) {
  return String(fullName || '').trim().replace(/\s+/g, ' ')
}

function buildIsoWeekKey(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = current.getUTCDay() || 7
  current.setUTCDate(current.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((current - yearStart) / 86400000) + 1) / 7)
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function displayName(user) {
  const clean = sanitizeFullName(user?.fullName || '')
  if (clean) return clean
  const username = String(user?.username || '').trim()
  if (username) return username
  const email = normalizeEmail(user?.email || user?.emailLower || '')
  return email.split('@')[0] || 'there'
}

function buildText(name) {
  return [
    `Hi ${name},`,
    '',
    'This is your weekly reminder to keep going on your wellness journey, one small step at a time.',
    'If you need help getting back into rhythm, you can always use Zenflow for focus sessions, planning, meditation, Sudoku, and quick reset games.',
    '',
    'We are still new, and you are one of our first few users.',
    'Any feedback on our website, your ideas, or simply spreading the word matters a lot to us.',
    'Let us grow together with you.',
    '',
    `Visit Zenflow: ${WEBSITE_URL}`,
    '',
    'With gratitude,',
    'The Zenflow team',
  ].join('\n')
}

function buildHtml(name) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2f241e;background:#f8f2eb;padding:32px 20px">
      <div style="max-width:620px;margin:0 auto;background:#fffaf5;border:1px solid #e7d8ca;border-radius:22px;overflow:hidden">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#fff6eb 0%,#f3e5d7 100%)">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f2dfd2;color:#bc6c47;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Weekly check-in</div>
          <h1 style="margin:16px 0 10px;font-size:28px;line-height:1.1;color:#2f241e">Keep going on your wellness journey</h1>
          <p style="margin:0;color:#5f5249;font-size:15px">A small reminder from the Zenflow team to stay steady, take care of yourself, and come back to the tools whenever you need them.</p>
        </div>
        <div style="padding:26px 28px 30px">
          <p style="margin-top:0">Hi ${name},</p>
          <p>This is your weekly reminder to keep going on your wellness journey, one small step at a time.</p>
          <p>If you need help getting back into rhythm, you can always use Zenflow for focus sessions, planning, meditation, Sudoku, and quick reset games.</p>
          <p>We are still new, and you are one of our first few users. Any feedback on our website, your ideas, or simply spreading the word matters a lot to us.</p>
          <p style="margin-bottom:24px">Let us grow together with you.</p>
          <p style="margin:0 0 28px">
            <a href="${WEBSITE_URL}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#bc6c47;color:#fffaf5;text-decoration:none;font-weight:700">Visit Zenflow</a>
          </p>
          <p style="margin-bottom:0">With gratitude,<br />The Zenflow team</p>
        </div>
      </div>
    </div>
  `
}

let smtpTransporter = null
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter
  if (!SMTP_HOST || !SMTP_FROM) return null
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
  return smtpTransporter
}

async function sendViaResend(to, name) {
  if (!RESEND_API_KEY || !RESEND_FROM) return false
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject: 'A gentle weekly wellness check-in from Zenflow',
      text: buildText(name),
      html: buildHtml(name),
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Resend ${response.status}: ${text}`)
  }
  return true
}

async function sendViaSmtp(to, name) {
  const transporter = getSmtpTransporter()
  if (!transporter) return false
  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'A gentle weekly wellness check-in from Zenflow',
    text: buildText(name),
    html: buildHtml(name),
  })
  return true
}

async function sendReminder(to, name) {
  const flow = forcedProvider === 'resend'
    ? ['resend']
    : forcedProvider === 'smtp'
      ? ['smtp']
      : ['resend', 'smtp']

  for (const provider of flow) {
    try {
      if (provider === 'resend') {
        const resendSent = await sendViaResend(to, name)
        if (resendSent) return 'resend'
      } else {
        const smtpSent = await sendViaSmtp(to, name)
        if (smtpSent) return 'smtp'
      }
    } catch (error) {
      console.error(`${provider.toUpperCase()} failed for ${to}:`, error.message)
    }
  }

  throw new Error('No delivery provider succeeded')
}

async function getLastSentWeek() {
  const entry = await Setting.findOne({ key: LAST_SENT_SETTING_KEY }).lean().exec()
  return entry?.value || null
}

async function setLastSentWeek(weekKey) {
  await Setting.findOneAndUpdate({ key: LAST_SENT_SETTING_KEY }, { value: weekKey }, { upsert: true }).exec()
}

async function loadUsers() {
  if (onlyEmail) {
    return [{ email: onlyEmail, fullName: onlyEmail.split('@')[0] || 'there', username: onlyEmail.split('@')[0] || '' }]
  }

  const users = await User.find({
    email: { $exists: true, $ne: '' },
  }).lean()

  const uniqueUsers = []
  const seen = new Set()
  for (const user of users) {
    const email = normalizeEmail(user.email || user.emailLower || '')
    const verified = user.googleId || user.emailVerified === undefined || user.emailVerified === null || Boolean(user.emailVerified)
    if (!email || !verified || seen.has(email)) continue
    seen.add(email)
    uniqueUsers.push({ ...user, email })
  }

  return limit ? uniqueUsers.slice(0, limit) : uniqueUsers
}

async function run() {
  const weekKey = buildIsoWeekKey(new Date())

  if (!onlyEmail) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is missing')
    }
    await mongoose.connect(MONGODB_URI)
    const lastSentWeek = await getLastSentWeek()
    if (!force && lastSentWeek === weekKey) {
      console.log(`Weekly wellness email already sent for ${weekKey}. Use --force to send again.`)
      return
    }
  }

  const users = await loadUsers()
  console.log(`Users selected: ${users.length}`)

  if (dryRun) {
    console.log('Dry run mode enabled. No emails will be sent.')
    users.slice(0, 20).forEach((user) => console.log(`- ${user.email}`))
    return
  }

  let success = 0
  let failed = 0
  for (const user of users) {
    const to = user.email
    const name = displayName(user)
    try {
      const provider = await sendReminder(to, name)
      success += 1
      console.log(`Sent (${provider}) -> ${to}`)
    } catch (error) {
      failed += 1
      console.error(`Failed -> ${to}: ${error.message}`)
    }
  }

  if (!onlyEmail && (success > 0 || users.length === 0)) {
    await setLastSentWeek(weekKey)
  }

  console.log(`Done. Success: ${success}. Failed: ${failed}.`)
}

run()
  .catch((error) => {
    console.error('Weekly wellness script failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
    } catch {}
  })
