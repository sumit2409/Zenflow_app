const express = require('express')
const bodyParser = require('body-parser')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const JWT_SECRET = process.env.ZENFLOW_SECRET || 'dev-secret'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zenflow'
const isProduction = process.env.NODE_ENV === 'production'

const DATA_FILE = path.join(__dirname, 'data.json')
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MS = 10 * 60 * 1000
const loginAttempts = new Map()

let useFileStorage = false

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  usernameLower: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  emailLower: { type: String, unique: true, sparse: true },
  fullName: String,
  password: String,
  created: Number,
  lastLoginAt: Number,
  loginCount: { type: Number, default: 0 },
})
const logSchema = new mongoose.Schema({ user: String, date: String, type: String, value: Number })
const metaSchema = new mongoose.Schema({ user: String, meta: mongoose.Schema.Types.Mixed })

let User
let Log
let Meta

function normalizeUsername(username) {
  return String(username || '').trim()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function sanitizeFullName(fullName) {
  return String(fullName || '').trim().replace(/\s+/g, ' ')
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
  if (String(password || '').length < 8) {
    return { error: 'password must be at least 8 characters', data: null }
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: 'password must include uppercase, lowercase, and a number', data: null }
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { error: 'password confirmation does not match', data: null }
  }

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
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, logs: {}, meta: {} }, null, 2), 'utf8')
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function genToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' })
}

function buildAccount(user) {
  if (!user) return null
  return {
    username: user.username,
    fullName: user.fullName || user.username,
    email: user.email || '',
    created: user.created || null,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: Number(user.loginCount || 0),
  }
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
      data.users[username] = {
        username,
        usernameLower,
        email,
        emailLower,
        fullName,
        password: bcrypt.hashSync(password, 10),
        created,
        lastLoginAt: created,
        loginCount: 1,
      }
      writeData(data)

      const token = genToken(username)
      return res.json({ username, token, account: buildAccount(data.users[username]) })
    }

    const existing = await User.findOne({
      $or: [{ usernameLower }, { emailLower }],
    }).exec()
    if (existing) {
      const conflictField = existing.emailLower === emailLower ? 'email already exists' : 'username already exists'
      return res.status(409).json({ error: conflictField })
    }

    const created = Date.now()
    const user = new User({
      username,
      usernameLower,
      email,
      emailLower,
      fullName,
      password: bcrypt.hashSync(password, 10),
      created,
      lastLoginAt: created,
      loginCount: 1,
    })
    await user.save()

    const token = genToken(username)
    return res.json({ username, token, account: buildAccount(user.toObject()) })
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

      const ok = bcrypt.compareSync(password, match.user.password)
      if (!ok) {
        registerFailedAttempt(attemptKey)
        return res.status(401).json({ error: 'invalid credentials' })
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

    const ok = bcrypt.compareSync(password, user.password)
    if (!ok) {
      registerFailedAttempt(attemptKey)
      return res.status(401).json({ error: 'invalid credentials' })
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
