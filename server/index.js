const express = require('express')
const bodyParser = require('body-parser')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const { OAuth2Client } = require('google-auth-library')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const JWT_SECRET = process.env.ZENFLOW_SECRET || 'dev-secret'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zenflow'
const isProduction = process.env.NODE_ENV === 'production'
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || '').trim()
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')
const SMTP_HOST = String(process.env.SMTP_HOST || '').trim()
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').trim() === 'true'
const SMTP_USER = String(process.env.SMTP_USER || '').trim()
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim()
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER || '').trim()
const SMTP_RESET_BCC = String(process.env.SMTP_RESET_BCC || '').trim()
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim()
const RESEND_FROM = String(process.env.RESEND_FROM || SMTP_FROM || '').trim()
const ADMIN_BROADCAST_KEY = String(process.env.ADMIN_BROADCAST_KEY || '').trim()
const DEFAULT_APK_DIRECT_URL = 'https://raw.githubusercontent.com/sumit2409/Zenflow_app/main/downloads/zenflow-app.apk'
const DEFAULT_APK_FALLBACK_URL = 'https://github.com/sumit2409/Zenflow_app/releases'
const APK_DOWNLOAD_URL = String(process.env.APK_DOWNLOAD_URL || '').trim()
const DEFAULT_WEBSITE_URL = 'https://zenflow.bio'
const WEBSITE_URL = (PUBLIC_APP_URL || DEFAULT_WEBSITE_URL).trim().replace(/\/+$/, '')
const WEEKLY_WELLNESS_EMAILS_ENABLED = String(process.env.WEEKLY_WELLNESS_EMAILS_ENABLED || '').trim() === 'true'
const WEEKLY_WELLNESS_EMAILS_DAY_UTC = clampIntegerEnv(process.env.WEEKLY_WELLNESS_EMAILS_DAY_UTC, 1, 0, 6)
const WEEKLY_WELLNESS_EMAILS_HOUR_UTC = clampIntegerEnv(process.env.WEEKLY_WELLNESS_EMAILS_HOUR_UTC, 9, 0, 23)
const WEEKLY_WELLNESS_EMAILS_MINUTE_UTC = clampIntegerEnv(process.env.WEEKLY_WELLNESS_EMAILS_MINUTE_UTC, 0, 0, 59)
const WEEKLY_WELLNESS_EMAILS_INTERVAL_MS = 15 * 60 * 1000
const WEEKLY_WELLNESS_LAST_SENT_SETTING_KEY = 'campaign:weekly-wellness:last-sent-week'

const DATA_FILE = path.join(__dirname, 'data.json')
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MS = 10 * 60 * 1000
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000
const EMAIL_VERIFICATION_WINDOW_MS = 15 * 60 * 1000
const loginAttempts = new Map()
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null
let mailTransporter = null

let useFileStorage = false
let weeklyWellnessInterval = null
let weeklyWellnessJobRunning = false

function clampIntegerEnv(rawValue, fallback, min, max) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  usernameLower: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  emailLower: { type: String, unique: true, sparse: true },
  fullName: String,
  password: String,
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, default: 'local' },
  resetPasswordCodeHash: String,
  resetPasswordExpiresAt: Number,
  emailVerified: { type: Boolean, default: true },
  emailVerificationCodeHash: String,
  emailVerificationExpiresAt: Number,
  created: Number,
  lastLoginAt: Number,
  loginCount: { type: Number, default: 0 },
})
const logSchema = new mongoose.Schema({ user: String, date: String, type: String, value: Number })
const metaSchema = new mongoose.Schema({ user: String, meta: mongoose.Schema.Types.Mixed })
const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
})

let User
let Log
let Meta
let Setting

function normalizeUsername(username) {
  return String(username || '').trim()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function sanitizeFullName(fullName) {
  return String(fullName || '').trim().replace(/\s+/g, ' ')
}

function validatePassword(password, confirmPassword) {
  if (String(password || '').length < 8) {
    return 'password must be at least 8 characters'
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'password must include uppercase, lowercase, and a number'
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return 'password confirmation does not match'
  }
  return null
}

function validateRegistration({ username, email, fullName, password, confirmPassword }) {
  const cleanUsername = normalizeUsername(username)
  const cleanEmail = normalizeEmail(email)
  const cleanFullName = sanitizeFullName(fullName)

  if (!cleanFullName || cleanFullName.length < 2) {
    return { error: 'full name must be at least 2 characters', data: null }
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
    return { error: 'username must be 3 to 20 characters using letters, numbers, or underscores', data: null }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { error: 'enter a valid email address', data: null }
  }
  const passwordError = validatePassword(password, confirmPassword)
  if (passwordError) return { error: passwordError, data: null }

  return {
    error: null,
    data: {
      username: cleanUsername,
      usernameLower: cleanUsername.toLowerCase(),
      email: cleanEmail,
      emailLower: cleanEmail,
      fullName: cleanFullName,
      password: String(password || ''),
    },
  }
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, logs: {}, meta: {}, system: {} }, null, 2), 'utf8')
  }
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  parsed.users = parsed.users || {}
  parsed.logs = parsed.logs || {}
  parsed.meta = parsed.meta || {}
  parsed.system = parsed.system || {}
  return parsed
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function genToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' })
}

function createResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function hashResetCode(code) {
  return crypto.createHash('sha256').update(String(code || '')).digest('hex')
}

function isEmailVerified(user) {
  if (!user) return false
  if (user.googleId) return true
  if (user.emailVerified === undefined || user.emailVerified === null) return true
  return Boolean(user.emailVerified)
}

function slugifyUsername(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'zenflow_user'
}

async function getMailTransporter() {
  if (mailTransporter) return mailTransporter
  if (!SMTP_HOST || !SMTP_FROM) return null

  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })

  return mailTransporter
}

function buildResetUrl(req, identifier, code) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProto || req.protocol || 'https'
  const host = req.get('host')
  const baseUrl = PUBLIC_APP_URL || `${protocol}://${host}`
  const params = new URLSearchParams({
    reset: '1',
    identifier: String(identifier || ''),
    code: String(code || ''),
  })
  return `${baseUrl}/?${params.toString()}`
}

function buildEmailVerificationUrl(req, identifier, code) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProto || req.protocol || 'https'
  const host = req.get('host')
  const baseUrl = PUBLIC_APP_URL || `${protocol}://${host}`
  const params = new URLSearchParams({
    verify: '1',
    identifier: String(identifier || ''),
    code: String(code || ''),
  })
  return `${baseUrl}/?${params.toString()}`
}

