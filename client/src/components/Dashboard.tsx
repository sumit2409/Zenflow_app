import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  allQuestsComplete,
  getAchievements,
  getCurrentStreak,
  getLevel,
  getQuests,
  getRecentActiveDays,
  getRewardTitle,
  getTodayTotals,
  getTotalPoints,
  todayKey,
  type LogEntry,
} from '../utils/wellness'
import { getJournalNotes, type JournalNote, type ProfileMeta } from '../utils/profile'
import { apiUrl } from '../utils/api'
import OnboardingChecklist from './OnboardingChecklist'
import { getPlannerEntries, parsePlannerDate } from '../utils/planner'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

type Props = { onSelect: (id: string) => void; onOpenPlannerDate?: (dateKey: string) => void; user: string | null; token?: string | null }
type TrendEntry = { username: string; fullName: string; points: number; dailyScores: number[] }

const features = [
  {
    id: 'pomodoro',
    title: 'Focus Timer',
    desc: 'Work in timed sessions and keep a record of completed blocks.',
    sigil: 'FT',
    reward: '+80 points',
  },
  {
    id: 'meditation',
    title: 'Meditation',
    desc: 'Run a guided breathing timer for short reset sessions.',
    sigil: 'MD',
    reward: '+60 points',
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    desc: 'Play a fresh puzzle and track completed games.',
    sigil: 'SD',
    reward: '+70 points',
  },
  {
    id: 'profile',
    title: 'Account and Notes',
    desc: 'Store profile details, daily notes, and your current task list.',
    sigil: 'AC',
    reward: 'Saved account data',
  },
  {
    id: 'arcade',
    title: 'Games',
    desc: 'Run a short memory or reaction drill during a break.',
    sigil: 'GM',
    reward: '+55 points',
  },
  {
    id: 'breakroom',
    title: 'Break Room',
    desc: 'Choose your reset activity after a focus block.',
    sigil: 'BR',
    reward: 'Recovery routines',
  },
  {
    id: 'planner',
    title: 'Planner',
    desc: 'Track required daily items and add timed reminders.',
    sigil: 'PL',
    reward: 'Daily reminders',
  },
]

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
    },
  },
  scales: {
    x: {
      ticks: { color: '#7d6a58' },
      grid: { color: 'rgba(79, 58, 41, 0.08)' },
    },
    y: {
      min: 0,
      max: 100,
      ticks: { color: '#7d6a58' },
      grid: { color: 'rgba(79, 58, 41, 0.08)' },
    },
  },
}

function calculateDailyScore(
  logs: LogEntry[],
  dateKey: string,
  plannerMeta: ProfileMeta['planner']
): number {
  const totals = logs
    .filter((entry) => entry.date === dateKey)
    .reduce((acc, entry) => {
      const normalizedType = entry.type.startsWith('sudoku') ? 'sudoku' : entry.type
      acc[normalizedType] = (acc[normalizedType] || 0) + Number(entry.value || 0)
      return acc
    }, { pomodoro: 0, meditation: 0, sudoku: 0, memory: 0, reaction: 0 } as Record<string, number>)

  const plannerEntries = getPlannerEntries(dateKey, plannerMeta)
  const requiredEntries = plannerEntries.filter((entry) => entry.required)
  const completedRequired = requiredEntries.filter((entry) => entry.completed).length
  const plannerRatio = requiredEntries.length === 0 ? 0 : completedRequired / requiredEntries.length

  const score =
    Math.min(totals.pomodoro, 25) +
    Math.min(totals.meditation, 5) * 4 +
    Math.min(totals.sudoku, 1) * 15 +
    Math.min((totals.memory || 0) + (totals.reaction || 0), 1) * 10 +
    plannerRatio * 30

  return Math.round(Math.min(100, score))
}

