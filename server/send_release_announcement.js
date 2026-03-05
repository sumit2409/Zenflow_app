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
const APP_URL = String(process.env.PUBLIC_APP_URL || 'https://zenflow.bio').trim().replace(/\/+$/, '')

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  emailLower: String,
  fullName: String,
}, { strict: false })
const User = mongoose.model('User', userSchema)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const onlyArg = args.find((arg) => arg.startsWith('--only='))
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1])) : null
const onlyEmail = onlyArg ? String(onlyArg.split('=')[1] || '').trim().toLowerCase() : ''

const subject = 'Zenflow Android app update: thank you for your support'
const makeText = (name) => [
  `Hi ${name},`,
  '',
  'We are excited to share our new and updated Zenflow Android app release.',
  '',
  'Thank you for being part of our growing community and supporting us in our fight against brain rot.',
  'Feel free to spread the word so more people can use our free resources.',
  '',
  `Download the latest Android app: ${APP_URL}/download/android`,
  '',
  'Have a nice day,',
  'Sumit Tiwari',
].join('\n')
const makeHtml = (name) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f241e">
    <p>Hi ${name},</p>
    <p>We are excited to share our new and updated Zenflow Android app release.</p>
    <p>Thank you for being part of our growing community and supporting us in our fight against brain rot.<br />Feel free to spread the word so more people can use our free resources.</p>
    <p><a href="${APP_URL}/download/android">Download the latest Android app</a></p>
    <p>Have a nice day,<br />Sumit Tiwari</p>
  </div>
`

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
      subject,
      text: makeText(name),
      html: makeHtml(name),
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
    subject,
    text: makeText(name),
    html: makeHtml(name),
  })
  return true
}

async function sendAnnouncement(to, name) {
  try {
    const resendSent = await sendViaResend(to, name)
    if (resendSent) return 'resend'
  } catch (error) {
    console.error(`Resend failed for ${to}:`, error.message)
  }

  try {
    const smtpSent = await sendViaSmtp(to, name)
    if (smtpSent) return 'smtp'
  } catch (error) {
    console.error(`SMTP failed for ${to}:`, error.message)
  }

  throw new Error('No delivery provider succeeded')
}

function displayName(user) {
  const clean = String(user?.fullName || '').trim()
  if (clean) return clean
  const username = String(user?.username || '').trim()
  if (username) return username
  const email = String(user?.email || '').trim()
  return email.split('@')[0] || 'there'
}

async function run() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing')
  }

  await mongoose.connect(MONGODB_URI)
  const users = await User.find({
    email: { $exists: true, $ne: '' },
  }).lean()

  const uniqueUsers = []
  const seen = new Set()
  for (const user of users) {
    const email = String(user.email || user.emailLower || '').trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    uniqueUsers.push({ ...user, email })
  }

  const scopedUsers = onlyEmail
    ? uniqueUsers.filter((user) => user.email === onlyEmail)
    : uniqueUsers
  const finalUsers = limit ? scopedUsers.slice(0, limit) : scopedUsers

  console.log(`Users found: ${uniqueUsers.length}`)
  console.log(`Users selected: ${finalUsers.length}`)
  if (dryRun) {
    console.log('Dry run mode enabled. No emails will be sent.')
    finalUsers.slice(0, 20).forEach((user) => console.log(`- ${user.email}`))
    return
  }

  let success = 0
  let failed = 0
  for (const user of finalUsers) {
    const to = user.email
    const name = displayName(user)
    try {
      const provider = await sendAnnouncement(to, name)
      success += 1
      console.log(`Sent (${provider}) -> ${to}`)
    } catch (error) {
      failed += 1
      console.error(`Failed -> ${to}: ${error.message}`)
    }
  }

  console.log(`Done. Success: ${success}. Failed: ${failed}.`)
}

run()
  .catch((error) => {
    console.error('Announcement script failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
    } catch {}
  })
