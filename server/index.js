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
const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim()
const GEMINI_COACH_MODEL = String(process.env.GEMINI_COACH_MODEL || 'gemini-2.0-flash').trim() || 'gemini-2.0-flash'
const DEFAULT_APK_DIRECT_URL = 'https://raw.githubusercontent.com/sumit2409/Zenflow_app/main/downloads/zenflow-app.apk'
const DEFAULT_APK_FALLBACK_URL = 'https://github.com/sumit2409/Zenflow_app/releases'
const APK_DOWNLOAD_URL = String(process.env.APK_DOWNLOAD_URL || '').trim()
const DEFAULT_WEBSITE_URL = 'https://zenflow.bio'
const WEBSITE_URL = (PUBLIC_APP_URL || DEFAULT_WEBSITE_URL).trim().replace(/\/+$/, '')
const CANONICAL_SITE_URL = new URL(WEBSITE_URL)
const CANONICAL_ORIGIN = CANONICAL_SITE_URL.origin
const CANONICAL_HOSTNAME = CANONICAL_SITE_URL.hostname.toLowerCase()
const WEEKLY_WELLNESS_EMAILS_ENABLED = String(process.env.WEEKLY_WELLNESS_EMAILS_ENABLED || '').trim() === 'true'
const WEEKLY_WELLNESS_EMAILS_DAY_UTC = clampIntegerEnv(process.env.WEEKLY_WELLNESS_EMAILS_DAY_UTC, 1, 0, 6)
const WEEKLY_WELLNESS_EMAILS_HOUR_UTC = clampIntegerEnv(process.env.WEEKLY_WELLNESS_EMAILS_HOUR_UTC, 9, 0, 23)
const WEEKLY_WELLNESS_EMAILS_MINUTE_UTC = clampIntegerEnv(process.env.WEEKLY_WELLNESS_EMAILS_MINUTE_UTC, 0, 0, 59)
const WEEKLY_WELLNESS_EMAILS_INTERVAL_MS = 15 * 60 * 1000
const WEEKLY_WELLNESS_LAST_SENT_SETTING_KEY = 'campaign:weekly-wellness:last-sent-week'
const COACH_HISTORY_LIMIT = 10
const COACH_MESSAGE_CHAR_LIMIT = 1600
const COACH_RESPONSE_TIMEOUT_MS = 20000
const ADMIN_EMAIL = 'contactsumit2409@gmail.com'
const EMAIL_QUEUE_BATCH_SIZE = clampIntegerEnv(process.env.EMAIL_QUEUE_BATCH_SIZE, 8, 1, 100)
const EMAIL_QUEUE_INTERVAL_MS = clampIntegerEnv(process.env.EMAIL_QUEUE_INTERVAL_MS, 60000, 5000, 600000)
const EMAIL_QUEUE_MAX_ATTEMPTS = clampIntegerEnv(process.env.EMAIL_QUEUE_MAX_ATTEMPTS, 4, 1, 10)
const CONTACT_MESSAGE_CHAR_LIMIT = 5000
const ADMIN_LIST_PAGE_SIZE = 20
const ADMIN_LIST_PAGE_SIZE_MAX = 100

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
let emailQueueInterval = null
let emailQueueRunning = false
let cachedIndexHtml = null

function clampIntegerEnv(rawValue, fallback, min, max) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

const DEFAULT_PUBLIC_META = {
  title: 'Zenflow | Focus, Tasks, and Daily Rhythm',
  description: 'Zenflow combines focus timers, planner tools, daily notes, calm breaks, and public focus articles in one clean flow.',
}

const PUBLIC_PAGE_META = {
  '/': DEFAULT_PUBLIC_META,
  '/blog': {
    title: 'Blog — Zenflow',
    description: 'Read Zenflow guides on phone habits, dopamine detox, deep work, and focus tracking before you create an account.',
  },
  '/beat-phone-addiction': {
    title: 'How to Beat Phone Addiction Without Quitting Technology — Zenflow',
    description: 'A realistic guide to reducing compulsive phone use, rebuilding attention, and making your device serve your goals instead of hijacking them.',
  },
  '/dopamine-detox-guide': {
    title: 'A Realistic Dopamine Detox Guide That Actually Works — Zenflow',
    description: 'A grounded dopamine detox guide focused on reducing overstimulation, restoring attention, and making normal work feel engaging again.',
  },
  '/deep-work-system': {
    title: 'A Deep Work System for People Who Get Distracted Easily — Zenflow',
    description: 'A practical deep work framework for protecting attention, structuring focus blocks, and producing high-value work consistently.',
  },
  '/focus-tracking': {
    title: 'Focus Tracking: How to Measure Attention and Improve It — Zenflow',
    description: 'A practical guide to focus tracking, including what metrics matter, how to log sessions, and how to use data to improve concentration.',
  },
  '/about': {
    title: 'About Us — Zenflow',
    description: 'Mission, vision, team introduction, and Zenflow community focus on better work habits.',
  },
  '/faq': {
    title: 'FAQ — Zenflow',
    description: 'Common questions for Zenflow users covering login, planner, focus timer, and app setup.',
  },
  '/contact': {
    title: 'Contact — Zenflow',
    description: 'Contact Zenflow support, share feedback, and get help with access or account issues.',
  },
  '/privacy': {
    title: 'Privacy Policy — Zenflow',
    description: 'How Zenflow collects, stores, and protects user data and what rights are available to users.',
  },
  '/terms': {
    title: 'Terms of Service — Zenflow',
    description: 'Acceptable use, account responsibilities, and service rules for using Zenflow.',
  },
  '/cookie': {
    title: 'Cookie Policy — Zenflow',
    description: 'What cookies and local storage are used on Zenflow and how to manage them.',
  },
}

function normalizePublicSeoPath(rawPath) {
  const pathname = String(rawPath || '').trim()
  if (!pathname || pathname === '/') return '/'
  const lowered = pathname.toLowerCase().replace(/\/+$/, '')
  return lowered.startsWith('/') ? lowered : `/${lowered}`
}

function getPublicPageSeo(pathname) {
  const normalizedPath = normalizePublicSeoPath(pathname)
  const meta = PUBLIC_PAGE_META[normalizedPath]
  if (!meta) return null
  return {
    path: normalizedPath,
    title: meta.title,
    description: meta.description,
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function replaceMetaTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html
}

function injectIndexMeta(html, { title, description, canonicalUrl, robots }) {
  let nextHtml = html
  nextHtml = nextHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${escapeHtml(robots)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  )
  nextHtml = replaceMetaTag(
    nextHtml,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  )
  nextHtml = nextHtml.replace(/"url":\s*"[^"]*"/i, `"url": ${JSON.stringify(canonicalUrl)}`)
  return nextHtml
}

function getIndexHtml(buildDir) {
  if (!cachedIndexHtml) {
    cachedIndexHtml = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8')
  }
  return cachedIndexHtml
}

function getRequestProtocol(req) {
  return String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim().toLowerCase()
}

function getRequestHostname(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || req.hostname || '')
    .split(',')[0]
    .trim()
    .replace(/:\d+$/, '')
    .toLowerCase()
}

function buildCanonicalRequestUrl(req, pathname) {
  const url = new URL(req.originalUrl || pathname || '/', CANONICAL_ORIGIN)
  url.pathname = pathname
  return url.toString()
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
const contactMessageSchema = new mongoose.Schema({
  _id: String,
  fullName: String,
  email: String,
  message: String,
  source: { type: String, default: 'contact-form' },
  status: { type: String, default: 'new' },
  createdAt: Number,
  updatedAt: Number,
  repliedAt: Number,
})
const emailTemplateSchema = new mongoose.Schema({
  _id: String,
  name: String,
  kind: { type: String, default: 'general' },
  subject: String,
  body: String,
  createdBy: String,
  updatedBy: String,
  createdAt: Number,
  updatedAt: Number,
})
const emailCampaignSchema = new mongoose.Schema({
  _id: String,
  name: String,
  kind: { type: String, default: 'one_off' },
  targetMode: { type: String, default: 'selected' },
  selectedRecipients: [String],
  subject: String,
  body: String,
  templateId: String,
  status: { type: String, default: 'draft' },
  preferredProvider: { type: String, default: 'auto' },
  scheduleEnabled: { type: Boolean, default: false },
  scheduleHourUtc: { type: Number, default: 9 },
  scheduleMinuteUtc: { type: Number, default: 0 },
  lastScheduledDateKey: String,
  createdBy: String,
  updatedBy: String,
  createdAt: Number,
  updatedAt: Number,
})
const emailCampaignRunSchema = new mongoose.Schema({
  _id: String,
  campaignId: String,
  campaignName: String,
  campaignKind: String,
  targetMode: String,
  recipientCount: Number,
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  status: { type: String, default: 'queued' },
  subject: String,
  body: String,
  createdBy: String,
  startedAt: Number,
  completedAt: Number,
  createdAt: Number,
  updatedAt: Number,
})
const emailJobSchema = new mongoose.Schema({
  _id: String,
  campaignId: String,
  runId: String,
  username: String,
  toEmail: String,
  toName: String,
  subject: String,
  bodyText: String,
  bodyHtml: String,
  preferredProvider: { type: String, default: 'auto' },
  status: { type: String, default: 'pending' },
  attemptCount: { type: Number, default: 0 },
  nextAttemptAt: Number,
  lastError: String,
  sentAt: Number,
  createdAt: Number,
  updatedAt: Number,
})
const auditLogSchema = new mongoose.Schema({
  _id: String,
  actorUsername: String,
  actorEmail: String,
  action: String,
  targetType: String,
  targetId: String,
  summary: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: Number,
})

let User
let Log
let Meta
let Setting
let ContactMessage
let EmailTemplate
let EmailCampaign
let EmailCampaignRun
let EmailJob
let AuditLog

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
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, logs: {}, meta: {}, system: {}, admin: {} }, null, 2), 'utf8')
  }
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  parsed.users = parsed.users || {}
  parsed.logs = parsed.logs || {}
  parsed.meta = parsed.meta || {}
  parsed.system = parsed.system || {}
  parsed.admin = parsed.admin || {}
  parsed.admin.contactMessages = Array.isArray(parsed.admin.contactMessages) ? parsed.admin.contactMessages : []
  parsed.admin.emailTemplates = Array.isArray(parsed.admin.emailTemplates) ? parsed.admin.emailTemplates : []
  parsed.admin.emailCampaigns = Array.isArray(parsed.admin.emailCampaigns) ? parsed.admin.emailCampaigns : []
  parsed.admin.emailCampaignRuns = Array.isArray(parsed.admin.emailCampaignRuns) ? parsed.admin.emailCampaignRuns : []
  parsed.admin.emailJobs = Array.isArray(parsed.admin.emailJobs) ? parsed.admin.emailJobs : []
  parsed.admin.auditLogs = Array.isArray(parsed.admin.auditLogs) ? parsed.admin.auditLogs : []
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
    isAdmin: isAdminUser(user),
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