const DAILY_PROMPTS = [
  'What is the one thing that would make today a success?',
  'What are you avoiding that you should address today?',
  'What would you tell your future self about this week?',
  'What drained your energy recently, and what gave it back?',
  'What did you learn yesterday that changes how you work today?',
  'What does a focused, intentional version of today look like?',
  'What single task deserves your best attention today?',
]

const CHART_COLORS = ['#bc6c47', '#6b8f71', '#5e7aad', '#a06bb5', '#c9904f']

function formatNoteTimestamp(note: JournalNote) {
  if (!note.createdAt) return 'Saved note'
  return new Date(note.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Dashboard({ onSelect, onOpenPlannerDate, user, token }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [trends, setTrends] = useState<TrendEntry[]>([])
  const [trendDateKeys, setTrendDateKeys] = useState<string[]>([])
  const [newlyUnlocked, setNewlyUnlocked] = useState<string | null>(null)
  const [selectedNoteDate, setSelectedNoteDate] = useState(todayKey())
  const [intentionDraft, setIntentionDraft] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'deleted'>('idle')
  const [isLoading, setIsLoading] = useState(true)
  const prevAchievementsRef = useRef<ReturnType<typeof getAchievements>>([])

  useEffect(() => {
    async function load() {
      if (!user || !token) {
        setLogs([])
        setMeta({})
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const [logsRes, metaRes, trendsRes] = await Promise.all([
          fetch(apiUrl('/api/logs'), { headers: { authorization: `Bearer ${token}` } }),
          fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } }),
          fetch(apiUrl('/api/leaderboard/trends'), { headers: { authorization: `Bearer ${token}` } }),
        ])

        if (logsRes.ok) {
          const logsJson = await logsRes.json()
          setLogs(logsJson.logs || [])
        }

        if (metaRes.ok) {
          const metaJson = await metaRes.json()
          setMeta(metaJson.meta || {})
        }

        if (trendsRes.ok) {
          const trendsJson = await trendsRes.json()
          setTrends(trendsJson.trends || [])
          setTrendDateKeys(trendsJson.dateKeys || [])
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [user, token])

  useEffect(() => {
    const notesForDate = getJournalNotes(meta.journals, selectedNoteDate)
    if (selectedNoteDate === todayKey() && notesForDate.length === 0) {
      setIntentionDraft(meta.intention || '')
      return
    }

    setIntentionDraft('')
  }, [meta.intention, meta.journals, selectedNoteDate])

  const totalPoints = useMemo(() => getTotalPoints(logs), [logs])
  const level = useMemo(() => getLevel(totalPoints), [totalPoints])
  const today = useMemo(() => getTodayTotals(logs), [logs])
  const todayPoints = Math.round(today.pomodoro * 4 + today.meditation * 5 + today.sudoku * 70 + today.memory * 55 + today.reaction * 55 + today.pomodoro_bonus)
  const streak = useMemo(() => getCurrentStreak(logs), [logs])
  const recentDays = useMemo(() => getRecentActiveDays(logs), [logs])
  const quests = useMemo(() => getQuests(logs), [logs])
  const achievements = useMemo(() => getAchievements(logs), [logs])
  const todayScore = useMemo(() => calculateDailyScore(logs, todayKey(), meta.planner), [logs, meta.planner])
  const rewardCount = meta.rewardCount || 0
  const rewardReady = Boolean(user && allQuestsComplete(quests) && meta.lastClaimedDate !== todayKey())
  const notesForSelectedDate = useMemo(() => getJournalNotes(meta.journals, selectedNoteDate), [meta.journals, selectedNoteDate])
  const todaysTasks = meta.todosByDate?.[todayKey()] || []
  const completedTasks = todaysTasks.filter((task) => task.done).length
  const todayPrompt = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 0)
    const diff = Number(new Date()) - Number(start)
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
    return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length]
  }, [])

  const leaderboardBarData = useMemo(() => ({
    labels: trends.map((trend) => `@${trend.username}`),
    datasets: [{
      label: 'All-time points',
      data: trends.map((trend) => trend.points),
      backgroundColor: trends.map((_, index) => `${CHART_COLORS[index % CHART_COLORS.length]}CC`),
      borderColor: trends.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
      borderWidth: 2,
      borderRadius: 8,
    }],
  }), [trends])

  const leaderboardLineData = useMemo(() => ({
    labels: trendDateKeys.map((key) => key.slice(5)),
    datasets: trends.map((trend, index) => ({
      label: `@${trend.username}`,
      data: trend.dailyScores,
      borderColor: CHART_COLORS[index % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
    })),
  }), [trends, trendDateKeys])

  useEffect(() => {
    const previousAchievements = prevAchievementsRef.current
    const justUnlocked = achievements.find(
      (achievement) => achievement.unlocked && !previousAchievements.find((previous) => previous.id === achievement.id && previous.unlocked)
    )
    if (justUnlocked && previousAchievements.length > 0) {
      setNewlyUnlocked(justUnlocked.title)
      window.setTimeout(() => setNewlyUnlocked(null), 3500)
    }
    prevAchievementsRef.current = achievements
  }, [achievements])

  async function persistMeta(partial: Partial<ProfileMeta>) {
    setMeta(prev => ({ ...prev, ...partial }))
    if (!user || !token) return
    await fetch(apiUrl('/api/meta'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ meta: partial }),
    })
  }

  async function saveIntention() {
    if (!user || !token || !intentionDraft.trim()) return

    const nextNotes = [
      ...notesForSelectedDate,
      {
        id: `note-${Date.now()}`,
        text: intentionDraft.trim(),
        createdAt: Date.now(),
      },
    ]
    const nextJournals = {
      ...(meta.journals || {}),
      [selectedNoteDate]: nextNotes,
    }

    setSaveState('saving')
    try {
      await persistMeta({ journals: nextJournals })
      setIntentionDraft('')
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1400)
    } catch (error) {
      console.error(error)
      setSaveState('idle')
    }
  }

  async function deleteNote(noteId: string) {
    if (!user || !token) return

    const nextNotes = notesForSelectedDate.filter((note) => note.id !== noteId)
    const nextJournals = { ...(meta.journals || {}) }

    if (nextNotes.length > 0) {
      nextJournals[selectedNoteDate] = nextNotes
    } else {
      delete nextJournals[selectedNoteDate]
    }

    setSaveState('saving')
    try {
      await persistMeta({ journals: nextJournals })
      setSaveState('deleted')
      window.setTimeout(() => setSaveState('idle'), 1400)
    } catch (error) {
      console.error(error)
      setSaveState('idle')
    }
  }

  async function claimReward() {
    try {
      await persistMeta({ rewardCount: rewardCount + 1, lastClaimedDate: todayKey() })
    } catch (error) {
      console.error(error)
    }
  }

  const progressChartData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (13 - index))
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    })

    const actualTrend = days.map((dateKey) => {
      const totals = logs
        .filter((entry) => entry.date === dateKey)
        .reduce(
          (acc, entry) => {
            const normalizedType = entry.type.startsWith('sudoku') ? 'sudoku' : entry.type
            acc[normalizedType] = (acc[normalizedType] || 0) + Number(entry.value || 0)
            return acc
          },
          { pomodoro: 0, meditation: 0, sudoku: 0, memory: 0, reaction: 0 } as Record<string, number>
        )

      const plannerEntries = getPlannerEntries(dateKey, meta.planner)
      const requiredEntries = plannerEntries.filter((entry) => entry.required)
      const requiredCompleted = requiredEntries.filter((entry) => entry.completed).length

      const score =
        Math.min(totals.pomodoro, 25) +
        Math.min(totals.meditation, 5) * 4 +
        Math.min(totals.sudoku, 1) * 15 +
        Math.min(totals.memory + totals.reaction, 1) * 10 +
        (requiredEntries.length === 0 ? 0 : (requiredCompleted / requiredEntries.length) * 30)

      return Math.round(Math.min(100, score))
    })

    return {
      labels: days.map((dateKey) => dateKey.slice(5)),
      datasets: [
        {
          label: 'Actual progress',
          data: actualTrend,
          borderColor: '#bc6c47',
          backgroundColor: '#bc6c47',
          borderWidth: 3,
          pointRadius: 3,
          tension: 0.34,
        },
        {
          label: 'Ideal trend',
          data: days.map(() => 100),
          borderColor: '#6b8f71',
          backgroundColor: '#6b8f71',
          borderDash: [8, 6],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0,
        },
      ],
    }
  }, [logs, meta.planner])

  const monthlyHeatmap = useMemo(() => {
    const anchor = parsePlannerDate(todayKey())
    const year = anchor.getFullYear()
    const month = anchor.getMonth()
    const firstCell = new Date(year, month, 1)
    const offset = (firstCell.getDay() + 6) % 7
    firstCell.setDate(firstCell.getDate() - offset)

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCell)
      date.setDate(firstCell.getDate() + index)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const plannerEntries = getPlannerEntries(dateKey, meta.planner)
      const requiredEntries = plannerEntries.filter((entry) => entry.required)
      const completedRequired = requiredEntries.filter((entry) => entry.completed).length
      const ratio = requiredEntries.length === 0 ? 0 : completedRequired / requiredEntries.length

      return {
        dateKey,
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === month,
        level: ratio === 0 ? 0 : ratio < 0.5 ? 1 : ratio < 1 ? 2 : 3,
        label: `${completedRequired}/${requiredEntries.length} daily habits complete`,
      }
    })
  }, [meta.planner])

  return (
    <div className="dashboard sanctuary-shell">
      {user && <OnboardingChecklist meta={meta} logs={logs} onSelect={onSelect} />}
      <section className="overview-grid">
        <article className="sanctuary-story card fade-rise">
          <div className="section-kicker">Sanctuary</div>
          <h2>{user ? `Welcome back, ${user}.` : 'Track your day in one place.'}</h2>
          <p>
            Use the dashboard to review sessions, daily notes, tasks, and game progress.
          </p>
          <div className="story-ribbon">
            <span>Progress points</span>
            <span>Streaks</span>
            <span>Saved sessions</span>
          </div>
        </article>

        <article className="level-card card fade-rise">
          <div className="section-kicker">Progress</div>
          <div className="level-row">
            <div>
              <div className="big-number">{totalPoints}</div>
              <div className="subtle-line">Level {level.level}</div>
            </div>
            <div className="reward-badge">{rewardCount} rewards</div>
          </div>
          <div className="progress-rail">
            <span style={{ width: `${level.progress}%` }} />
          </div>
          <div className="today-score-display">
            <span
              className="today-score-number"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '52px',
                lineHeight: 1,
                color: todayScore >= 80 ? 'var(--sage)' : todayScore >= 50 ? 'var(--amber)' : 'var(--ink-soft)',
              }}
            >
              {todayScore}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>/100 today</span>
          </div>
          <div className="progress-rail" style={{ marginTop: '8px' }}>
            <span style={{ width: `${todayScore}%` }} />
          </div>
          <p className="muted">{level.nextLevelIn} points until the next level.</p>
          <div className="mini-stats">
            <div>
              <strong>{todayPoints}</strong>
              <span>today</span>
            </div>
            <div>
              <strong>{streak}</strong>
              <span>day streak</span>
            </div>
            <div>
              <strong>{recentDays}/7</strong>
              <span>active days</span>
            </div>
          </div>
        </article>

        <article className="intention-card card fade-rise">
          <div className="section-kicker">Daily Note</div>
          <p className="muted" style={{ fontSize: '13px', fontStyle: 'italic', marginBottom: '10px' }}>
            {todayPrompt}
          </p>
          <div className="note-toolbar">
            <label className="note-date-field">
              Note date
              <input type="date" value={selectedNoteDate} onChange={(event) => setSelectedNoteDate(event.target.value)} />
            </label>
            <div className="task-meta-chip">{notesForSelectedDate.length} saved</div>
          </div>
          <div className="intention-layout">
            <article className={`journal-postit intention-postit ${intentionDraft.trim() ? 'filled' : 'empty'}`} aria-label="Daily note preview">
              <div className="intention-postit-label">{selectedNoteDate === todayKey() ? 'today' : selectedNoteDate}</div>
              <p>{intentionDraft.trim() || 'Write a short note and pin the focus for today.'}</p>
            </article>
            <div className="intention-editor">
              <textarea
                className="intention-input"
                value={intentionDraft}
                onChange={(event) => setIntentionDraft(event.target.value)}
                placeholder="Write your note here..."
              />
              <div className="intention-actions">
                <button onClick={saveIntention} disabled={!user || saveState === 'saving' || !intentionDraft.trim()}>
                  {saveState === 'saving' ? 'Saving...' : 'Save note'}
                </button>
                <button className="ghost-btn" onClick={() => setIntentionDraft('')} disabled={!intentionDraft}>
                  New note
                </button>
                <span className="muted">
                  {!user
                    ? 'Login to keep this.'
                    : saveState === 'saved'
                      ? 'Saved.'
                      : saveState === 'deleted'
                        ? 'Deleted.'
                        : 'Notes are stored by date in your account.'}
                </span>
              </div>
              {notesForSelectedDate.length > 0 ? (
                <div className="note-stack">
                  {notesForSelectedDate
                    .slice()
                    .reverse()
                    .map((note) => (
                      <article key={note.id} className="journal-postit note-card">
                        <div className="note-card-head">
                          <strong>{formatNoteTimestamp(note)}</strong>
                          <button className="ghost-btn" onClick={() => void deleteNote(note.id)} disabled={!user || saveState === 'saving'}>
                            Delete
                          </button>
                        </div>
                        <p>{note.text}</p>
                      </article>
                    ))}
                </div>
              ) : (
                <div className="empty-panel note-empty">
                  <h4>No saved notes for this date</h4>
                  <p>Write one above and save it to keep a dated history of your notes.</p>
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="quest-grid">
        <article className="quest-board card fade-rise">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Daily Targets</div>
              <h3>Complete the main activities for today</h3>
            </div>
            <button className="ghost-btn" onClick={claimReward} disabled={!rewardReady}>
              {rewardReady ? `Claim ${getRewardTitle(rewardCount)}` : meta.lastClaimedDate === todayKey() ? 'Reward claimed today' : 'Complete all tasks'}
            </button>
          </div>
          <div className="quest-list">
            {quests.map((quest) => {
              const progress = Math.max(6, Math.round((quest.progress / quest.target) * 100))
              return (
                <div key={quest.id} className="quest-row">
                  <div className="quest-copy">
                    <strong>{quest.title}</strong>
                    <span>{quest.detail}</span>
                  </div>
                  <div className="quest-meter">
                    <div className="progress-rail small">
                      <span style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    <div className="quest-meta">
                      <span>{Math.round(quest.progress)} / {quest.target} {quest.unit}</span>
                      <span>+{quest.reward}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="reward-card card fade-rise">
          <div className="section-kicker">Rewards</div>
          <h3>{rewardCount > 0 ? getRewardTitle(rewardCount - 1) : "Complete today's targets to unlock a reward"}</h3>
          <p>
            Rewards mark completed days and help you see steady progress over time.
          </p>
          <div className="achievement-list">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`achievement-pill ${achievement.unlocked ? 'unlocked' : ''}`}>
                <strong>{achievement.title}</strong>
                <span>{achievement.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="quest-grid">
        <article className="history-card card fade-rise" style={{ gridColumn: '1 / -1' }}>
          <div className="section-heading">
            <div>
              <div className="section-kicker">Top Performers</div>
              <h3>Daily score trend - last 14 days</h3>
            </div>
            <button className="ghost-btn" onClick={() => onSelect('pomodoro')}>
              Climb the board
            </button>
          </div>

          {trends.length > 0 ? (
            <div className="history-charts">
              <div className="chart-block">
                <div className="chart-label">All-time ranking</div>
                <Bar
                  data={leaderboardBarData}
                  options={{
                    responsive: true,
                    indexAxis: 'y' as const,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: '#7d6a58' },
                        grid: { color: 'rgba(79, 58, 41, 0.08)' },
                      },
                      y: {
                        ticks: { color: '#7d6a58' },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>

              <div className="chart-block">
                <div className="chart-label">Daily focus score - last 14 days (0-100)</div>
                <Line
                  data={leaderboardLineData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: true, position: 'bottom' as const } },
                    scales: {
                      x: {
                        ticks: { color: '#7d6a58' },
                        grid: { color: 'rgba(79, 58, 41, 0.08)' },
                      },
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { color: '#7d6a58' },
                        grid: { color: 'rgba(79, 58, 41, 0.08)' },
                      },
                    },
                  }}
                />
              </div>

              <div className="leaderboard-list" style={{ marginTop: '8px' }}>
                {trends.map((entry, index) => (
                  <div key={entry.username} className="leaderboard-row">
                    <strong style={{ color: index === 0 ? '#c98c3f' : 'inherit' }}>
                      #{index + 1}
                    </strong>
                    <div>
                      <span>@{entry.username}</span>
                      <small>{entry.fullName}</small>
                    </div>
                    <span>{entry.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <h4>No leaderboard data yet</h4>
              <p>Complete focus sessions, meditation, puzzles, and games to appear here.</p>
            </div>
          )}
        </article>

        <article className="reward-card card fade-rise">
          <div className="section-kicker">Cycle bonus</div>
          <h3>Longer task streaks earn extra points</h3>
          <p>Assign a Pomodoro target to a task. When you finish the full session count, the app awards bonus points and marks the task ready to complete.</p>
          <div className="achievement-list">
            <div className="achievement-pill unlocked">
              <strong>Assigned session goal</strong>
              <span>Each task can require one or more 25-minute focus sessions.</span>
            </div>
            <div className="achievement-pill unlocked">
              <strong>Break before next round</strong>
              <span>Every completed focus block rolls into a break before the next session starts.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="quest-grid">
        <article className="quest-board card fade-rise">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Today&apos;s Tasks</div>
              <h3>Your focus queue</h3>
            </div>
            <button className="ghost-btn" onClick={() => onSelect('profile')}>Edit tasks</button>
          </div>
          {todaysTasks.length > 0 ? (
            <div className="todo-list compact">
              {todaysTasks.slice(0, 5).map((task) => (
                <div key={task.id} className={`todo-item dashboard postit-note ${task.done ? 'done' : ''}`}>
                  <span>{task.text}</span>
                  <div className="task-meta-chip">
                    {task.done
                      ? 'Done'
                      : `${task.completedPomodoros || 0}/${Math.max(1, task.assignedPomodoros || 1)} sessions`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">
              <h4>No focus queue yet</h4>
              <p>Add tasks in your profile room, then attach them to Pomodoro sessions so work and reflection stay connected.</p>
            </div>
          )}
          <div className="mini-stats">
            <div>
              <strong>{completedTasks}</strong>
              <span>done today</span>
            </div>
            <div>
              <strong>{todaysTasks.length - completedTasks}</strong>
              <span>still open</span>
            </div>
            <div>
              <strong>{todaysTasks.length}</strong>
              <span>total tasks</span>
            </div>
          </div>
        </article>

        <article className="reward-card card fade-rise">
          <div className="section-kicker">Brain Rot Remedy</div>
          <h3>Fast resets that fight drift</h3>
          <p>When your attention starts leaking into doomscrolling, use a game or puzzle to pull it back into active cognition.</p>
          <div className="achievement-list">
            <div className="achievement-pill unlocked">
              <strong>Focus tasks + timer</strong>
              <span>Attach a task to a focus block so output feels concrete.</span>
            </div>
            <div className="achievement-pill unlocked">
              <strong>Sudoku + arcade</strong>
              <span>Use pattern recall and reaction games as short cognitive resets.</span>
            </div>
          </div>
          <div className="controls">
            <button onClick={() => onSelect('pomodoro')}>Open focus room</button>
            <button onClick={() => onSelect('arcade')}>Open arcade</button>
          </div>
        </article>
      </section>

      <section className="history-layout">
        <article className="history-card card fade-rise">
          <div className="section-heading">
            <div>
              <div className="section-kicker">History</div>
              <h3>Your recent rhythm</h3>
            </div>
            <div className="today-summary">
              <span>{today.pomodoro} focus min</span>
              <span>{today.meditation} meditation min</span>
              <span>{today.sudoku} puzzles</span>
              <span>{today.memory + today.reaction} game wins</span>
            </div>
          </div>
          {isLoading ? (
            <div className="loading-panel" role="status" aria-live="polite">
              <div className="skeleton-line wide" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <span>Loading your sanctuary history...</span>
            </div>
          ) : user ? (
            <div className="history-charts">
              <div className="chart-block">
                <div className="chart-label">Unified progress</div>
                <Line options={chartOptions} data={progressChartData} />
                <p className="muted chart-note">The ideal line assumes you hit your focus block, meditation, one puzzle or game, and all three daily routine tasks each day.</p>
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <h4>No rhythm logged yet</h4>
              <p>Finish one focus block, one breathing session, or beat a brain game to start building your sanctuary history.</p>
            </div>
          )}
        </article>
      </section>

      <section className="history-layout">
        <article className="history-card card fade-rise">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Habit Heatmap</div>
              <h3>This month at a glance</h3>
            </div>
            <button className="ghost-btn" onClick={() => onSelect('planner')}>Open planner</button>
          </div>
          <div className="heatmap-legend">
            <span><i className="heatmap-swatch level-0" /> Missed</span>
            <span><i className="heatmap-swatch level-1" /> Started</span>
            <span><i className="heatmap-swatch level-2" /> Nearly done</span>
            <span><i className="heatmap-swatch level-3" /> Complete</span>
          </div>
          <div className="habit-heatmap">
            {monthlyHeatmap.map((cell) => (
              <button
                key={cell.dateKey}
                type="button"
                className={`heatmap-cell level-${cell.level} ${cell.inMonth ? '' : 'outside'}`}
                title={`${cell.dateKey}: ${cell.label}`}
                onClick={() => {
                  onOpenPlannerDate?.(cell.dateKey)
                }}
              >
                <strong>{cell.dayNumber}</strong>
                <span>{cell.label}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <div className="feature-grid">
        {features.map((feature) => (
          <button key={feature.id} className="feature-card fade-rise" onClick={() => onSelect(feature.id)}>
            <div className="feature-sigil">{feature.sigil}</div>
            <div className="feature-stack">
              <div className="feature-title">{feature.title}</div>
              <div className="feature-desc">{feature.desc}</div>
              <div className="feature-reward">{feature.reward}</div>
            </div>
            <div className="arrow">&gt;</div>
          </button>
        ))}
      </div>
      {newlyUnlocked && (
        <div className="achievement-toast" role="status" aria-live="polite">
          <span style={{ fontSize: '20px' }}>🏆</span>
          <div>
            <strong>Achievement unlocked!</strong>
            <span>{newlyUnlocked}</span>
          </div>
        </div>
      )}
    </div>
  )
}
