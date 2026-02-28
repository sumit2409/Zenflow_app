import React, { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  type WellnessMeta,
} from '../utils/wellness'
import { type ProfileMeta } from '../utils/profile'
import { apiUrl } from '../utils/api'
import OnboardingChecklist from './OnboardingChecklist'
import { getPlannerEntries } from '../utils/planner'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type Props = { onSelect: (id: string) => void; user: string | null; token?: string | null }

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

export default function Dashboard({ onSelect, user, token }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [intentionDraft, setIntentionDraft] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isLoading, setIsLoading] = useState(true)

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
        const [logsRes, metaRes] = await Promise.all([
          fetch(apiUrl('/api/logs'), { headers: { authorization: `Bearer ${token}` } }),
          fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } }),
        ])

        if (logsRes.ok) {
          const logsJson = await logsRes.json()
          setLogs(logsJson.logs || [])
        }

        if (metaRes.ok) {
          const metaJson = await metaRes.json()
          setMeta(metaJson.meta || {})
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
    setIntentionDraft(meta.intention || '')
  }, [meta.intention])

  const totalPoints = useMemo(() => getTotalPoints(logs), [logs])
  const level = useMemo(() => getLevel(totalPoints), [totalPoints])
  const today = useMemo(() => getTodayTotals(logs), [logs])
  const todayPoints = Math.round(today.pomodoro * 4 + today.meditation * 5 + today.sudoku * 70 + today.memory * 55 + today.reaction * 55)
  const streak = useMemo(() => getCurrentStreak(logs), [logs])
  const recentDays = useMemo(() => getRecentActiveDays(logs), [logs])
  const quests = useMemo(() => getQuests(logs), [logs])
  const achievements = useMemo(() => getAchievements(logs), [logs])
  const rewardCount = meta.rewardCount || 0
  const rewardReady = Boolean(user && allQuestsComplete(quests) && meta.lastClaimedDate !== todayKey())
  const todaysTasks = meta.todosByDate?.[todayKey()] || []
  const completedTasks = todaysTasks.filter((task) => task.done).length

  async function persistMeta(partial: WellnessMeta) {
    setMeta(prev => ({ ...prev, ...partial }))
    if (!user || !token) return
    await fetch(apiUrl('/api/meta'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ meta: partial }),
    })
  }

  async function saveIntention() {
    setSaveState('saving')
    try {
      await persistMeta({ intention: intentionDraft.trim() })
      setSaveState('saved')
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
          <textarea
            className="intention-input"
            value={intentionDraft}
            onChange={(event) => setIntentionDraft(event.target.value)}
            placeholder="Write one clear note for today."
          />
          <div className="intention-actions">
            <button onClick={saveIntention} disabled={!user || saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving...' : 'Save note'}
            </button>
            <span className="muted">{user ? (saveState === 'saved' ? 'Saved.' : 'Stored in your account.') : 'Login to keep this.'}</span>
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
          <h3>{rewardCount > 0 ? getRewardTitle(rewardCount - 1) : 'Complete today’s targets to unlock a reward'}</h3>
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
                <div key={task.id} className={`todo-item dashboard ${task.done ? 'done' : ''}`}>
                  <span>{task.text}</span>
                  <div className="task-meta-chip">{task.done ? 'Done' : `${task.focusCount || 0} focus blocks`}</div>
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
    </div>
  )
}
