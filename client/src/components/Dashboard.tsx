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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type Props = { onSelect: (id: string) => void; user: string | null; token?: string | null }

const features = [
  {
    id: 'pomodoro',
    title: 'Focus Room',
    desc: 'Deep-work intervals with gentle cues and visible momentum.',
    sigil: 'FO',
    reward: '+80 ritual points',
  },
  {
    id: 'meditation',
    title: 'Calm Room',
    desc: 'Ambient breathing windows that lower pressure and reset attention.',
    sigil: 'CA',
    reward: '+60 ritual points',
  },
  {
    id: 'sudoku',
    title: 'Mind Puzzle Room',
    desc: 'Daily Sudoku to sharpen concentration and interrupt passive scrolling habits.',
    sigil: 'IQ',
    reward: '+70 ritual points',
  },
  {
    id: 'profile',
    title: 'Profile and Journal',
    desc: 'Store your body profile, journal the day, and tick off the tasks that matter.',
    sigil: 'PR',
    reward: 'Reflection and planning',
  },
  {
    id: 'arcade',
    title: 'Brain Arcade',
    desc: 'Short memory and reaction games that wake your attention back up.',
    sigil: 'AR',
    reward: '+55 ritual points',
  },
]

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: { color: '#7d6a58' },
      grid: { color: 'rgba(79, 58, 41, 0.08)' },
    },
    y: {
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

  const buildData = (type: string, color: string) => {
    const filtered = logs.filter(entry => entry.type === type).sort((a, b) => a.date.localeCompare(b.date))
    return {
      labels: filtered.map(entry => entry.date.slice(5)),
      datasets: [
        {
          label: type,
          data: filtered.map(entry => entry.value),
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.38,
        },
      ],
    }
  }

  return (
    <div className="dashboard sanctuary-shell">
      {user && <OnboardingChecklist meta={meta} logs={logs} onSelect={onSelect} />}
      <section className="overview-grid">
        <article className="sanctuary-story card fade-rise">
          <div className="section-kicker">Sanctuary</div>
          <h2>{user ? `Welcome back, ${user}.` : 'A softer rhythm for ambitious days.'}</h2>
          <p>
            Zenflow now rewards consistency with calm. Build focus, breath, and movement without turning your day into a scoreboard.
          </p>
          <div className="story-ribbon">
            <span>Quiet points</span>
            <span>Gentle streaks</span>
            <span>Unlockable rituals</span>
          </div>
        </article>

        <article className="level-card card fade-rise">
          <div className="section-kicker">Sanctuary Points</div>
          <div className="level-row">
            <div>
              <div className="big-number">{totalPoints}</div>
              <div className="subtle-line">Level {level.level} resident</div>
            </div>
            <div className="reward-badge">{rewardCount} rewards</div>
          </div>
          <div className="progress-rail">
            <span style={{ width: `${level.progress}%` }} />
          </div>
          <p className="muted">{level.nextLevelIn} points until the next sanctuary tier.</p>
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
          <div className="section-kicker">Daily Intention</div>
          <textarea
            className="intention-input"
            value={intentionDraft}
            onChange={(event) => setIntentionDraft(event.target.value)}
            placeholder="Write a gentle sentence for today: move slowly, focus deeply, leave room to breathe."
          />
          <div className="intention-actions">
            <button onClick={saveIntention} disabled={!user || saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving...' : 'Save intention'}
            </button>
            <span className="muted">{user ? (saveState === 'saved' ? 'Saved.' : 'Stored in your account.') : 'Login to keep this.'}</span>
          </div>
        </article>
      </section>

      <section className="quest-grid">
        <article className="quest-board card fade-rise">
          <div className="section-heading">
            <div>
              <div className="section-kicker">Daily Rituals</div>
              <h3>Three gentle wins for the day</h3>
            </div>
            <button className="ghost-btn" onClick={claimReward} disabled={!rewardReady}>
              {rewardReady ? `Claim ${getRewardTitle(rewardCount)}` : meta.lastClaimedDate === todayKey() ? 'Reward claimed today' : 'Complete all rituals'}
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
          <div className="section-kicker">Reward Shelf</div>
          <h3>{rewardCount > 0 ? getRewardTitle(rewardCount - 1) : 'Your first reward is waiting'}</h3>
          <p>
            Rewards here are symbolic by design: a calmer ritual, a small celebration, and a visual reminder that consistency compounds.
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
          ) : user && logs.length > 0 ? (
            <div className="history-charts">
              <div className="chart-block">
                <div className="chart-label">Focus</div>
                <Line options={chartOptions} data={buildData('pomodoro', '#bc6c47')} />
              </div>
              <div className="chart-block">
                <div className="chart-label">Meditation</div>
                <Line options={chartOptions} data={buildData('meditation', '#6b8f71')} />
              </div>
              <div className="chart-block">
                <div className="chart-label">Sudoku</div>
                <Line options={chartOptions} data={buildData('sudoku', '#8b6f9b')} />
              </div>
              <div className="chart-block">
                <div className="chart-label">Brain Arcade</div>
                <Line options={chartOptions} data={buildData('memory', '#d4a373')} />
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