function buildResetEmail({ fullName, code, resetUrl }) {
  const safeName = sanitizeFullName(fullName) || 'there'
  return {
    subject: `Zenflow reset code: ${code}`,
    text: [
      `Hi ${safeName},`,
      '',
      'You requested a password reset for Zenflow.',
      '',
      `Reset code: ${code}`,
      '',
      `Reset link: ${resetUrl}`,
      '',
      'This code expires in 15 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f241e">
        <p>Hi ${safeName},</p>
        <p>You requested a password reset for Zenflow.</p>
        <p>Your reset code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p><a href="${resetUrl}">Open Zenflow to reset your password</a></p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  }
}

function buildEmailVerificationEmail({ fullName, code, verifyUrl }) {
  const safeName = sanitizeFullName(fullName) || 'there'
  return {
    subject: `Zenflow verify your email: ${code}`,
    text: [
      `Hi ${safeName},`,
      '',
      'Welcome to Zenflow.',
      '',
      `Verification code: ${code}`,
      '',
      `Verification link: ${verifyUrl}`,
      '',
      'This code expires in 15 minutes.',
      'If you did not create this account, ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f241e">
        <p>Hi ${safeName},</p>
        <p>Welcome to Zenflow.</p>
        <p>Use this verification code to activate your account:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p><a href="${verifyUrl}">Open Zenflow to verify your email</a></p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not create this account, ignore this email.</p>
      </div>
    `,
  }
}

async function sendTransactionalEmail({ to, subject, text, html, preferredProvider = 'auto' }) {
  const recipients = Array.isArray(to) ? to : [to]
  const normalizedRecipients = Array.from(
    new Set(
      recipients
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase())
    )
  )
  if (!normalizedRecipients.length) return { delivered: false }

  async function sendViaResend() {
    if (!RESEND_API_KEY || !RESEND_FROM) return { attempted: false, delivered: false }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: normalizedRecipients,
          bcc: SMTP_RESET_BCC ? [SMTP_RESET_BCC] : undefined,
          subject,
          text,
          html,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[resend] send failed status=${response.status} body=${errorText}`)
        return { attempted: true, delivered: false }
      }
      return { attempted: true, delivered: true }
    } catch (error) {
      console.error('[resend] send failed:', error?.message || error)
      return { attempted: true, delivered: false }
    }
  }

  async function sendViaSmtp() {
    const transporter = await getMailTransporter()
    if (!transporter) return { attempted: false, delivered: false }
    try {
      const sendAttempt = transporter.sendMail({
        from: SMTP_FROM,
        to: normalizedRecipients.join(', '),
        bcc: SMTP_RESET_BCC || undefined,
        subject,
        text,
        html,
      })
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP send timeout after 20s')), 20000)
      )
      const result = await Promise.race([sendAttempt, timeout])
      const acceptedCount = Array.isArray(result?.accepted) ? result.accepted.length : 0
      const delivered = acceptedCount > 0
      return { attempted: true, delivered }
    } catch (error) {
      console.error('SMTP send failed:', error?.message || error)
      return { attempted: true, delivered: false }
    }
  }

  if (preferredProvider === 'resend') {
    const resendResult = await sendViaResend()
    return { delivered: resendResult.delivered, provider: 'resend' }
  }

  if (preferredProvider === 'smtp') {
    const smtpResult = await sendViaSmtp()
    return { delivered: smtpResult.delivered, provider: 'smtp' }
  }

  const resendResult = await sendViaResend()
  if (resendResult.delivered) return { delivered: true, provider: 'resend' }
  const smtpResult = await sendViaSmtp()
  if (smtpResult.delivered) return { delivered: true, provider: 'smtp' }
  if (!resendResult.attempted && !smtpResult.attempted) {
    return { delivered: false, provider: 'none' }
  }
  return { delivered: false, provider: resendResult.attempted ? 'resend+smtp' : 'smtp' }
}

async function sendPasswordResetEmail({ to, fullName, code, resetUrl }) {
  const mail = buildResetEmail({ fullName, code, resetUrl })
  return sendTransactionalEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  })
}

async function sendEmailVerificationEmail({ to, fullName, code, verifyUrl }) {
  const mail = buildEmailVerificationEmail({ fullName, code, verifyUrl })
  return sendTransactionalEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  })
}

function buildCommunityAnnouncementEmail({ fullName, downloadUrl, websiteUrl = WEBSITE_URL }) {
  const safeName = sanitizeFullName(fullName) || 'there'
  return {
    subject: 'Zenflow Android app update for our earliest community members',
    text: [
      `Hi cuties (${safeName}),`,
      '',
      'We are excited to share our new and updated Zenflow Android app release.',
      `Website: ${websiteUrl}`,
      `Android app download: ${downloadUrl}`,
      '',
      'You are the earliest members of our fastly growing community of users.',
      'We rely on your input, and we rely on you to spread the word and share feedback.',
      '',
      'Have a nice day,',
      'Sumit Tiwari',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f241e">
        <p>Hi cuties (${safeName}),</p>
        <p>We are excited to share our new and updated Zenflow Android app release.</p>
        <p><a href="${websiteUrl}">Visit our website</a></p>
        <p><a href="${downloadUrl}">Download the latest Android app</a></p>
        <p>You are the earliest members of our fastly growing community of users.<br />We rely on your input, and we rely on you to spread the word and share feedback.</p>
        <p>Have a nice day,<br />Sumit Tiwari</p>
      </div>
    `,
  }
}

async function sendCommunityAnnouncementEmail({ to, fullName, preferredProvider = 'auto', downloadUrl, websiteUrl }) {
  const mail = buildCommunityAnnouncementEmail({ fullName, downloadUrl, websiteUrl })
  return sendTransactionalEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    preferredProvider,
  })
}

function buildWeeklyWellnessReminderEmail({ fullName, websiteUrl = WEBSITE_URL }) {
  const safeName = sanitizeFullName(fullName) || 'there'
  return {
    subject: 'A gentle weekly wellness check-in from Zenflow',
    text: [
      `Hi ${safeName},`,
      '',
      'This is your weekly reminder to keep going on your wellness journey, one small step at a time.',
      'If you need help getting back into rhythm, you can always use Zenflow for focus sessions, planning, meditation, Sudoku, and quick reset games.',
      '',
      'We are still new, and you are one of our first few users.',
      'Any feedback on our website, your ideas, or simply spreading the word matters a lot to us.',
      'Let us grow together with you.',
      '',
      `Visit Zenflow: ${websiteUrl}`,
      '',
      'With gratitude,',
      'The Zenflow team',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2f241e;background:#f8f2eb;padding:32px 20px">
        <div style="max-width:620px;margin:0 auto;background:#fffaf5;border:1px solid #e7d8ca;border-radius:22px;overflow:hidden">
          <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#fff6eb 0%,#f3e5d7 100%)">
            <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f2dfd2;color:#bc6c47;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Weekly check-in</div>
            <h1 style="margin:16px 0 10px;font-size:28px;line-height:1.1;color:#2f241e">Keep going on your wellness journey</h1>
            <p style="margin:0;color:#5f5249;font-size:15px">A small reminder from the Zenflow team to stay steady, take care of yourself, and come back to the tools whenever you need them.</p>
          </div>
          <div style="padding:26px 28px 30px">
            <p style="margin-top:0">Hi ${safeName},</p>
            <p>This is your weekly reminder to keep going on your wellness journey, one small step at a time.</p>
            <p>If you need help getting back into rhythm, you can always use Zenflow for focus sessions, planning, meditation, Sudoku, and quick reset games.</p>
            <p>We are still new, and you are one of our first few users. Any feedback on our website, your ideas, or simply spreading the word matters a lot to us.</p>
            <p style="margin-bottom:24px">Let us grow together with you.</p>
            <p style="margin:0 0 28px">
              <a href="${websiteUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#bc6c47;color:#fffaf5;text-decoration:none;font-weight:700">Visit Zenflow</a>
            </p>
            <p style="margin-bottom:0">With gratitude,<br />The Zenflow team</p>
          </div>
        </div>
      </div>
    `,
  }
}

async function sendWeeklyWellnessReminderEmail({ to, fullName, preferredProvider = 'auto', websiteUrl }) {
  const mail = buildWeeklyWellnessReminderEmail({ fullName, websiteUrl })
  return sendTransactionalEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    preferredProvider,
  })
}