function isAdminEmail(email) {
  return normalizeEmail(email) === ADMIN_EMAIL
}

function isAdminUser(user) {
  return Boolean(user) && isAdminEmail(user?.email || user?.emailLower || '') && isEmailVerified(user)
}

function createRecordId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`
}

function sanitizeSingleLine(value, maxLength = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function sanitizeMultiline(value, maxLength = 20000) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength)
}

function clampPage(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function clampPageSize(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return ADMIN_LIST_PAGE_SIZE
  return Math.min(ADMIN_LIST_PAGE_SIZE_MAX, Math.floor(parsed))
}

function normalizeSelectedRecipients(values) {
  const raw = Array.isArray(values) ? values : []
  return Array.from(
    new Set(
      raw
        .map((value) => sanitizeSingleLine(value, 120).toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 5000)
}

function ensureAdminStore(data) {
  data.admin = data.admin || {}
  data.admin.contactMessages = Array.isArray(data.admin.contactMessages) ? data.admin.contactMessages : []
  data.admin.emailTemplates = Array.isArray(data.admin.emailTemplates) ? data.admin.emailTemplates : []
  data.admin.emailCampaigns = Array.isArray(data.admin.emailCampaigns) ? data.admin.emailCampaigns : []
  data.admin.emailCampaignRuns = Array.isArray(data.admin.emailCampaignRuns) ? data.admin.emailCampaignRuns : []
  data.admin.emailJobs = Array.isArray(data.admin.emailJobs) ? data.admin.emailJobs : []
  data.admin.auditLogs = Array.isArray(data.admin.auditLogs) ? data.admin.auditLogs : []
  return data.admin
}

function formatEmailDateKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function formatPlainTextAsHtml(text) {
  const safe = escapeHtml(text)
  const paragraphs = safe.split(/\n{2,}/).filter(Boolean)
  return paragraphs.map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`).join('')
}

function buildTemplateVariables(user) {
  const signupValue = user?.created ? new Date(user.created).toLocaleDateString() : 'Not available'
  return {
    userName: sanitizeSingleLine(user?.fullName || user?.username || 'there', 120) || 'there',
    username: sanitizeSingleLine(user?.username || '', 120),
    email: normalizeEmail(user?.email || user?.emailLower || ''),
    signupDate: signupValue,
  }
}

function renderTemplateString(template, variables) {
  return String(template || '').replace(/\{\{\s*(userName|username|email|signupDate)\s*\}\}/g, (_, key) => variables[key] || '')
}