function buildIsoWeekKey(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = current.getUTCDay() || 7
  current.setUTCDate(current.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((current - yearStart) / 86400000) + 1) / 7)
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function getIsoWeekStart(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - day + 1)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

function getIsoDayOffsetFromUtcDay(day) {
  return day === 0 ? 6 : day - 1
}

function getWeeklyWellnessScheduledAt(date = new Date()) {
  const scheduledAt = getIsoWeekStart(date)
  scheduledAt.setUTCDate(scheduledAt.getUTCDate() + getIsoDayOffsetFromUtcDay(WEEKLY_WELLNESS_EMAILS_DAY_UTC))
  scheduledAt.setUTCHours(WEEKLY_WELLNESS_EMAILS_HOUR_UTC, WEEKLY_WELLNESS_EMAILS_MINUTE_UTC, 0, 0)
  return scheduledAt
}

function getWeeklyWellnessScheduleLabel() {
  return `UTC day ${WEEKLY_WELLNESS_EMAILS_DAY_UTC} at ${String(WEEKLY_WELLNESS_EMAILS_HOUR_UTC).padStart(2, '0')}:${String(WEEKLY_WELLNESS_EMAILS_MINUTE_UTC).padStart(2, '0')}`
}

async function getSystemSetting(key) {
  if (useFileStorage) {
    const data = readData()
    return data.system?.[key] ?? null
  }

  if (!Setting) return null
  const entry = await Setting.findOne({ key }).lean().exec()
  return entry ? entry.value : null
}

async function setSystemSetting(key, value) {
  if (useFileStorage) {
    const data = readData()
    data.system = data.system || {}
    data.system[key] = value
    writeData(data)
    return
  }

  if (!Setting) return
  await Setting.findOneAndUpdate({ key }, { value }, { upsert: true }).exec()
}

function userCanReceiveCampaigns(user) {
  return Boolean(normalizeEmail(user?.email || user?.emailLower || '')) && isEmailVerified(user)
}

function buildCampaignRecipient(user) {
  const email = normalizeEmail(user?.email || user?.emailLower || '')
  if (!email) return null
  return {
    email,
    fullName: sanitizeFullName(user?.fullName || user?.username || email.split('@')[0] || 'there'),
    username: normalizeUsername(user?.username || ''),
  }
}

async function collectCampaignRecipients({ only = '', limit = null } = {}) {
  if (only) {
    const directEmail = normalizeEmail(only)
    return directEmail
      ? [{ email: directEmail, fullName: directEmail.split('@')[0] || 'there', username: directEmail.split('@')[0] || '' }]
      : []
  }

  let recipients = []

  if (useFileStorage) {
    const data = readData()
    recipients = Object.values(data.users || {})
      .filter(userCanReceiveCampaigns)
      .map(buildCampaignRecipient)
      .filter(Boolean)
  } else {
    const users = await User.find({ email: { $exists: true, $ne: '' } })
      .select({ email: 1, emailLower: 1, fullName: 1, username: 1, emailVerified: 1, googleId: 1 })
      .lean()
      .exec()

    recipients = users
      .filter(userCanReceiveCampaigns)
      .map(buildCampaignRecipient)
      .filter(Boolean)
  }

  const deduped = []
  const seen = new Set()
  for (const recipient of recipients) {
    if (!recipient.email || seen.has(recipient.email)) continue
    seen.add(recipient.email)
    deduped.push(recipient)
  }

  return limit ? deduped.slice(0, limit) : deduped
}

async function runWeeklyWellnessCampaign({ preferredProvider = 'auto', dryRun = false, limit = null, only = '', force = false } = {}) {
  const weekKey = buildIsoWeekKey(new Date())
  const alreadySentWeek = await getSystemSetting(WEEKLY_WELLNESS_LAST_SENT_SETTING_KEY)
  if (!only && !force && alreadySentWeek === weekKey) {
    return {
      ok: true,
      skipped: true,
      reason: 'already sent this week',
      weekKey,
      schedule: getWeeklyWellnessScheduleLabel(),
      totalRecipients: 0,
      sent: 0,
      failed: 0,
      failures: [],
    }
  }

  const recipients = await collectCampaignRecipients({ only, limit })
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      skipped: false,
      weekKey,
      schedule: getWeeklyWellnessScheduleLabel(),
      totalRecipients: recipients.length,
      recipients: recipients.slice(0, 25).map((item) => item.email),
      sent: 0,
      failed: 0,
      failures: [],
    }
  }

  const sent = []
  const failures = []

  for (const recipient of recipients) {
    try {
      const result = await sendWeeklyWellnessReminderEmail({
        to: recipient.email,
        fullName: recipient.fullName || recipient.username || 'there',
        preferredProvider,
        websiteUrl: WEBSITE_URL,
      })
      if (!result.delivered) {
        failures.push({ email: recipient.email, reason: `${result.provider || preferredProvider} delivery failed` })
        continue
      }
      sent.push({ email: recipient.email, provider: result.provider || preferredProvider })
    } catch (error) {
      failures.push({ email: recipient.email, reason: error?.message || 'send failed' })
    }
  }

  if (sent.length > 0 || recipients.length === 0) {
    await setSystemSetting(WEEKLY_WELLNESS_LAST_SENT_SETTING_KEY, weekKey)
  }

  return {
    ok: true,
    skipped: false,
    weekKey,
    schedule: getWeeklyWellnessScheduleLabel(),
    totalRecipients: recipients.length,
    sent: sent.length,
    failed: failures.length,
    failures: failures.slice(0, 25),
  }
}

async function maybeRunWeeklyWellnessCampaign() {
  if (!WEEKLY_WELLNESS_EMAILS_ENABLED || weeklyWellnessJobRunning) return
  if (!((SMTP_HOST && SMTP_FROM) || (RESEND_API_KEY && RESEND_FROM))) return

  const now = new Date()
  const scheduledAt = getWeeklyWellnessScheduledAt(now)
  if (now < scheduledAt) return

  weeklyWellnessJobRunning = true
  try {
    const result = await runWeeklyWellnessCampaign()
    if (!result.skipped) {
      console.log(`[weekly-wellness] week=${result.weekKey} sent=${result.sent} failed=${result.failed}`)
    }
  } catch (error) {
    console.error('[weekly-wellness] automated send failed:', error)
  } finally {
    weeklyWellnessJobRunning = false
  }
}