function buildRenderedEmailContent({ subject, body, user }) {
  const variables = buildTemplateVariables(user)
  const renderedSubject = renderTemplateString(subject, variables)
  const renderedBody = renderTemplateString(body, variables)
  return {
    subject: renderedSubject,
    text: renderedBody,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2f241e">
        ${formatPlainTextAsHtml(renderedBody)}
      </div>
    `,
  }
}

function summarizeAdminUser(user, meta, logs) {
  const totalPoints = logs.reduce((sum, entry) => sum + calculateLogPoints(entry.type, entry.value), 0)
  const last7Summary = summarizeCoachLogs(logs, buildRecentCoachDateKeys(7))
  const lastActivity = logs
    .map((entry) => entry.date)
    .sort((left, right) => right.localeCompare(left))[0] || null

  return {
    username: user.username,
    fullName: user.fullName || user.username,
    email: user.email || '',
    created: user.created || null,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: Number(user.loginCount || 0),
    emailVerified: isEmailVerified(user),
    authProvider: user.authProvider || (user.googleId ? 'google' : 'local'),
    isAdmin: isAdminUser(user),
    totalPoints,
    recentActiveDays: last7Summary.activeDays,
    recentFocusMinutes: last7Summary.totals.pomodoro,
    lastActivityDate: lastActivity,
    noteDates: Object.keys(meta?.journals || {}).length,
    todoDates: Object.keys(meta?.todosByDate || {}).length,
  }
}

async function loadAllUsersWithData() {
  if (useFileStorage) {
    const data = readData()
    return Object.entries(data.users || {}).map(([username, user]) => {
      const userLogs = []
      const logTree = data.logs?.[username] || {}

      Object.entries(logTree).forEach(([date, types]) => {
        if (typeof types === 'number') {
          userLogs.push({ date, type: 'legacy', value: types })
          return
        }

        Object.entries(types || {}).forEach(([type, value]) => {
          userLogs.push({ date, type, value: Number(value || 0) })
        })
      })

      return {
        user: { ...user, username },
        meta: data.meta?.[username] || {},
        logs: userLogs,
      }
    })
  }

  const [users, metas, logs] = await Promise.all([
    User.find({}).lean().exec(),
    Meta.find({}).lean().exec(),
    Log.find({}).lean().exec(),
  ])

  const metaByUser = metas.reduce((acc, entry) => {
    acc[entry.user] = entry.meta || {}
    return acc
  }, {})
  const logsByUser = logs.reduce((acc, entry) => {
    acc[entry.user] = acc[entry.user] || []
    acc[entry.user].push({
      date: entry.date,
      type: entry.type,
      value: Number(entry.value || 0),
    })
    return acc
  }, {})

  return users.map((user) => ({
    user,
    meta: metaByUser[user.username] || {},
    logs: logsByUser[user.username] || [],
  }))
}

async function findCurrentUserRecord(username) {
  if (useFileStorage) {
    const data = readData()
    return data.users?.[username] ? { ...data.users[username], username } : null
  }

  return User.findOne({ username }).lean().exec()
}

async function recordAuditLog({ actorUser, action, targetType = '', targetId = '', summary = '', metadata = {} }) {
  const entry = {
    id: createRecordId('audit'),
    actorUsername: actorUser?.username || '',
    actorEmail: normalizeEmail(actorUser?.email || actorUser?.emailLower || ''),
    action: sanitizeSingleLine(action, 120),
    targetType: sanitizeSingleLine(targetType, 80),
    targetId: sanitizeSingleLine(targetId, 120),
    summary: sanitizeSingleLine(summary, 240),
    metadata,
    createdAt: Date.now(),
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    admin.auditLogs.unshift(entry)
    admin.auditLogs = admin.auditLogs.slice(0, 500)
    writeData(data)
    return entry
  }

  const doc = new AuditLog({
    _id: entry.id,
    actorUsername: entry.actorUsername,
    actorEmail: entry.actorEmail,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    summary: entry.summary,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
  })
  await doc.save()
  return doc.toObject()
}

async function maybeRecordAdminAuthEvent(user, action = 'admin.login') {
  if (!isAdminUser(user)) return

  try {
    await recordAuditLog({
      actorUser: user,
      action,
      targetType: 'admin',
      targetId: user.username,
      summary: `${user.username} completed ${action}`,
    })
  } catch (error) {
    console.error('Admin auth audit failed:', error)
  }
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

function coachDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildRecentCoachDateKeys(days) {
  const keys = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (let index = 0; index < days; index += 1) {
    const next = new Date(cursor)
    next.setDate(cursor.getDate() - index)
    keys.push(coachDateKey(next))
  }

  return keys
}

function normalizeCoachLogType(type) {
  const normalized = String(type || '').trim()
  return normalized.startsWith('sudoku') ? 'sudoku' : normalized
}

function summarizeCoachLogs(logs, allowedDates = null) {
  const allowed = allowedDates ? new Set(allowedDates) : null
  const totals = {
    pomodoro: 0,
    meditation: 0,
    sudoku: 0,
    memory: 0,
    reaction: 0,
    steps: 0,
    pomodoro_bonus: 0,
  }
  const activeDays = new Set()

  logs.forEach((entry) => {
    if (allowed && !allowed.has(entry.date)) return

    const type = normalizeCoachLogType(entry.type)
    const value = Number(entry.value || 0)
    totals[type] = (totals[type] || 0) + value
    if (value > 0) {
      activeDays.add(entry.date)
    }
  })

  return {
    totals,
    activeDays: activeDays.size,
  }
}

function calculateCoachStreak(logs) {
  const activeDays = new Set(
    logs
      .filter((entry) => Number(entry.value || 0) > 0)
      .map((entry) => entry.date)
  )

  if (activeDays.size === 0) return 0

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (;;) {
    const key = coachDateKey(cursor)
    if (!activeDays.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function calculateCoachLevel(totalPoints) {
  const pointsPerLevel = 180
  return {
    level: Math.max(1, Math.floor(totalPoints / pointsPerLevel) + 1),
    nextLevelIn: pointsPerLevel - (totalPoints % pointsPerLevel),
  }
}

function collectRecentCoachNotes(journals, limit = 3) {
  if (!journals || typeof journals !== 'object') return []

  return Object.entries(journals)
    .flatMap(([dateKey, notes]) => {
      if (Array.isArray(notes)) {
        return notes
          .map((note) => ({
            dateKey,
            createdAt: Number(note?.createdAt || 0),
            text: String(note?.text || '').trim(),
          }))
          .filter((note) => note.text)
      }

      const legacyText = String(notes || '').trim()
      return legacyText
        ? [{ dateKey, createdAt: 0, text: legacyText }]
        : []
    })
    .sort((left, right) => {
      if (right.dateKey !== left.dateKey) return right.dateKey.localeCompare(left.dateKey)
      return Number(right.createdAt || 0) - Number(left.createdAt || 0)
    })
    .slice(0, limit)
    .map((note) => ({
      dateKey: note.dateKey,
      text: note.text.slice(0, 220),
    }))
}

function collectCoachTodos(meta, dateKey) {
  const todos = Array.isArray(meta?.todosByDate?.[dateKey]) ? meta.todosByDate[dateKey] : []
  return todos.slice(0, 6).map((todo) => ({
    text: String(todo?.text || '').trim().slice(0, 140),
    done: Boolean(todo?.done),
  })).filter((todo) => todo.text)
}

function buildCoachPerformanceSummary({ username, fullName, logs, meta }) {
  const today = coachDateKey()
  const last7Dates = buildRecentCoachDateKeys(7)
  const last28Dates = buildRecentCoachDateKeys(28)
  const todaySummary = summarizeCoachLogs(logs, [today])
  const last7Summary = summarizeCoachLogs(logs, last7Dates)
  const last28Summary = summarizeCoachLogs(logs, last28Dates)
  const totalPoints = logs.reduce((sum, entry) => sum + calculateLogPoints(entry.type, entry.value), 0)
  const level = calculateCoachLevel(totalPoints)

  return {
    username,
    fullName: sanitizeFullName(fullName || username),
    today,
    totalPoints,
    level,
    currentStreak: calculateCoachStreak(logs),
    todaySummary,
    last7Summary,
    last28Summary,
    intention: String(meta?.intention || '').trim().slice(0, 220),
    recentNotes: collectRecentCoachNotes(meta?.journals, 3),
    todaysTodos: collectCoachTodos(meta, today),
    plannerCustomCount: Array.isArray(meta?.planner?.customItems) ? meta.planner.customItems.length : 0,
    bestTimesMs: {
      easy: Number(meta?.sudoku?.bestTimesMs?.easy || 0) || null,
      medium: Number(meta?.sudoku?.bestTimesMs?.medium || 0) || null,
      hard: Number(meta?.sudoku?.bestTimesMs?.hard || 0) || null,
      reaction: Number(meta?.brainArcade?.reactionBestMs || 0) || null,
    },
  }
}

function formatCoachDuration(ms) {
  const numericMs = Number(ms || 0)
  if (!numericMs) return 'not recorded'

  const totalSeconds = Math.max(1, Math.round(numericMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (!minutes) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

const COACH_RESOURCES = [
  {
    kind: 'dashboard',
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Review your current stats, streak, and note cards in one place.',
    keywords: ['progress', 'performance', 'week', 'stats', 'overview'],
  },
  {
    kind: 'tool',
    id: 'pomodoro',
    label: 'Focus Timer',
    description: 'Run a focused work block and make your progress visible.',
    keywords: ['focus', 'deep work', 'study', 'work', 'attention', 'productivity', 'distracted'],
  },
  {
    kind: 'tool',
    id: 'meditation',
    label: 'Meditation',
    description: 'Use a short breathing reset when your head feels noisy.',
    keywords: ['stress', 'anxious', 'calm', 'breathe', 'overwhelmed', 'reset'],
  },
  {
    kind: 'tool',
    id: 'planner',
    label: 'Planner',
    description: 'Turn advice into a simple schedule with reminders and completion tracking.',
    keywords: ['plan', 'today', 'schedule', 'task', 'todo', 'routine'],
  },
  {
    kind: 'tool',
    id: 'breakroom',
    label: 'Break Room',
    description: 'Take a deliberate reset instead of drifting into low-value scrolling.',
    keywords: ['break', 'rest', 'tired', 'burnout'],
  },
  {
    kind: 'tool',
    id: 'sudoku',
    label: 'Sudoku',
    description: 'Use a short puzzle when you want a structured mental reset.',
    keywords: ['sudoku', 'puzzle', 'logic'],
  },
  {
    kind: 'tool',
    id: 'arcade',
    label: 'Games',
    description: 'Use the reaction and memory drills for a quick cognitive reset.',
    keywords: ['reaction', 'memory', 'brain', 'games', 'slow'],
  },
  {
    kind: 'account',
    id: 'profile',
    label: 'Account',
    description: 'Update your notes, profile details, and saved routines.',
    keywords: ['note', 'journal', 'profile', 'account'],
  },
  {
    kind: 'article',
    id: 'beat-phone-addiction',
    label: 'Beat Phone Addiction',
    description: 'Read the phone habit article when distraction starts with compulsive checking.',
    keywords: ['phone', 'scroll', 'social media', 'doomscroll', 'reels', 'instagram'],
  },
  {
    kind: 'article',
    id: 'dopamine-detox-guide',
    label: 'Dopamine Detox Guide',
    description: 'Read the overstimulation guide when everything feels too noisy to focus on.',
    keywords: ['dopamine', 'detox', 'stimulation', 'overstimulated', 'craving'],
  },
  {
    kind: 'article',
    id: 'deep-work-system',
    label: 'Deep Work System',
    description: 'Read the deep work article for a better focus architecture.',
    keywords: ['deep work', 'focus', 'study', 'work system', 'concentration'],
  },
  {
    kind: 'article',
    id: 'focus-tracking',
    label: 'Focus Tracking',
    description: 'Read the focus tracking article to make your progress easier to measure.',
    keywords: ['tracking', 'measure', 'metrics', 'progress', 'consistency'],
  },
]

function selectCoachResources(message, summary) {
  const input = String(message || '').toLowerCase()
  const scored = COACH_RESOURCES.map((resource) => {
    let score = 0

    resource.keywords.forEach((keyword) => {
      if (input.includes(keyword)) {
        score += keyword.includes(' ') ? 3 : 2
      }
    })

    if (resource.id === 'planner' && (input.includes('plan') || input.includes('today') || input.includes('week'))) {
      score += 4
    }
    if (resource.id === 'pomodoro' && summary.last7Summary.totals.pomodoro < 60) {
      score += 2
    }
    if (resource.id === 'meditation' && summary.last7Summary.totals.meditation < 10) {
      score += 1
    }
    if (resource.id === 'focus-tracking' && summary.last7Summary.activeDays <= 3) {
      score += 2
    }
    if (resource.id === 'deep-work-system' && summary.last7Summary.totals.pomodoro < 90) {
      score += 1
    }
    if (resource.id === 'dashboard' && (input.includes('how am i doing') || input.includes('performance'))) {
      score += 4
    }
    if (resource.id === 'beat-phone-addiction' && (input.includes('phone') || input.includes('scroll'))) {
      score += 4
    }
    if (resource.id === 'dopamine-detox-guide' && (input.includes('dopamine') || input.includes('overstim'))) {
      score += 4
    }

    return { resource, score }
  })

  const picks = scored
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((entry) => ({
      kind: entry.resource.kind,
      id: entry.resource.id,
      label: entry.resource.label,
      description: entry.resource.description,
    }))

  if (picks.length > 0) return picks

  return [
    {
      kind: 'dashboard',
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Start with your recent stats and streak before making changes.',
    },
    {
      kind: 'tool',
      id: 'planner',
      label: 'Planner',
      description: 'Turn broad advice into a concrete plan for today.',
    },
    {
      kind: 'article',
      id: 'focus-tracking',
      label: 'Focus Tracking',
      description: 'Use the article if you want a clearer way to measure progress.',
    },
  ]
}

function buildCoachSummaryText(summary) {
  const todoLines = summary.todaysTodos.length
    ? summary.todaysTodos.map((todo) => `- [${todo.done ? 'x' : ' '}] ${todo.text}`).join('\n')
    : '- No tasks saved for today.'
  const noteLines = summary.recentNotes.length
    ? summary.recentNotes.map((note) => `- ${note.dateKey}: ${note.text}`).join('\n')
    : '- No recent notes saved.'

  return [
    `User: @${summary.username}${summary.fullName ? ` (${summary.fullName})` : ''}`,
    `Today: ${summary.today}`,
    `Total points: ${summary.totalPoints}`,
    `Level: ${summary.level.level}`,
    `Points to next level: ${summary.level.nextLevelIn}`,
    `Current streak: ${summary.currentStreak} day(s)`,
    `Today totals: focus ${summary.todaySummary.totals.pomodoro} min, meditation ${summary.todaySummary.totals.meditation} min, sudoku ${summary.todaySummary.totals.sudoku}, memory ${summary.todaySummary.totals.memory}, reaction ${summary.todaySummary.totals.reaction}`,
    `Last 7 days: active days ${summary.last7Summary.activeDays}, focus ${summary.last7Summary.totals.pomodoro} min, meditation ${summary.last7Summary.totals.meditation} min, sudoku ${summary.last7Summary.totals.sudoku}, memory ${summary.last7Summary.totals.memory}, reaction ${summary.last7Summary.totals.reaction}`,
    `Last 28 days: active days ${summary.last28Summary.activeDays}, focus ${summary.last28Summary.totals.pomodoro} min, meditation ${summary.last28Summary.totals.meditation} min, sudoku ${summary.last28Summary.totals.sudoku}, memory ${summary.last28Summary.totals.memory}, reaction ${summary.last28Summary.totals.reaction}`,
    `Best Sudoku times: easy ${formatCoachDuration(summary.bestTimesMs.easy)}, medium ${formatCoachDuration(summary.bestTimesMs.medium)}, hard ${formatCoachDuration(summary.bestTimesMs.hard)}`,
    `Best reaction time: ${formatCoachDuration(summary.bestTimesMs.reaction)}`,
    `Saved intention: ${summary.intention || 'None'}`,
    `Planner custom items saved: ${summary.plannerCustomCount}`,
    'Today tasks:',
    todoLines,
    'Recent notes:',
    noteLines,
  ].join('\n')
}

function buildFallbackCoachReply({ message, summary, resources }) {
  const input = String(message || '').toLowerCase()
  const focusMinutes = summary.last7Summary.totals.pomodoro
  const meditationMinutes = summary.last7Summary.totals.meditation
  const activeDays = summary.last7Summary.activeDays
  const sudokuCount = summary.last7Summary.totals.sudoku
  const openTasks = summary.todaysTodos.filter((todo) => !todo.done).length
  const topResourceLabels = resources.slice(0, 2).map((resource) => resource.label)

  const baseline = activeDays === 0
    ? 'You have not logged any Zenflow activity in the last 7 days yet, so the main job is simply to restart momentum.'
    : `In the last 7 days you logged ${focusMinutes} focus minute(s), ${meditationMinutes} meditation minute(s), and ${sudokuCount} Sudoku win(s) across ${activeDays} active day(s).`

  const streakLine = summary.currentStreak > 0
    ? `You currently have a ${summary.currentStreak}-day streak.`
    : 'You do not have an active streak right now.'

  if (/\b(plan|today|schedule|next step|what should i do)\b/.test(input)) {
    const planLines = [
      baseline,
      streakLine,
      '1. Start with one clear focus block in Focus Timer, even if it is short.',
      openTasks > 0
        ? `2. Pick one of your ${openTasks} open task(s) for today and move it into Planner as the next priority.`
        : '2. Add one realistic priority into Planner before starting anything else.',
      meditationMinutes < 5
        ? '3. Add a short Meditation reset later in the day so the pace stays sustainable.'
        : '3. Protect your current rhythm with one more focused block instead of adding extra context-switching.',
    ]

    if (topResourceLabels.length > 0) {
      planLines.push(`Best next place to go: ${topResourceLabels.join(' and ')}.`)
    }

    return planLines.join('\n\n')
  }

  const priorityLine = focusMinutes < 60
    ? 'Your clearest opportunity is consistency in focused work.'
    : meditationMinutes < 10
      ? 'Your clearest opportunity is adding calmer reset time around your work.'
      : 'Your recent activity has some momentum, so the next gain is tightening the plan rather than adding more tools.'

  const replyLines = [baseline, streakLine, priorityLine]

  if (summary.intention) {
    replyLines.push(`Your saved intention right now is "${summary.intention}".`)
  }

  if (topResourceLabels.length > 0) {
    replyLines.push(`Best next place to open: ${topResourceLabels.join(' and ')}.`)
  }

  replyLines.push('Gemini is temporarily unavailable, so this reply is based directly on your Zenflow data and built-in coaching rules.')
  return replyLines.join('\n\n')
}

function sanitizeCoachHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .slice(-COACH_HISTORY_LIMIT)
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      content: String(entry?.content || '').trim().slice(0, COACH_MESSAGE_CHAR_LIMIT),
    }))
    .filter((entry) => entry.content)
}

function extractGeminiResponseText(payload) {
  const chunks = []
  ;(payload?.candidates || []).forEach((candidate) => {
    ;(candidate?.content?.parts || []).forEach((part) => {
      if (typeof part?.text === 'string' && part.text.trim()) {
        chunks.push(part.text.trim())
      }
    })
  })

  return chunks.join('\n\n').trim()
}

function extractGeminiBlockReason(payload) {
  const promptBlock = String(payload?.promptFeedback?.blockReason || '').trim()
  if (promptBlock) return promptBlock

  const candidateBlock = String(payload?.candidates?.[0]?.finishReason || '').trim()
  return candidateBlock || ''
}

async function loadCoachUserData(username) {
  if (useFileStorage) {
    const data = readData()
    const rawLogs = data.logs?.[username] || {}
    const logs = []

    Object.entries(rawLogs).forEach(([date, types]) => {
      if (typeof types === 'number') {
        logs.push({ date, type: 'legacy', value: types })
        return
      }

      Object.entries(types || {}).forEach(([type, value]) => {
        logs.push({ date, type, value: Number(value) || 0 })
      })
    })

    return {
      user: data.users?.[username] || null,
      logs,
      meta: data.meta?.[username] || {},
    }
  }

  const [user, logs, meta] = await Promise.all([
    User.findOne({ username }).lean().exec(),
    Log.find({ user: username }).lean().exec(),
    Meta.findOne({ user: username }).lean().exec(),
  ])

  return {
    user,
    logs: logs.map((entry) => ({
      date: entry.date,
      type: entry.type,
      value: Number(entry.value || 0),
    })),
    meta: meta?.meta || {},
  }
}

async function generateCoachReply({ message, history, summary, resources }) {
  const conversationText = history.length
    ? history.map((entry) => `${entry.role === 'assistant' ? 'Coach' : 'User'}: ${entry.content}`).join('\n')
    : 'No previous conversation.'
  const resourceText = resources.map((resource) => `- ${resource.label}: ${resource.description}`).join('\n')
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_COACH_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: [
              'You are Zenflow Coach, a warm and practical in-app coach for a focus and wellness product.',
              'Use the provided performance summary to answer personally and accurately.',
              'Only refer to performance facts that appear in the provided summary. If something is missing, say that briefly.',
              'Be supportive, clear, and concrete. Avoid therapy language, diagnosis, or hype.',
              'When useful, suggest up to three next steps. If the user asks for a plan, give a short numbered plan.',
              'When pointing to Zenflow resources, use the exact resource names from the provided resource catalog when relevant.',
              'Keep the answer under 220 words unless the user explicitly asks for more detail.',
              'If the user mentions self-harm, suicidal thoughts, or immediate danger, encourage urgent local professional or emergency help.',
            ].join(' '),
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                `Performance summary:\n${buildCoachSummaryText(summary)}`,
                `Resource catalog:\n${resourceText}`,
                `Recent conversation:\n${conversationText}`,
                `Latest user message:\n${message}`,
              ].join('\n\n'),
            },
          ],
        },
      ],
      store: false,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
    signal: AbortSignal.timeout(COACH_RESPONSE_TIMEOUT_MS),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    let providerMessage = errorText

    try {
      const parsed = JSON.parse(errorText)
      providerMessage = String(parsed?.error?.message || parsed?.message || errorText)
    } catch {
      providerMessage = errorText
    }

    throw new Error(`coach request failed (${response.status}): ${providerMessage}`)
  }

  const payload = await response.json()
  const reply = extractGeminiResponseText(payload)
  if (!reply) {
    const blockReason = extractGeminiBlockReason(payload)
    throw new Error(blockReason ? `coach reply blocked: ${blockReason}` : 'coach returned an empty reply')
  }

  return reply
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
    ContactMessage = mongoose.model('ContactMessage', contactMessageSchema)
    EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema)
    EmailCampaign = mongoose.model('EmailCampaign', emailCampaignSchema)
    EmailCampaignRun = mongoose.model('EmailCampaignRun', emailCampaignRunSchema)
    EmailJob = mongoose.model('EmailJob', emailJobSchema)
    AuditLog = mongoose.model('AuditLog', auditLogSchema)
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
  startEmailQueueScheduler()
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

app.post('/api/contact', async (req, res) => {
  const fullName = sanitizeSingleLine(req.body?.fullName, 120)
  const email = normalizeEmail(req.body?.email)
  const message = sanitizeMultiline(req.body?.message, CONTACT_MESSAGE_CHAR_LIMIT)

  if (!fullName || fullName.length < 2) {
    return res.status(400).json({ error: 'full name is required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'enter a valid email address' })
  }
  if (!message || message.length < 10) {
    return res.status(400).json({ error: 'message must be at least 10 characters' })
  }

  try {
    const stored = await createContactMessageRecord({ fullName, email, message })
    await sendTransactionalEmail({
      to: ADMIN_EMAIL,
      subject: `Zenflow contact message from ${fullName}`,
      text: `From: ${fullName} <${email}>\n\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2f241e">
          <p><strong>From:</strong> ${escapeHtml(fullName)} &lt;${escapeHtml(email)}&gt;</p>
          ${formatPlainTextAsHtml(message)}
        </div>
      `,
    })

    return res.json({
      ok: true,
      message: 'Your message was sent. We will reply as soon as possible.',
      referenceId: stored.id || stored._id,
    })
  } catch (error) {
    console.error('Contact submission failed:', error)
    return res.status(500).json({ error: 'Could not send your message right now.' })
  }
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

async function loadRequestUser(username) {
  return findCurrentUserRecord(username)
}

async function adminMiddleware(req, res, next) {
  try {
    const user = await loadRequestUser(req.user)
    if (!user) return res.status(404).json({ error: 'user not found' })
    if (!isAdminUser(user)) return res.status(403).json({ error: 'admin access denied' })
    req.adminUser = user
    next()
  } catch (error) {
    console.error('Admin auth failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
}

async function listAdminUsers({ search = '', filter = 'all', sort = 'created_desc', page = 1, pageSize = ADMIN_LIST_PAGE_SIZE } = {}) {
  const directory = (await loadAllUsersWithData()).map(({ user, meta, logs }) => summarizeAdminUser(user, meta, logs))
  const normalizedSearch = sanitizeSingleLine(search, 120).toLowerCase()
  const searched = normalizedSearch
    ? directory.filter((entry) =>
      [entry.username, entry.fullName, entry.email]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(normalizedSearch))
    )
    : directory
  const normalizedFilter = sanitizeSingleLine(filter, 40) || 'all'
  const filtered = searched.filter((entry) => {
    if (normalizedFilter === 'verified') return Boolean(entry.emailVerified)
    if (normalizedFilter === 'unverified') return !entry.emailVerified
    if (normalizedFilter === 'active') return Number(entry.recentActiveDays || 0) > 0
    if (normalizedFilter === 'inactive') return Number(entry.recentActiveDays || 0) === 0
    return true
  })

  const sorters = {
    created_desc: (left, right) => Number(right.created || 0) - Number(left.created || 0),
    created_asc: (left, right) => Number(left.created || 0) - Number(right.created || 0),
    login_desc: (left, right) => Number(right.lastLoginAt || 0) - Number(left.lastLoginAt || 0),
    points_desc: (left, right) => Number(right.totalPoints || 0) - Number(left.totalPoints || 0),
    email_asc: (left, right) => String(left.email || '').localeCompare(String(right.email || '')),
    username_asc: (left, right) => String(left.username || '').localeCompare(String(right.username || '')),
  }

  const sorter = sorters[sort] || sorters.created_desc
  const sorted = [...filtered].sort(sorter)
  const safePage = clampPage(page)
  const wantsAll = String(pageSize || '').toLowerCase() === 'all'
  const safePageSize = wantsAll ? Math.max(filtered.length, 1) : clampPageSize(pageSize)
  const total = sorted.length
  const start = (safePage - 1) * safePageSize

  return {
    items: sorted.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

async function getAdminUserDetail(username) {
  const cleanUsername = sanitizeSingleLine(username, 80)
  const directory = await loadAllUsersWithData()
  const match = directory.find((entry) => entry.user.username === cleanUsername)
  if (!match) return null

  const summary = summarizeAdminUser(match.user, match.meta, match.logs)
  const recentLogs = [...match.logs]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 40)
  const meta = match.meta || {}

  return {
    user: summary,
    rawProfile: {
      heightCm: meta.profile?.heightCm || '',
      weightKg: meta.profile?.weightKg || '',
      dateOfBirth: meta.profile?.dateOfBirth || '',
    },
    planner: meta.planner || {},
    recentLogs,
    journals: meta.journals || {},
    todosByDate: meta.todosByDate || {},
  }
}

async function listContactMessages({ search = '', page = 1, pageSize = ADMIN_LIST_PAGE_SIZE } = {}) {
  const safePage = clampPage(page)
  const safePageSize = clampPageSize(pageSize)
  const normalizedSearch = sanitizeSingleLine(search, 120).toLowerCase()

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const records = [...admin.contactMessages]
      .filter((entry) => !normalizedSearch || [entry.fullName, entry.email, entry.message].some((field) => String(field || '').toLowerCase().includes(normalizedSearch)))
      .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))

    const total = records.length
    const start = (safePage - 1) * safePageSize
    return {
      items: records.slice(start, start + safePageSize),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    }
  }

  const filter = normalizedSearch
    ? {
      $or: [
        { fullName: { $regex: normalizedSearch, $options: 'i' } },
        { email: { $regex: normalizedSearch, $options: 'i' } },
        { message: { $regex: normalizedSearch, $options: 'i' } },
      ],
    }
    : {}

  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safePageSize).limit(safePageSize).lean().exec(),
    ContactMessage.countDocuments(filter).exec(),
  ])

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

async function createContactMessageRecord({ fullName, email, message, source = 'contact-form' }) {
  const record = {
    id: createRecordId('msg'),
    fullName: sanitizeSingleLine(fullName, 120),
    email: normalizeEmail(email),
    message: sanitizeMultiline(message, CONTACT_MESSAGE_CHAR_LIMIT),
    source: sanitizeSingleLine(source, 40) || 'contact-form',
    status: 'new',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    repliedAt: null,
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    admin.contactMessages.unshift(record)
    writeData(data)
    return record
  }

  const doc = new ContactMessage({
    _id: record.id,
    fullName: record.fullName,
    email: record.email,
    message: record.message,
    source: record.source,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    repliedAt: record.repliedAt,
  })
  await doc.save()
  return doc.toObject()
}

async function updateContactMessageRecord(id, patch) {
  const cleanId = sanitizeSingleLine(id, 80)
  const nextPatch = {
    ...patch,
    updatedAt: Date.now(),
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const index = admin.contactMessages.findIndex((entry) => entry.id === cleanId)
    if (index < 0) return null
    admin.contactMessages[index] = { ...admin.contactMessages[index], ...nextPatch }
    writeData(data)
    return admin.contactMessages[index]
  }

  const updated = await ContactMessage.findOneAndUpdate({ _id: cleanId }, nextPatch, { new: true }).lean().exec()
  return updated || null
}

async function listEmailTemplates() {
  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    return [...admin.emailTemplates].sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
  }

  return EmailTemplate.find({}).sort({ updatedAt: -1 }).lean().exec()
}

async function upsertEmailTemplateRecord(template) {
  const now = Date.now()
  const sanitized = {
    id: template.id || createRecordId('tmpl'),
    name: sanitizeSingleLine(template.name, 120),
    kind: sanitizeSingleLine(template.kind, 40) || 'general',
    subject: sanitizeSingleLine(template.subject, 220),
    body: sanitizeMultiline(template.body, 20000),
    createdBy: sanitizeSingleLine(template.createdBy, 80),
    updatedBy: sanitizeSingleLine(template.updatedBy, 80),
    createdAt: Number(template.createdAt || now),
    updatedAt: now,
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const index = admin.emailTemplates.findIndex((entry) => entry.id === sanitized.id)
    if (index >= 0) {
      admin.emailTemplates[index] = { ...admin.emailTemplates[index], ...sanitized }
    } else {
      admin.emailTemplates.unshift(sanitized)
    }
    writeData(data)
    return sanitized
  }

  const existing = await EmailTemplate.findOne({ _id: sanitized.id }).lean().exec()
  const payload = {
    name: sanitized.name,
    kind: sanitized.kind,
    subject: sanitized.subject,
    body: sanitized.body,
    createdBy: existing?.createdBy || sanitized.createdBy,
    updatedBy: sanitized.updatedBy,
    createdAt: existing?.createdAt || sanitized.createdAt,
    updatedAt: sanitized.updatedAt,
  }
  await EmailTemplate.findOneAndUpdate({ _id: sanitized.id }, payload, { upsert: true }).exec()
  return { ...payload, _id: sanitized.id, id: sanitized.id }
}

async function listEmailCampaigns() {
  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    return [...admin.emailCampaigns].sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
  }

  return EmailCampaign.find({}).sort({ updatedAt: -1 }).lean().exec()
}

async function getEmailCampaignRecord(id) {
  const cleanId = sanitizeSingleLine(id, 80)
  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    return admin.emailCampaigns.find((entry) => entry.id === cleanId) || null
  }

  const doc = await EmailCampaign.findById(cleanId).lean().exec()
  return doc ? { ...doc, id: String(doc._id) } : null
}

async function upsertEmailCampaignRecord(campaign) {
  const now = Date.now()
  const sanitized = {
    id: campaign.id || createRecordId('camp'),
    name: sanitizeSingleLine(campaign.name, 140),
    kind: sanitizeSingleLine(campaign.kind, 40) || 'one_off',
    targetMode: sanitizeSingleLine(campaign.targetMode, 40) || 'selected',
    selectedRecipients: normalizeSelectedRecipients(campaign.selectedRecipients),
    subject: sanitizeSingleLine(campaign.subject, 220),
    body: sanitizeMultiline(campaign.body, 20000),
    templateId: sanitizeSingleLine(campaign.templateId, 80),
    status: sanitizeSingleLine(campaign.status, 40) || 'draft',
    preferredProvider: sanitizeSingleLine(campaign.preferredProvider, 20) || 'auto',
    scheduleEnabled: Boolean(campaign.scheduleEnabled),
    scheduleHourUtc: clampIntegerEnv(campaign.scheduleHourUtc, 9, 0, 23),
    scheduleMinuteUtc: clampIntegerEnv(campaign.scheduleMinuteUtc, 0, 0, 59),
    lastScheduledDateKey: sanitizeSingleLine(campaign.lastScheduledDateKey, 40),
    createdBy: sanitizeSingleLine(campaign.createdBy, 80),
    updatedBy: sanitizeSingleLine(campaign.updatedBy, 80),
    createdAt: Number(campaign.createdAt || now),
    updatedAt: now,
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const index = admin.emailCampaigns.findIndex((entry) => entry.id === sanitized.id)
    if (index >= 0) {
      admin.emailCampaigns[index] = { ...admin.emailCampaigns[index], ...sanitized }
    } else {
      admin.emailCampaigns.unshift(sanitized)
    }
    writeData(data)
    return sanitized
  }

  const existing = await EmailCampaign.findById(sanitized.id).lean().exec()
  const payload = {
    name: sanitized.name,
    kind: sanitized.kind,
    targetMode: sanitized.targetMode,
    selectedRecipients: sanitized.selectedRecipients,
    subject: sanitized.subject,
    body: sanitized.body,
    templateId: sanitized.templateId,
    status: sanitized.status,
    preferredProvider: sanitized.preferredProvider,
    scheduleEnabled: sanitized.scheduleEnabled,
    scheduleHourUtc: sanitized.scheduleHourUtc,
    scheduleMinuteUtc: sanitized.scheduleMinuteUtc,
    lastScheduledDateKey: sanitized.lastScheduledDateKey,
    createdBy: existing?.createdBy || sanitized.createdBy,
    updatedBy: sanitized.updatedBy,
    createdAt: existing?.createdAt || sanitized.createdAt,
    updatedAt: sanitized.updatedAt,
  }
  await EmailCampaign.findOneAndUpdate({ _id: sanitized.id }, payload, { upsert: true }).exec()
  return { ...payload, _id: sanitized.id, id: sanitized.id }
}

async function duplicateEmailCampaignRecord(id, actorUsername) {
  const existing = await getEmailCampaignRecord(id)
  if (!existing) return null

  return upsertEmailCampaignRecord({
    ...existing,
    id: null,
    name: `${existing.name || 'Campaign'} copy`,
    status: 'draft',
    lastScheduledDateKey: '',
    createdBy: actorUsername,
    updatedBy: actorUsername,
    createdAt: Date.now(),
  })
}

async function listEmailCampaignRuns(limit = 50) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit || 50)))
  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    return [...admin.emailCampaignRuns].sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0)).slice(0, safeLimit)
  }

  return EmailCampaignRun.find({}).sort({ createdAt: -1 }).limit(safeLimit).lean().exec()
}

async function listEmailJobs(limit = 100) {
  const safeLimit = Math.min(500, Math.max(1, Number(limit || 100)))
  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    return [...admin.emailJobs].sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0)).slice(0, safeLimit)
  }

  return EmailJob.find({}).sort({ createdAt: -1 }).limit(safeLimit).lean().exec()
}

async function resolveCampaignRecipients(campaign) {
  const mode = sanitizeSingleLine(campaign?.targetMode, 40) || 'selected'
  const usersWithData = await loadAllUsersWithData()
  const recipients = usersWithData
    .map(({ user }) => user)
    .filter(userCanReceiveCampaigns)

  if (mode === 'all') {
    return recipients
  }

  if (mode === 'one') {
    const first = normalizeSelectedRecipients(campaign?.selectedRecipients).slice(0, 1)
    return recipients.filter((user) => first.includes(String(user.username || '').toLowerCase()) || first.includes(String(user.email || '').toLowerCase()))
  }

  const selected = normalizeSelectedRecipients(campaign?.selectedRecipients)
  return recipients.filter((user) => selected.includes(String(user.username || '').toLowerCase()) || selected.includes(String(user.email || '').toLowerCase()))
}

async function createCampaignRunRecord(run) {
  const payload = {
    id: run.id || createRecordId('run'),
    campaignId: sanitizeSingleLine(run.campaignId, 80),
    campaignName: sanitizeSingleLine(run.campaignName, 160),
    campaignKind: sanitizeSingleLine(run.campaignKind, 40),
    targetMode: sanitizeSingleLine(run.targetMode, 40),
    recipientCount: Number(run.recipientCount || 0),
    sentCount: Number(run.sentCount || 0),
    failedCount: Number(run.failedCount || 0),
    pendingCount: Number(run.pendingCount || 0),
    status: sanitizeSingleLine(run.status, 40) || 'queued',
    subject: sanitizeSingleLine(run.subject, 220),
    body: sanitizeMultiline(run.body, 20000),
    createdBy: sanitizeSingleLine(run.createdBy, 80),
    startedAt: Number(run.startedAt || Date.now()),
    completedAt: Number(run.completedAt || 0) || null,
    createdAt: Number(run.createdAt || Date.now()),
    updatedAt: Date.now(),
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    admin.emailCampaignRuns.unshift(payload)
    writeData(data)
    return payload
  }

  const doc = new EmailCampaignRun({
    _id: payload.id,
    campaignId: payload.campaignId,
    campaignName: payload.campaignName,
    campaignKind: payload.campaignKind,
    targetMode: payload.targetMode,
    recipientCount: payload.recipientCount,
    sentCount: payload.sentCount,
    failedCount: payload.failedCount,
    pendingCount: payload.pendingCount,
    status: payload.status,
    subject: payload.subject,
    body: payload.body,
    createdBy: payload.createdBy,
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  })
  await doc.save()
  return { ...doc.toObject(), id: String(doc._id) }
}

async function updateCampaignRunRecord(id, patch) {
  const cleanId = sanitizeSingleLine(id, 80)
  const nextPatch = { ...patch, updatedAt: Date.now() }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const index = admin.emailCampaignRuns.findIndex((entry) => entry.id === cleanId)
    if (index < 0) return null
    admin.emailCampaignRuns[index] = { ...admin.emailCampaignRuns[index], ...nextPatch }
    writeData(data)
    return admin.emailCampaignRuns[index]
  }

  const updated = await EmailCampaignRun.findOneAndUpdate({ _id: cleanId }, nextPatch, { new: true }).lean().exec()
  return updated ? { ...updated, id: String(updated._id) } : null
}

async function createEmailJobRecord(job) {
  const payload = {
    id: job.id || createRecordId('job'),
    campaignId: sanitizeSingleLine(job.campaignId, 80),
    runId: sanitizeSingleLine(job.runId, 80),
    username: sanitizeSingleLine(job.username, 80),
    toEmail: normalizeEmail(job.toEmail),
    toName: sanitizeSingleLine(job.toName, 120),
    subject: sanitizeSingleLine(job.subject, 220),
    bodyText: sanitizeMultiline(job.bodyText, 20000),
    bodyHtml: String(job.bodyHtml || ''),
    preferredProvider: sanitizeSingleLine(job.preferredProvider, 20) || 'auto',
    status: sanitizeSingleLine(job.status, 40) || 'pending',
    attemptCount: Number(job.attemptCount || 0),
    nextAttemptAt: Number(job.nextAttemptAt || Date.now()),
    lastError: sanitizeSingleLine(job.lastError, 500),
    sentAt: Number(job.sentAt || 0) || null,
    createdAt: Number(job.createdAt || Date.now()),
    updatedAt: Date.now(),
  }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    admin.emailJobs.push(payload)
    writeData(data)
    return payload
  }

  const doc = new EmailJob({
    _id: payload.id,
    campaignId: payload.campaignId,
    runId: payload.runId,
    username: payload.username,
    toEmail: payload.toEmail,
    toName: payload.toName,
    subject: payload.subject,
    bodyText: payload.bodyText,
    bodyHtml: payload.bodyHtml,
    preferredProvider: payload.preferredProvider,
    status: payload.status,
    attemptCount: payload.attemptCount,
    nextAttemptAt: payload.nextAttemptAt,
    lastError: payload.lastError,
    sentAt: payload.sentAt,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  })
  await doc.save()
  return { ...doc.toObject(), id: String(doc._id) }
}

async function updateEmailJobRecord(id, patch) {
  const cleanId = sanitizeSingleLine(id, 80)
  const nextPatch = { ...patch, updatedAt: Date.now() }

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const index = admin.emailJobs.findIndex((entry) => entry.id === cleanId)
    if (index < 0) return null
    admin.emailJobs[index] = { ...admin.emailJobs[index], ...nextPatch }
    writeData(data)
    return admin.emailJobs[index]
  }

  const updated = await EmailJob.findOneAndUpdate({ _id: cleanId }, nextPatch, { new: true }).lean().exec()
  return updated ? { ...updated, id: String(updated._id) } : null
}

async function refreshRunCounts(runId) {
  const cleanId = sanitizeSingleLine(runId, 80)

  if (useFileStorage) {
    const data = readData()
    const admin = ensureAdminStore(data)
    const run = admin.emailCampaignRuns.find((entry) => entry.id === cleanId)
    if (!run) return null
    const jobs = admin.emailJobs.filter((entry) => entry.runId === cleanId)
    run.sentCount = jobs.filter((entry) => entry.status === 'sent').length
    run.failedCount = jobs.filter((entry) => entry.status === 'failed').length
    run.pendingCount = jobs.filter((entry) => entry.status === 'pending' || entry.status === 'sending').length
    run.status = run.pendingCount > 0 ? 'sending' : run.failedCount > 0 ? 'partial' : 'completed'
    if (run.pendingCount === 0) {
      run.completedAt = Date.now()
    }
    writeData(data)
    return run
  }

  const jobs = await EmailJob.find({ runId: cleanId }).lean().exec()
  const sentCount = jobs.filter((entry) => entry.status === 'sent').length
  const failedCount = jobs.filter((entry) => entry.status === 'failed').length
  const pendingCount = jobs.filter((entry) => entry.status === 'pending' || entry.status === 'sending').length
  const status = pendingCount > 0 ? 'sending' : failedCount > 0 ? 'partial' : 'completed'
  const patch = {
    sentCount,
    failedCount,
    pendingCount,
    status,
    completedAt: pendingCount === 0 ? Date.now() : null,
  }
  const updated = await EmailCampaignRun.findOneAndUpdate({ _id: cleanId }, patch, { new: true }).lean().exec()
  return updated ? { ...updated, id: String(updated._id) } : null
}

async function enqueueCampaignRun({ campaign, actorUser, testEmail = '' }) {
  const recipients = testEmail
    ? [{ username: actorUser.username, email: normalizeEmail(testEmail), fullName: actorUser.fullName || actorUser.username, created: actorUser.created }]
    : await resolveCampaignRecipients(campaign)
  const filteredRecipients = recipients.filter((entry) => normalizeEmail(entry.email))

  const run = await createCampaignRunRecord({
    campaignId: campaign.id || campaign._id,
    campaignName: campaign.name,
    campaignKind: campaign.kind,
    targetMode: testEmail ? 'test' : campaign.targetMode,
    recipientCount: filteredRecipients.length,
    pendingCount: filteredRecipients.length,
    status: filteredRecipients.length > 0 ? 'queued' : 'completed',
    subject: campaign.subject,
    body: campaign.body,
    createdBy: actorUser.username,
    startedAt: Date.now(),
  })

  for (const recipient of filteredRecipients) {
    const rendered = buildRenderedEmailContent({
      subject: campaign.subject,
      body: campaign.body,
      user: recipient,
    })
    await createEmailJobRecord({
      campaignId: campaign.id || campaign._id,
      runId: run.id || run._id,
      username: recipient.username,
      toEmail: recipient.email,
      toName: recipient.fullName || recipient.username || recipient.email,
      subject: rendered.subject,
      bodyText: rendered.text,
      bodyHtml: rendered.html,
      preferredProvider: campaign.preferredProvider || 'auto',
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: Date.now(),
    })
  }

  await updateCampaignRunRecord(run.id || run._id, {
    status: filteredRecipients.length > 0 ? 'queued' : 'completed',
    pendingCount: filteredRecipients.length,
    completedAt: filteredRecipients.length > 0 ? null : Date.now(),
  })

  return run
}

function buildRetryDelayMs(attemptCount) {
  const safeAttempt = Math.max(1, Number(attemptCount || 1))
  return Math.min(60 * 60 * 1000, safeAttempt * 5 * 60 * 1000)
}

async function maybeEnqueueDueDailyCampaigns() {
  const todayKey = formatEmailDateKey()
  const now = new Date()
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const campaigns = (await listEmailCampaigns()).filter((campaign) => campaign.kind === 'daily' && campaign.status === 'scheduled' && campaign.scheduleEnabled)

  for (const campaign of campaigns) {
    const scheduledMinutes = Number(campaign.scheduleHourUtc || 0) * 60 + Number(campaign.scheduleMinuteUtc || 0)
    if (campaign.lastScheduledDateKey === todayKey) continue
    if (nowMinutes < scheduledMinutes) continue

    const actor = await loadRequestUser(campaign.createdBy || '')
    const fallbackActor = actor || { username: 'system', email: ADMIN_EMAIL, fullName: 'System scheduler' }
    await enqueueCampaignRun({ campaign, actorUser: fallbackActor })
    await upsertEmailCampaignRecord({
      ...campaign,
      status: 'scheduled',
      lastScheduledDateKey: todayKey,
      updatedBy: fallbackActor.username,
    })
    await recordAuditLog({
      actorUser: fallbackActor,
      action: 'campaign.daily.enqueue',
      targetType: 'campaign',
      targetId: campaign.id || campaign._id,
      summary: `Queued daily campaign "${campaign.name}"`,
    })
  }
}

async function processEmailQueue() {
  if (emailQueueRunning) return
  emailQueueRunning = true

  try {
    await maybeEnqueueDueDailyCampaigns()
    const now = Date.now()
    let jobs = []

    if (useFileStorage) {
      const data = readData()
      const admin = ensureAdminStore(data)
      jobs = admin.emailJobs
        .filter((entry) => entry.status === 'pending' && Number(entry.nextAttemptAt || 0) <= now)
        .sort((left, right) => Number(left.createdAt || 0) - Number(right.createdAt || 0))
        .slice(0, EMAIL_QUEUE_BATCH_SIZE)
    } else {
      jobs = await EmailJob.find({ status: 'pending', nextAttemptAt: { $lte: now } })
        .sort({ createdAt: 1 })
        .limit(EMAIL_QUEUE_BATCH_SIZE)
        .lean()
        .exec()
    }

    for (const job of jobs) {
      const jobId = job.id || String(job._id)
      await updateEmailJobRecord(jobId, { status: 'sending', attemptCount: Number(job.attemptCount || 0) + 1 })
      const result = await sendTransactionalEmail({
        to: job.toEmail,
        subject: job.subject,
        text: job.bodyText,
        html: job.bodyHtml,
        preferredProvider: job.preferredProvider || 'auto',
      })

      if (result.delivered) {
        await updateEmailJobRecord(jobId, {
          status: 'sent',
          sentAt: Date.now(),
          lastError: '',
        })
      } else {
        const attemptCount = Number(job.attemptCount || 0) + 1
        if (attemptCount >= EMAIL_QUEUE_MAX_ATTEMPTS) {
          await updateEmailJobRecord(jobId, {
            status: 'failed',
            lastError: `${result.provider || job.preferredProvider || 'provider'} delivery failed`,
          })
        } else {
          await updateEmailJobRecord(jobId, {
            status: 'pending',
            nextAttemptAt: Date.now() + buildRetryDelayMs(attemptCount),
            lastError: `${result.provider || job.preferredProvider || 'provider'} delivery failed`,
          })
        }
      }

      if (job.runId) {
        await refreshRunCounts(job.runId)
      }
    }
  } catch (error) {
    console.error('Email queue failed:', error)
  } finally {
    emailQueueRunning = false
  }
}

function startEmailQueueScheduler() {
  if (emailQueueInterval) return
  emailQueueInterval = setInterval(() => {
    void processEmailQueue()
  }, EMAIL_QUEUE_INTERVAL_MS)
  void processEmailQueue()
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
      await maybeRecordAdminAuthEvent({ ...match.user, username: match.key })
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
    await maybeRecordAdminAuthEvent(user.toObject())
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
      await maybeRecordAdminAuthEvent({ ...match.user, username: match.key }, 'admin.email.verify')
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
    await maybeRecordAdminAuthEvent(user.toObject(), 'admin.email.verify')
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
      await maybeRecordAdminAuthEvent({ ...user, username })
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
      await maybeRecordAdminAuthEvent(user.toObject())
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
    await maybeRecordAdminAuthEvent(user.toObject())
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

app.get('/api/admin/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userDirectory = await loadAllUsersWithData()
    const totalUsers = userDirectory.length
    const verifiedUsers = userDirectory.filter((entry) => isEmailVerified(entry.user)).length
    const contactMessages = await listContactMessages({ page: 1, pageSize: 5 })
    const campaigns = await listEmailCampaigns()
    const runs = await listEmailCampaignRuns(12)
    const queue = await listEmailJobs(200)

    return res.json({
      counts: {
        totalUsers,
        verifiedUsers,
        contactMessages: contactMessages.total,
        activeDailyCampaigns: campaigns.filter((campaign) => campaign.kind === 'daily' && campaign.status === 'scheduled' && campaign.scheduleEnabled).length,
        drafts: campaigns.filter((campaign) => campaign.status === 'draft').length,
        queuePending: queue.filter((job) => job.status === 'pending' || job.status === 'sending').length,
        queueFailed: queue.filter((job) => job.status === 'failed').length,
      },
      recentRuns: runs.slice(0, 6),
      recentMessages: contactMessages.items.slice(0, 5),
    })
  } catch (error) {
    console.error('Admin overview failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await listAdminUsers({
      search: req.query?.search,
      filter: req.query?.filter,
      sort: req.query?.sort,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
    })
    return res.json(result)
  } catch (error) {
    console.error('Admin users failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/users/export.csv', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const directory = await listAdminUsers({ search: req.query?.search, filter: req.query?.filter, sort: req.query?.sort, page: 1, pageSize: 'all' })
    const lines = [
      ['username', 'fullName', 'email', 'created', 'lastLoginAt', 'loginCount', 'emailVerified', 'isAdmin', 'totalPoints', 'recentActiveDays', 'recentFocusMinutes']
        .join(','),
      ...directory.items.map((entry) => [
        `"${String(entry.username || '').replace(/"/g, '""')}"`,
        `"${String(entry.fullName || '').replace(/"/g, '""')}"`,
        `"${String(entry.email || '').replace(/"/g, '""')}"`,
        `"${String(entry.created || '')}"`,
        `"${String(entry.lastLoginAt || '')}"`,
        `"${String(entry.loginCount || 0)}"`,
        `"${String(entry.emailVerified)}"`,
        `"${String(entry.isAdmin)}"`,
        `"${String(entry.totalPoints || 0)}"`,
        `"${String(entry.recentActiveDays || 0)}"`,
        `"${String(entry.recentFocusMinutes || 0)}"`,
      ].join(',')),
    ]

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.user.export',
      targetType: 'user',
      targetId: 'csv',
      summary: 'Exported users CSV',
    })

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="zenflow-users.csv"')
    return res.send(lines.join('\n'))
  } catch (error) {
    console.error('Admin export failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/users/:username', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const detail = await getAdminUserDetail(req.params.username)
    if (!detail) return res.status(404).json({ error: 'user not found' })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.user.view',
      targetType: 'user',
      targetId: detail.user.username,
      summary: `Viewed user ${detail.user.username}`,
    })

    return res.json(detail)
  } catch (error) {
    console.error('Admin user detail failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/messages', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await listContactMessages({
      search: req.query?.search,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
    })
    return res.json(result)
  } catch (error) {
    console.error('Admin messages failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/messages/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const status = sanitizeSingleLine(req.body?.status, 40)
  if (!['new', 'replied', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' })
  }

  try {
    const updated = await updateContactMessageRecord(req.params.id, {
      status,
      repliedAt: status === 'replied' ? Date.now() : null,
    })
    if (!updated) return res.status(404).json({ error: 'message not found' })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.message.update',
      targetType: 'contact-message',
      targetId: req.params.id,
      summary: `Marked contact message as ${status}`,
    })

    return res.json({ ok: true, message: updated })
  } catch (error) {
    console.error('Admin message update failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/templates', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    return res.json({ items: await listEmailTemplates() })
  } catch (error) {
    console.error('Admin templates failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/templates', authMiddleware, adminMiddleware, async (req, res) => {
  const name = sanitizeSingleLine(req.body?.name, 120)
  const subject = sanitizeSingleLine(req.body?.subject, 220)
  const body = sanitizeMultiline(req.body?.body, 20000)

  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'name, subject, and body are required' })
  }

  try {
    const saved = await upsertEmailTemplateRecord({
      id: req.body?.id,
      name,
      kind: sanitizeSingleLine(req.body?.kind, 40) || 'general',
      subject,
      body,
      createdBy: req.adminUser.username,
      updatedBy: req.adminUser.username,
      createdAt: req.body?.createdAt,
    })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: req.body?.id ? 'admin.template.update' : 'admin.template.create',
      targetType: 'email-template',
      targetId: saved.id || saved._id,
      summary: `Saved email template "${saved.name}"`,
    })

    return res.json({ ok: true, item: saved })
  } catch (error) {
    console.error('Admin template save failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/campaigns', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    return res.json({ items: await listEmailCampaigns() })
  } catch (error) {
    console.error('Admin campaigns failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns', authMiddleware, adminMiddleware, async (req, res) => {
  const name = sanitizeSingleLine(req.body?.name, 140)
  const subject = sanitizeSingleLine(req.body?.subject, 220)
  const body = sanitizeMultiline(req.body?.body, 20000)
  const targetMode = sanitizeSingleLine(req.body?.targetMode, 40) || 'selected'

  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'name, subject, and body are required' })
  }

  if (!['one_off', 'daily', 'thank_you'].includes(sanitizeSingleLine(req.body?.kind, 40) || 'one_off')) {
    return res.status(400).json({ error: 'invalid campaign kind' })
  }

  if (!['one', 'selected', 'all'].includes(targetMode)) {
    return res.status(400).json({ error: 'invalid target mode' })
  }

  try {
    const saved = await upsertEmailCampaignRecord({
      id: req.body?.id,
      name,
      kind: sanitizeSingleLine(req.body?.kind, 40) || 'one_off',
      targetMode,
      selectedRecipients: req.body?.selectedRecipients,
      subject,
      body,
      templateId: req.body?.templateId,
      status: sanitizeSingleLine(req.body?.status, 40) || 'draft',
      preferredProvider: sanitizeSingleLine(req.body?.preferredProvider, 20) || 'auto',
      scheduleEnabled: req.body?.scheduleEnabled,
      scheduleHourUtc: req.body?.scheduleHourUtc,
      scheduleMinuteUtc: req.body?.scheduleMinuteUtc,
      lastScheduledDateKey: req.body?.lastScheduledDateKey,
      createdBy: req.adminUser.username,
      updatedBy: req.adminUser.username,
      createdAt: req.body?.createdAt,
    })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: req.body?.id ? 'admin.campaign.update' : 'admin.campaign.create',
      targetType: 'campaign',
      targetId: saved.id || saved._id,
      summary: `Saved campaign "${saved.name}"`,
    })

    return res.json({ ok: true, item: saved })
  } catch (error) {
    console.error('Admin campaign save failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns/preview', authMiddleware, adminMiddleware, async (req, res) => {
  const subject = sanitizeSingleLine(req.body?.subject, 220)
  const body = sanitizeMultiline(req.body?.body, 20000)
  if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' })

  try {
    const users = await loadAllUsersWithData()
    const previewUser = users[0]?.user || req.adminUser
    return res.json({
      preview: buildRenderedEmailContent({
        subject,
        body,
        user: previewUser,
      }),
    })
  } catch (error) {
    console.error('Admin campaign preview failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns/:id/duplicate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const duplicate = await duplicateEmailCampaignRecord(req.params.id, req.adminUser.username)
    if (!duplicate) return res.status(404).json({ error: 'campaign not found' })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.campaign.duplicate',
      targetType: 'campaign',
      targetId: req.params.id,
      summary: `Duplicated campaign "${duplicate.name}"`,
    })

    return res.json({ ok: true, item: duplicate })
  } catch (error) {
    console.error('Admin campaign duplicate failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns/:id/queue', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaign = await getEmailCampaignRecord(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'campaign not found' })

    const run = await enqueueCampaignRun({ campaign, actorUser: req.adminUser })
    await upsertEmailCampaignRecord({
      ...campaign,
      status: campaign.kind === 'daily' && campaign.scheduleEnabled ? 'scheduled' : 'queued',
      updatedBy: req.adminUser.username,
    })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.campaign.queue',
      targetType: 'campaign',
      targetId: req.params.id,
      summary: `Queued campaign "${campaign.name}"`,
    })

    return res.json({ ok: true, run })
  } catch (error) {
    console.error('Admin campaign queue failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns/:id/test', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaign = await getEmailCampaignRecord(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'campaign not found' })

    const run = await enqueueCampaignRun({
      campaign,
      actorUser: req.adminUser,
      testEmail: ADMIN_EMAIL,
    })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.campaign.test',
      targetType: 'campaign',
      targetId: req.params.id,
      summary: `Queued test email for "${campaign.name}"`,
    })

    return res.json({ ok: true, run })
  } catch (error) {
    console.error('Admin campaign test failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns/:id/pause', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaign = await getEmailCampaignRecord(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'campaign not found' })
    const updated = await upsertEmailCampaignRecord({
      ...campaign,
      status: 'paused',
      scheduleEnabled: false,
      updatedBy: req.adminUser.username,
    })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.campaign.pause',
      targetType: 'campaign',
      targetId: req.params.id,
      summary: `Paused campaign "${campaign.name}"`,
    })

    return res.json({ ok: true, item: updated })
  } catch (error) {
    console.error('Admin campaign pause failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/admin/campaigns/:id/resume', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const campaign = await getEmailCampaignRecord(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'campaign not found' })
    const updated = await upsertEmailCampaignRecord({
      ...campaign,
      status: campaign.kind === 'daily' ? 'scheduled' : 'draft',
      scheduleEnabled: campaign.kind === 'daily' ? true : campaign.scheduleEnabled,
      updatedBy: req.adminUser.username,
    })

    await recordAuditLog({
      actorUser: req.adminUser,
      action: 'admin.campaign.resume',
      targetType: 'campaign',
      targetId: req.params.id,
      summary: `Resumed campaign "${campaign.name}"`,
    })

    return res.json({ ok: true, item: updated })
  } catch (error) {
    console.error('Admin campaign resume failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/runs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    return res.json({ items: await listEmailCampaignRuns(req.query?.limit) })
  } catch (error) {
    console.error('Admin runs failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/queue', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const jobs = await listEmailJobs(req.query?.limit || 200)
    return res.json({
      items: jobs,
      counts: {
        pending: jobs.filter((entry) => entry.status === 'pending' || entry.status === 'sending').length,
        sent: jobs.filter((entry) => entry.status === 'sent').length,
        failed: jobs.filter((entry) => entry.status === 'failed').length,
      },
      config: {
        batchSize: EMAIL_QUEUE_BATCH_SIZE,
        intervalMs: EMAIL_QUEUE_INTERVAL_MS,
        maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
      },
    })
  } catch (error) {
    console.error('Admin queue failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.get('/api/admin/audit-logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (useFileStorage) {
      const data = readData()
      const admin = ensureAdminStore(data)
      return res.json({ items: admin.auditLogs.slice(0, 100) })
    }

    const items = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean().exec()
    return res.json({ items })
  } catch (error) {
    console.error('Admin audit logs failed:', error)
    return res.status(500).json({ error: 'server error' })
  }
})

app.post('/api/coach/chat', authMiddleware, async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, COACH_MESSAGE_CHAR_LIMIT)
  if (!message) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const history = sanitizeCoachHistory(req.body?.history)
    const coachData = await loadCoachUserData(req.user)
    const summary = buildCoachPerformanceSummary({
      username: req.user,
      fullName: coachData.user?.fullName || req.user,
      logs: coachData.logs,
      meta: coachData.meta,
    })
    const resources = selectCoachResources(message, summary)

    if (!GEMINI_API_KEY) {
      return res.json({
        ok: true,
        reply: buildFallbackCoachReply({ message, summary, resources }),
        resources,
        fallback: true,
      })
    }

    const reply = await generateCoachReply({
      message,
      history,
      summary,
      resources,
    })

    return res.json({
      ok: true,
      reply,
      resources,
    })
  } catch (error) {
    const messageText = String(error?.message || 'Coach could not answer right now. Please try again.')
    console.error('Coach chat failed:', messageText)

    try {
      const coachData = await loadCoachUserData(req.user)
      const summary = buildCoachPerformanceSummary({
        username: req.user,
        fullName: coachData.user?.fullName || req.user,
        logs: coachData.logs,
        meta: coachData.meta,
      })
      const resources = selectCoachResources(message, summary)

      return res.json({
        ok: true,
        reply: buildFallbackCoachReply({ message, summary, resources }),
        resources,
        fallback: true,
      })
    } catch (fallbackError) {
      console.error('Coach fallback failed:', fallbackError?.message || fallbackError)
      return res.status(502).json({ error: 'Coach could not answer right now. Please try again.' })
    }
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
  app.set('trust proxy', true)

  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next()
    if (req.path === '/health' || req.path.startsWith('/api/')) return next()

    const requestProtocol = getRequestProtocol(req)
    const requestHostname = getRequestHostname(req)
    const publicPage = getPublicPageSeo(req.path)
    const normalizedPath = publicPage ? publicPage.path : req.path
    const needsProtocolRedirect = requestProtocol !== 'https'
    const needsHostRedirect = requestHostname !== CANONICAL_HOSTNAME
    const needsPathRedirect = normalizedPath !== req.path

    if (!needsProtocolRedirect && !needsHostRedirect && !needsPathRedirect) return next()

    const redirectUrl = buildCanonicalRequestUrl(req, normalizedPath)
    return res.redirect(308, redirectUrl)
  })

  app.use(express.static(buildDir))
  app.get('*', (req, res) => {
    const publicPage = getPublicPageSeo(req.path)
    const meta = publicPage || {
      path: normalizePublicSeoPath(req.path),
      title: DEFAULT_PUBLIC_META.title,
      description: DEFAULT_PUBLIC_META.description,
    }
    const canonicalUrl = new URL(publicPage ? publicPage.path : '/', CANONICAL_ORIGIN).toString()
    const robots = publicPage ? 'index,follow' : 'noindex,nofollow'
    const html = injectIndexMeta(getIndexHtml(buildDir), {
      title: meta.title,
      description: meta.description,
      canonicalUrl,
      robots,
    })

    res.set('X-Robots-Tag', robots)
    res.send(html)
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