function startWeeklyWellnessScheduler() {
  if (!WEEKLY_WELLNESS_EMAILS_ENABLED) return
  if (weeklyWellnessInterval) return

  console.log(`[weekly-wellness] automatic emails enabled on ${getWeeklyWellnessScheduleLabel()}`)
  void maybeRunWeeklyWellnessCampaign()
  weeklyWellnessInterval = setInterval(() => {
    void maybeRunWeeklyWellnessCampaign()
  }, WEEKLY_WELLNESS_EMAILS_INTERVAL_MS)
}

function buildAccount(user) {
  if (!user) return null
  return {
    username: user.username,
    fullName: user.fullName || user.username,
    email: user.email || '',
    analyticsId: buildAnalyticsUserId(user),
    authProvider: user.authProvider || (user.googleId ? 'google' : 'local'),
    created: user.created || null,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: Number(user.loginCount || 0),
    emailVerified: isEmailVerified(user),
  }
}

function buildAnalyticsUserId(user) {
  const seed = user?._id || user?.id || user?.usernameLower || user?.username || user?.emailLower || user?.email
  if (!seed) return null

  return crypto
    .createHmac('sha256', `${JWT_SECRET}:ga4-user-id`)
    .update(String(seed))
    .digest('hex')
}

async function generateUniqueDbUsername(seed) {
  const base = slugifyUsername(seed)
  let attempt = base
  let counter = 1

  while (await User.findOne({ usernameLower: attempt.toLowerCase() }).exec()) {
    counter += 1
    attempt = `${base}_${counter}`
  }

  return attempt
}

function generateUniqueFileUsername(data, seed) {
  const base = slugifyUsername(seed)
  let attempt = base
  let counter = 1
  const users = data.users || {}

  while (
    Object.entries(users).some(([username, user]) => {
      const lowered = String(user.usernameLower || username).toLowerCase()
      return lowered === attempt.toLowerCase()
    })
  ) {
    counter += 1
    attempt = `${base}_${counter}`
  }

  return attempt
}

function calculateLogPoints(type, value) {
  const normalizedType = String(type || '').startsWith('sudoku') ? 'sudoku' : String(type || '')
  const numericValue = Number(value || 0)
  if (normalizedType === 'pomodoro') return Math.round(numericValue * 4)
  if (normalizedType === 'meditation') return Math.round(numericValue * 5)
  if (normalizedType === 'sudoku') return Math.round(numericValue * 70)
  if (normalizedType === 'memory') return Math.round(numericValue * 55)
  if (normalizedType === 'reaction') return Math.round(numericValue * 55)
  if (normalizedType === 'steps') return Math.round(numericValue / 250)
  if (normalizedType === 'pomodoro_bonus') return Math.round(numericValue)
  return 0
}

function buildGameRecordsFromEntries(entries) {
  const difficulties = ['easy', 'medium', 'hard']
  const sudoku = { easy: [], medium: [], hard: [] }

  difficulties.forEach((difficulty) => {
    sudoku[difficulty] = entries
      .map((entry) => {
        const bestMs = Number(entry.meta?.sudoku?.bestTimesMs?.[difficulty] || 0)
        if (!bestMs) return null
        return {
          username: entry.username,
          fullName: entry.fullName,
          bestMs,
        }
      })
      .filter(Boolean)
      .sort((left, right) => left.bestMs - right.bestMs)
      .slice(0, 5)
  })

  const reaction = entries
    .map((entry) => {
      const bestMs = Number(entry.meta?.brainArcade?.reactionBestMs || 0)
      if (!bestMs) return null
      return {
        username: entry.username,
        fullName: entry.fullName,
        bestMs,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.bestMs - right.bestMs)
    .slice(0, 5)

  return { sudoku, reaction }
}

function getAttemptKey(req, identifier) {
  return `${req.ip || 'unknown'}:${String(identifier || '').toLowerCase()}`
}

function getThrottleState(key) {
  const entry = loginAttempts.get(key)
  if (!entry) return null
  if (entry.lockUntil && entry.lockUntil > Date.now()) {
    return { locked: true, remainingMs: entry.lockUntil - Date.now() }
  }
  if (entry.firstAttemptAt && Date.now() - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key)
    return null
  }
  return { locked: false, entry }
}

function registerFailedAttempt(key) {
  const now = Date.now()
  const current = loginAttempts.get(key)
  if (!current || now - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now, lockUntil: 0 })
    return
  }

  current.count += 1
  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockUntil = now + LOCKOUT_MS
  }
  loginAttempts.set(key, current)
}

function clearFailedAttempts(key) {
  loginAttempts.delete(key)
}

async function connectDb() {
  if (isProduction && !process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required in production.')
    process.exit(1)
  }

  try {
    await mongoose.connect(MONGODB_URI)
    User = mongoose.model('User', userSchema)
    Log = mongoose.model('Log', logSchema)
    Meta = mongoose.model('Meta', metaSchema)
    Setting = mongoose.model('Setting', settingSchema)
    console.log('Connected to MongoDB')
    useFileStorage = false
  } catch (err) {
    if (isProduction) {
      console.error('MongoDB connection failed in production:', err.message)
      process.exit(1)
    }
    console.warn('MongoDB connection failed, falling back to file storage:', err.message)
    useFileStorage = true
    try {
      readData()
    } catch (fileErr) {
      console.error('Failed to initialize data file', fileErr)
    }
  }

  startWeeklyWellnessScheduler()
}

connectDb()

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    storage: useFileStorage ? 'file' : 'mongodb',
    mongoReadyState: mongoose.connection.readyState,
  })
})

app.get('/download/android', async (req, res) => {
  const targetUrl = APK_DOWNLOAD_URL || DEFAULT_APK_FALLBACK_URL
  if (!APK_DOWNLOAD_URL) {
    return res.redirect(302, DEFAULT_APK_FALLBACK_URL)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if ([200, 301, 302, 303, 307, 308].includes(response.status)) {
      return res.redirect(302, targetUrl)
    }
  } catch (error) {
    console.error('Android download URL check failed:', error?.message || error)
  }

  return res.redirect(302, DEFAULT_APK_FALLBACK_URL)
})

app.get('/api/auth/config', (req, res) => {
  const emailDeliveryEnabled = Boolean((SMTP_HOST && SMTP_FROM) || (RESEND_API_KEY && RESEND_FROM))
  res.json({
    google: {
      enabled: Boolean(GOOGLE_CLIENT_ID),
      clientId: GOOGLE_CLIENT_ID || null,
    },
    passwordResetEmail: {
      enabled: emailDeliveryEnabled,
    },
    emailVerification: {
      enabled: emailDeliveryEnabled,
    },
  })
})

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'missing auth' })
  const parts = auth.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'bad auth' })

  try {
    const payload = jwt.verify(parts[1], JWT_SECRET)
    req.user = payload.username
    next()
  } catch (error) {
    return res.status(401).json({ error: 'invalid token' })
  }
}

function findFileUser(data, identifier) {
  const normalized = String(identifier || '').trim().toLowerCase()
  if (!normalized) return null

  const byUsername = data.users[identifier]
  if (byUsername) return { key: identifier, user: byUsername }

  const match = Object.entries(data.users).find(([username, user]) => {
    const usernameLower = String(user.usernameLower || username).toLowerCase()
    const emailLower = String(user.emailLower || user.email || '').toLowerCase()
    return usernameLower === normalized || emailLower === normalized
  })

  if (!match) return null
  return { key: match[0], user: match[1] }
}

async function findDbUser(identifier) {
  const normalized = String(identifier || '').trim()
  const lowered = normalized.toLowerCase()
  return User.findOne({
    $or: [{ usernameLower: lowered }, { emailLower: lowered }, { username: normalized }],
  }).exec()
}

app.post('/api/admin/announce/android-release', async (req, res) => {
  const incomingKey = String(req.headers['x-admin-key'] || req.body?.adminKey || '').trim()
  if (!ADMIN_BROADCAST_KEY || incomingKey !== ADMIN_BROADCAST_KEY) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const provider = String(req.body?.provider || 'resend').trim().toLowerCase()
  const preferredProvider = provider === 'smtp' ? 'smtp' : provider === 'resend' ? 'resend' : 'auto'
  const dryRun = Boolean(req.body?.dryRun)
  const limitRaw = Number(req.body?.limit || 0)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null
  const onlyRaw = String(req.body?.only || '').trim().toLowerCase()
  const downloadUrl = DEFAULT_APK_DIRECT_URL
  const websiteUrl = WEBSITE_URL

  try {
    let recipients = []

    if (onlyRaw) {
      recipients = [{ email: onlyRaw, fullName: onlyRaw.split('@')[0] || 'there' }]
    } else if (useFileStorage) {
      const data = readData()
      recipients = Object.values(data.users || {})
        .map((user) => ({
          email: String(user.email || user.emailLower || '').trim().toLowerCase(),
          fullName: sanitizeFullName(user.fullName || user.username || ''),
        }))
        .filter((user) => Boolean(user.email))
    } else {
      const users = await User.find({ email: { $exists: true, $ne: '' } })
        .select({ email: 1, fullName: 1, username: 1 })
        .lean()
        .exec()
      recipients = users.map((user) => ({
        email: String(user.email || '').trim().toLowerCase(),
        fullName: sanitizeFullName(user.fullName || user.username || ''),
      }))
    }

    const deduped = []
    const seen = new Set()
    for (const recipient of recipients) {
      if (!recipient.email || seen.has(recipient.email)) continue
      seen.add(recipient.email)
      deduped.push(recipient)
    }
    const finalRecipients = limit ? deduped.slice(0, limit) : deduped

    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        provider: preferredProvider,
        totalRecipients: finalRecipients.length,
        recipients: finalRecipients.slice(0, 25).map((item) => item.email),
      })
    }

    const sent = []
    const failed = []
    for (const recipient of finalRecipients) {
      try {
        const result = await sendCommunityAnnouncementEmail({
          to: recipient.email,
          fullName: recipient.fullName || 'there',
          preferredProvider,
          downloadUrl,
          websiteUrl,
        })
        if (!result.delivered) {
          failed.push({ email: recipient.email, reason: `${result.provider || preferredProvider} delivery failed` })
          continue
        }
        sent.push({ email: recipient.email, provider: result.provider || preferredProvider })
      } catch (error) {
        failed.push({ email: recipient.email, reason: error?.message || 'send failed' })
      }
    }

    return res.json({
      ok: true,
      provider: preferredProvider,
      totalRecipients: finalRecipients.length,
      sent: sent.length,
      failed: failed.length,
      failures: failed.slice(0, 25),
    })
  } catch (error) {
    console.error('Announcement API failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/announce/weekly-wellness', async (req, res) => {
  const incomingKey = String(req.headers['x-admin-key'] || req.body?.adminKey || '').trim()
  if (!ADMIN_BROADCAST_KEY || incomingKey !== ADMIN_BROADCAST_KEY) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const provider = String(req.body?.provider || 'auto').trim().toLowerCase()
  const preferredProvider = provider === 'smtp' ? 'smtp' : provider === 'resend' ? 'resend' : 'auto'
  const dryRun = Boolean(req.body?.dryRun)
  const force = Boolean(req.body?.force)
  const limitRaw = Number(req.body?.limit || 0)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null
  const only = String(req.body?.only || '').trim().toLowerCase()

  try {
    const summary = await runWeeklyWellnessCampaign({
      preferredProvider,
      dryRun,
      force,
      limit,
      only,
    })
    return res.json(summary)
  } catch (error) {
    console.error('Weekly wellness API failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/register', async (req, res) => {
  const validation = validateRegistration(req.body || {})
  if (validation.error) return res.status(400).json({ error: validation.error })

  const { username, usernameLower, email, emailLower, fullName, password } = validation.data

  try {
    if (useFileStorage) {
      const data = readData()
      if (data.users[username]) return res.status(409).json({ error: 'username already exists' })
      const emailTaken = Object.values(data.users).some((user) => String(user.emailLower || '').toLowerCase() === emailLower)
      if (emailTaken) return res.status(409).json({ error: 'email already exists' })

      const created = Date.now()
      const verificationCode = createResetCode()
      data.users[username] = {
        username,
        usernameLower,
        email,
        emailLower,
        fullName,
        password: bcrypt.hashSync(password, 10),
        authProvider: 'local',
        emailVerified: false,
        emailVerificationCodeHash: hashResetCode(verificationCode),
        emailVerificationExpiresAt: created + EMAIL_VERIFICATION_WINDOW_MS,
        created,
        lastLoginAt: null,
        loginCount: 0,
      }
      writeData(data)

      const verifyUrl = buildEmailVerificationUrl(req, email, verificationCode)
      const delivery = await sendEmailVerificationEmail({
        to: email,
        fullName,
        code: verificationCode,
        verifyUrl,
      })

      return res.json({
        ok: true,
        requiresEmailVerification: true,
        identifier: email,
        message: delivery.delivered
          ? 'Account created. Enter the verification code we sent to your email.'
          : 'Account created. Email delivery is unavailable, but you can still verify with the code below in development.',
        previewCode: delivery.delivered || isProduction ? undefined : verificationCode,
      })
    }

    const existing = await User.findOne({
      $or: [{ usernameLower }, { emailLower }],
    }).exec()
    if (existing) {
      const conflictField = existing.emailLower === emailLower ? 'email already exists' : 'username already exists'
      return res.status(409).json({ error: conflictField })
    }

    const created = Date.now()
    const verificationCode = createResetCode()
    const user = new User({
      username,
      usernameLower,
      email,
      emailLower,
      fullName,
      password: bcrypt.hashSync(password, 10),
      authProvider: 'local',
      emailVerified: false,
      emailVerificationCodeHash: hashResetCode(verificationCode),
      emailVerificationExpiresAt: created + EMAIL_VERIFICATION_WINDOW_MS,
      created,
      lastLoginAt: null,
      loginCount: 0,
    })
    await user.save()

    const verifyUrl = buildEmailVerificationUrl(req, email, verificationCode)
    const delivery = await sendEmailVerificationEmail({
      to: email,
      fullName,
      code: verificationCode,
      verifyUrl,
    })

    return res.json({
      ok: true,
      requiresEmailVerification: true,
      identifier: email,
      message: delivery.delivered
        ? 'Account created. Enter the verification code we sent to your email.'
        : 'Account created. Email delivery is unavailable, but you can still verify with the code below in development.',
      previewCode: delivery.delivered || isProduction ? undefined : verificationCode,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/login', async (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  if (!identifier || !password) {
    return res.status(400).json({ error: 'email or username and password required' })
  }

  const attemptKey = getAttemptKey(req, identifier)
  const throttle = getThrottleState(attemptKey)
  if (throttle?.locked) {
    const retryAfterMinutes = Math.ceil(throttle.remainingMs / 60000)
    return res.status(429).json({ error: `too many attempts, try again in about ${retryAfterMinutes} minute(s)` })
  }

  try {
    if (useFileStorage) {
      const data = readData()
      const match = findFileUser(data, identifier)
      if (!match) {
        registerFailedAttempt(attemptKey)
        return res.status(401).json({ error: 'invalid credentials' })
      }
      if (!match.user.password && match.user.googleId) {
        return res.status(400).json({ error: 'use Google sign-in for this account or reset your password to add an email login' })
      }

      const ok = bcrypt.compareSync(password, match.user.password)
      if (!ok) {
        registerFailedAttempt(attemptKey)
        return res.status(401).json({ error: 'invalid credentials' })
      }
      if (!isEmailVerified(match.user)) {
        return res.status(403).json({
          error: 'verify your email before signing in',
          requiresEmailVerification: true,
          identifier: match.user.email || match.key,
        })
      }

      clearFailedAttempts(attemptKey)
      match.user.lastLoginAt = Date.now()
      match.user.loginCount = Number(match.user.loginCount || 0) + 1
      writeData(data)

      const token = genToken(match.key)
      return res.json({ username: match.key, token, account: buildAccount(match.user) })
    }

    const user = await findDbUser(identifier)
    if (!user) {
      registerFailedAttempt(attemptKey)
      return res.status(401).json({ error: 'invalid credentials' })
    }
    if (!user.password && user.googleId) {
      return res.status(400).json({ error: 'use Google sign-in for this account or reset your password to add an email login' })
    }

    const ok = bcrypt.compareSync(password, user.password)
    if (!ok) {
      registerFailedAttempt(attemptKey)
      return res.status(401).json({ error: 'invalid credentials' })
    }
    if (!isEmailVerified(user)) {
      return res.status(403).json({
        error: 'verify your email before signing in',
        requiresEmailVerification: true,
        identifier: user.email || user.username,
      })
    }

    clearFailedAttempts(attemptKey)
    user.lastLoginAt = Date.now()
    user.loginCount = Number(user.loginCount || 0) + 1
    await user.save()

    const token = genToken(user.username)
    return res.json({ username: user.username, token, account: buildAccount(user.toObject()) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/email/verify/resend', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim()
  if (!identifier) {
    return res.status(400).json({ error: 'email or username is required' })
  }

  try {
    if (useFileStorage) {
      const data = readData()
      const match = findFileUser(data, identifier)
      if (!match || !match.user.email) {
        return res.status(404).json({ error: 'account not found' })
      }
      if (isEmailVerified(match.user)) {
        return res.json({ ok: true, message: 'Email is already verified.' })
      }

      const code = createResetCode()
      match.user.emailVerificationCodeHash = hashResetCode(code)
      match.user.emailVerificationExpiresAt = Date.now() + EMAIL_VERIFICATION_WINDOW_MS
      writeData(data)

      const verifyUrl = buildEmailVerificationUrl(req, match.user.email || match.key, code)
      const delivery = await sendEmailVerificationEmail({
        to: match.user.email,
        fullName: match.user.fullName || match.key,
        code,
        verifyUrl,
      })

      return res.json({
        ok: true,
        message: delivery.delivered
          ? 'A new verification code was sent.'
          : 'Email delivery is unavailable, but you can still verify with the code below in development.',
        previewCode: delivery.delivered || isProduction ? undefined : code,
      })
    }

    const user = await findDbUser(identifier)
    if (!user || !user.email) {
      return res.status(404).json({ error: 'account not found' })
    }
    if (isEmailVerified(user)) {
      return res.json({ ok: true, message: 'Email is already verified.' })
    }

    const code = createResetCode()
    user.emailVerificationCodeHash = hashResetCode(code)
    user.emailVerificationExpiresAt = Date.now() + EMAIL_VERIFICATION_WINDOW_MS
    await user.save()

    const verifyUrl = buildEmailVerificationUrl(req, user.email || user.username, code)
    const delivery = await sendEmailVerificationEmail({
      to: user.email,
      fullName: user.fullName || user.username,
      code,
      verifyUrl,
    })

    return res.json({
      ok: true,
      message: delivery.delivered
        ? 'A new verification code was sent.'
        : 'Email delivery is unavailable, but you can still verify with the code below in development.',
      previewCode: delivery.delivered || isProduction ? undefined : code,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/email/verify', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim()
  const code = String(req.body?.code || '').trim()
  if (!identifier || !code) {
    return res.status(400).json({ error: 'identifier and verification code are required' })
  }

  try {
    if (useFileStorage) {
      const data = readData()
      const match = findFileUser(data, identifier)
      if (!match || !match.user.emailVerificationCodeHash) {
        return res.status(400).json({ error: 'invalid or expired verification code' })
      }

      const codeHash = hashResetCode(code)
      const expired = Number(match.user.emailVerificationExpiresAt || 0) < Date.now()
      if (expired || match.user.emailVerificationCodeHash !== codeHash) {
        return res.status(400).json({ error: 'invalid or expired verification code' })
      }

      match.user.emailVerified = true
      delete match.user.emailVerificationCodeHash
      delete match.user.emailVerificationExpiresAt
      match.user.lastLoginAt = Date.now()
      match.user.loginCount = Number(match.user.loginCount || 0) + 1
      writeData(data)

      const token = genToken(match.key)
      return res.json({
        ok: true,
        message: 'Email verified. You are now signed in.',
        username: match.key,
        token,
        account: buildAccount(match.user),
      })
    }

    const user = await findDbUser(identifier)
    if (!user || !user.emailVerificationCodeHash) {
      return res.status(400).json({ error: 'invalid or expired verification code' })
    }

    const codeHash = hashResetCode(code)
    const expired = Number(user.emailVerificationExpiresAt || 0) < Date.now()
    if (expired || user.emailVerificationCodeHash !== codeHash) {
      return res.status(400).json({ error: 'invalid or expired verification code' })
    }

    user.emailVerified = true
    user.emailVerificationCodeHash = undefined
    user.emailVerificationExpiresAt = undefined
    user.lastLoginAt = Date.now()
    user.loginCount = Number(user.loginCount || 0) + 1
    await user.save()

    const token = genToken(user.username)
    return res.json({
      ok: true,
      message: 'Email verified. You are now signed in.',
      username: user.username,
      token,
      account: buildAccount(user.toObject()),
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/password/forgot', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim()
  if (!identifier) {
    return res.status(400).json({ error: 'email or username is required' })
  }

  const successMessage = 'If that account exists, a password reset code has been prepared.'

  try {
    if (useFileStorage) {
      const data = readData()
      const match = findFileUser(data, identifier)
      if (!match || !match.user.email) {
        return res.json({ ok: true, message: successMessage })
      }

      const code = createResetCode()
      match.user.resetPasswordCodeHash = hashResetCode(code)
      match.user.resetPasswordExpiresAt = Date.now() + PASSWORD_RESET_WINDOW_MS
      writeData(data)

      const resetUrl = buildResetUrl(req, match.user.email || match.key, code)
      const recipientEmails = [match.user.email]
      if (identifier.includes('@')) recipientEmails.push(identifier)
      const delivery = await sendPasswordResetEmail({
        to: recipientEmails,
        fullName: match.user.fullName || match.key,
        code,
        resetUrl,
      })

      return res.json({
        ok: true,
        message: delivery.delivered
          ? 'Reset instructions were sent to the email on that account.'
          : successMessage,
        previewCode: delivery.delivered || isProduction ? undefined : code,
      })
    }

    const user = await findDbUser(identifier)
    if (!user || !user.email) {
      return res.json({ ok: true, message: successMessage })
    }

    const code = createResetCode()
    user.resetPasswordCodeHash = hashResetCode(code)
    user.resetPasswordExpiresAt = Date.now() + PASSWORD_RESET_WINDOW_MS
    await user.save()

    const resetUrl = buildResetUrl(req, user.email || user.username, code)
    const recipientEmails = [user.email]
    if (identifier.includes('@')) recipientEmails.push(identifier)
    const delivery = await sendPasswordResetEmail({
      to: recipientEmails,
      fullName: user.fullName || user.username,
      code,
      resetUrl,
    })

    return res.json({
      ok: true,
      message: delivery.delivered
        ? 'Reset instructions were sent to the email on that account.'
        : successMessage,
      previewCode: delivery.delivered || isProduction ? undefined : code,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/password/reset', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim()
  const code = String(req.body?.code || '').trim()
  const password = String(req.body?.password || '')
  const confirmPassword = String(req.body?.confirmPassword || '')

  if (!identifier || !code) {
    return res.status(400).json({ error: 'identifier and reset code are required' })
  }

  const passwordError = validatePassword(password, confirmPassword)
  if (passwordError) {
    return res.status(400).json({ error: passwordError })
  }

  try {
    if (useFileStorage) {
      const data = readData()
      const match = findFileUser(data, identifier)
      if (!match || !match.user.resetPasswordCodeHash) {
        return res.status(400).json({ error: 'invalid or expired reset code' })
      }

      const codeHash = hashResetCode(code)
      const expired = Number(match.user.resetPasswordExpiresAt || 0) < Date.now()
      if (expired || match.user.resetPasswordCodeHash !== codeHash) {
        return res.status(400).json({ error: 'invalid or expired reset code' })
      }

      match.user.password = bcrypt.hashSync(password, 10)
      match.user.authProvider = match.user.googleId ? 'google+local' : 'local'
      delete match.user.resetPasswordCodeHash
      delete match.user.resetPasswordExpiresAt
      writeData(data)
      return res.json({ ok: true, message: 'Password updated. You can sign in now.' })
    }

    const user = await findDbUser(identifier)
    if (!user || !user.resetPasswordCodeHash) {
      return res.status(400).json({ error: 'invalid or expired reset code' })
    }

    const codeHash = hashResetCode(code)
    const expired = Number(user.resetPasswordExpiresAt || 0) < Date.now()
    if (expired || user.resetPasswordCodeHash !== codeHash) {
      return res.status(400).json({ error: 'invalid or expired reset code' })
    }

    user.password = bcrypt.hashSync(password, 10)
    user.authProvider = user.googleId ? 'google+local' : 'local'
    user.resetPasswordCodeHash = undefined
    user.resetPasswordExpiresAt = undefined
    await user.save()

    return res.json({ ok: true, message: 'Password updated. You can sign in now.' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/auth/google', async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ error: 'Google sign-in is not configured' })
  }

  const credential = String(req.body?.credential || '').trim()
  if (!credential) {
    return res.status(400).json({ error: 'missing Google credential' })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const email = normalizeEmail(payload?.email)
    const emailVerified = Boolean(payload?.email_verified)
    const googleId = String(payload?.sub || '').trim()
    const fullName = sanitizeFullName(payload?.name || payload?.given_name || email.split('@')[0])

    if (!email || !emailVerified || !googleId) {
      return res.status(400).json({ error: 'Google account could not be verified' })
    }

    if (useFileStorage) {
      const data = readData()
      const existingEntry = Object.entries(data.users).find(([username, user]) => {
        const matchesEmail = String(user.emailLower || user.email || '').toLowerCase() === email
        const matchesGoogle = String(user.googleId || '') === googleId
        return matchesEmail || matchesGoogle
      })

      let username
      let user
      if (existingEntry) {
        username = existingEntry[0]
        user = existingEntry[1]
      } else {
        username = generateUniqueFileUsername(data, email.split('@')[0] || fullName)
        user = {
          username,
          usernameLower: username.toLowerCase(),
          email,
          emailLower: email,
          fullName,
          password: '',
          googleId,
          authProvider: 'google',
          emailVerified: true,
          created: Date.now(),
          lastLoginAt: Date.now(),
          loginCount: 0,
        }
        data.users[username] = user
      }

      user.fullName = user.fullName || fullName
      user.email = email
      user.emailLower = email
      user.googleId = googleId
      user.authProvider = user.password ? 'google+local' : 'google'
      user.emailVerified = true
      user.lastLoginAt = Date.now()
      user.loginCount = Number(user.loginCount || 0) + 1
      writeData(data)

      const token = genToken(username)
      return res.json({ username, token, account: buildAccount(user) })
    }

    let user = await User.findOne({
      $or: [{ googleId }, { emailLower: email }],
    }).exec()

    if (!user) {
      const username = await generateUniqueDbUsername(email.split('@')[0] || fullName)
      user = new User({
        username,
        usernameLower: username.toLowerCase(),
        email,
        emailLower: email,
        fullName,
        password: '',
        googleId,
        authProvider: 'google',
        emailVerified: true,
        created: Date.now(),
        lastLoginAt: Date.now(),
        loginCount: 1,
      })
      await user.save()
      const token = genToken(user.username)
      return res.json({ username: user.username, token, account: buildAccount(user.toObject()) })
    }

    user.fullName = user.fullName || fullName
    user.email = email
    user.emailLower = email
    user.googleId = googleId
    user.authProvider = user.password ? 'google+local' : 'google'
    user.emailVerified = true
    user.lastLoginAt = Date.now()
    user.loginCount = Number(user.loginCount || 0) + 1
    await user.save()

    const token = genToken(user.username)
    return res.json({ username: user.username, token, account: buildAccount(user.toObject()) })
  } catch (error) {
    console.error(error)
    return res.status(401).json({ error: 'Google sign-in failed' })
  }
})

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    if (useFileStorage) {
      const data = readData()
      const user = data.users[req.user]
      if (!user) return res.status(404).json({ error: 'user not found' })
      return res.json({ username: req.user, account: buildAccount(user) })
    }

    const user = await User.findOne({ username: req.user }).exec()
    if (!user) return res.status(404).json({ error: 'user not found' })
    return res.json({ username: user.username, account: buildAccount(user.toObject()) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    if (useFileStorage) {
      const data = readData()
      const arr = []
      const userLogs = data.logs[req.user] || {}
      Object.entries(userLogs).forEach(([date, types]) => {
        if (typeof types === 'number') {
          arr.push({ date, type: 'legacy', value: types })
          return
        }
        Object.entries(types).forEach(([type, val]) => {
          arr.push({ date, type, value: val })
        })
      })
      return res.json({ logs: arr })
    }

    const docs = await Log.find({ user: req.user }).exec()
    const arr = docs.map((doc) => ({ date: doc.date, type: doc.type, value: doc.value }))
    return res.json({ logs: arr })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/logs', authMiddleware, async (req, res) => {
  const { date, type, value } = req.body || {}
  if (!date || !type) return res.status(400).json({ error: 'date and type required' })

  try {
    if (useFileStorage) {
      const data = readData()
      data.logs[req.user] = data.logs[req.user] || {}
      data.logs[req.user][date] = data.logs[req.user][date] || {}
      data.logs[req.user][date][type] = Number(value) || 0
      writeData(data)
      return res.json({ ok: true })
    }

    await Log.findOneAndUpdate({ user: req.user, date, type }, { value: Number(value) || 0 }, { upsert: true }).exec()
    return res.json({ ok: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/meta', authMiddleware, async (req, res) => {
  try {
    if (useFileStorage) {
      const data = readData()
      return res.json({ meta: data.meta[req.user] || {} })
    }

    const meta = await Meta.findOne({ user: req.user }).exec()
    return res.json({ meta: meta ? meta.meta : {} })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  try {
    if (useFileStorage) {
      const data = readData()
      const leaderboard = Object.entries(data.users || {})
        .map(([username, user]) => {
          const userLogs = data.logs[username] || {}
          const points = Object.entries(userLogs).reduce((sum, [, types]) => {
            if (typeof types === 'number') return sum
            return sum + Object.entries(types).reduce((logSum, [type, value]) => logSum + calculateLogPoints(type, value), 0)
          }, 0)

          return {
            username,
            fullName: user.fullName || username,
            points,
          }
        })
        .sort((left, right) => right.points - left.points)
        .slice(0, 5)

      return res.json({ leaderboard })
    }

    const [users, logs] = await Promise.all([User.find({}).exec(), Log.find({}).exec()])
    const pointsByUser = logs.reduce((acc, entry) => {
      acc[entry.user] = (acc[entry.user] || 0) + calculateLogPoints(entry.type, entry.value)
      return acc
    }, {})

    const leaderboard = users
      .map((user) => ({
        username: user.username,
        fullName: user.fullName || user.username,
        points: Number(pointsByUser[user.username] || 0),
      }))
      .sort((left, right) => right.points - left.points)
      .slice(0, 5)

    return res.json({ leaderboard })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/leaderboard/game-records', authMiddleware, async (req, res) => {
  try {
    if (useFileStorage) {
      const data = readData()
      const entries = Object.entries(data.users || {}).map(([username, user]) => ({
        username,
        fullName: user.fullName || username,
        meta: data.meta?.[username] || {},
      }))

      return res.json(buildGameRecordsFromEntries(entries))
    }

    const [users, metas] = await Promise.all([User.find({}).exec(), Meta.find({}).exec()])
    const metaByUser = metas.reduce((acc, entry) => {
      acc[entry.user] = entry.meta || {}
      return acc
    }, {})

    const entries = users.map((user) => ({
      username: user.username,
      fullName: user.fullName || user.username,
      meta: metaByUser[user.username] || {},
    }))

    return res.json(buildGameRecordsFromEntries(entries))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/leaderboard/trends', authMiddleware, async (req, res) => {
  try {
    const dateKeys = Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (13 - index))
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    })

    if (useFileStorage) {
      return res.json({ trends: [], dateKeys })
    }

    const [users, logs] = await Promise.all([
      User.find({}).exec(),
      Log.find({ date: { $in: dateKeys } }).exec(),
    ])

    const allLogs = await Log.find({}).exec()
    const allTimePoints = allLogs.reduce((acc, entry) => {
      acc[entry.user] = (acc[entry.user] || 0) + calculateLogPoints(entry.type, entry.value)
      return acc
    }, {})

    const top5Users = users
      .map((user) => ({ username: user.username, fullName: user.fullName || user.username, points: Number(allTimePoints[user.username] || 0) }))
      .sort((left, right) => right.points - left.points)
      .slice(0, 5)

    const trends = top5Users.map((user) => {
      const userLogs = logs.filter((entry) => entry.user === user.username)

      const dailyScores = dateKeys.map((dateKey) => {
        const dayLogs = userLogs.filter((entry) => entry.date === dateKey)
        const totals = dayLogs.reduce((acc, entry) => {
          const normalizedType = String(entry.type || '').startsWith('sudoku') ? 'sudoku' : entry.type
          acc[normalizedType] = (acc[normalizedType] || 0) + Number(entry.value || 0)
          return acc
        }, { pomodoro: 0, meditation: 0, sudoku: 0, memory: 0, reaction: 0 })

        const score =
          Math.min(totals.pomodoro, 25) +
          Math.min(totals.meditation, 5) * 4 +
          Math.min(totals.sudoku, 1) * 15 +
          Math.min((totals.memory || 0) + (totals.reaction || 0), 1) * 10

        return Math.round(Math.min(100, score))
      })

      return {
        username: user.username,
        fullName: user.fullName,
        points: user.points,
        dailyScores,
      }
    })

    return res.json({ trends, dateKeys })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/meta', authMiddleware, async (req, res) => {
  const { meta } = req.body || {}
  try {
    if (useFileStorage) {
      const data = readData()
      data.meta[req.user] = { ...(data.meta[req.user] || {}), ...(meta || {}) }
      writeData(data)
      return res.json({ ok: true })
    }

    const existing = await Meta.findOne({ user: req.user }).exec()
    const mergedMeta = { ...(existing ? existing.meta : {}), ...(meta || {}) }
    await Meta.findOneAndUpdate({ user: req.user }, { meta: mergedMeta }, { upsert: true }).exec()
    return res.json({ ok: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'server error' })
  }
})

if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(buildDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'))
  })
}

const DEFAULT_PORT = Number(process.env.PORT || 4100)

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('Zenflow server running on', port)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && !process.env.PORT && !isProduction) {
      const nextPort = port + 1
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`)
      startServer(nextPort)
      return
    }

    console.error('Failed to start Zenflow server:', error.message)
    process.exit(1)
  })
}

startServer(DEFAULT_PORT)
