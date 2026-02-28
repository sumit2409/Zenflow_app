import React, { useState, useEffect } from 'react'
import { apiUrl } from '../utils/api'

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export default function StepsTracker({ user, token, onRequireLogin }: Props) {
  const [steps, setSteps] = useState(0)
  const [goal, setGoal] = useState(10000)
  const [logs, setLogs] = useState<Array<{date:string,type:string,value:number}>>([])

  useEffect(() => {
    async function load() {
      if (!user || !token) return
      try {
        const [logsRes, metaRes] = await Promise.all([
          fetch(apiUrl('/api/logs'), {headers:{authorization:`Bearer ${token}`}}),
          fetch(apiUrl('/api/meta'), {headers:{authorization:`Bearer ${token}`}})
        ])
        if (logsRes.ok) {
          const jl = await logsRes.json()
          setLogs(jl.logs || [])
          const todayEntry = (jl.logs || []).find((e:any)=>e.date===todayKey() && e.type==='steps')
          setSteps(todayEntry ? todayEntry.value : 0)
        }
        if (metaRes.ok) {
          const jm = await metaRes.json()
          if (jm.meta && jm.meta.goal) setGoal(Number(jm.meta.goal)||10000)
        }
      } catch(e){ console.error(e) }
    }
    if (!user) {
      setLogs([])
      setSteps(0)
    }
    void load()
  }, [user, token])

  const persist = async (date: string, value: number) => {
    setLogs(prev => {
      const existing = prev.find(e=>e.date===date && e.type==='steps')
      if (existing) {
        return prev.map(e=> e===existing ? {...e,value} : e)
      }
      return [...prev,{date,type:'steps',value}]
    })
    if (!user || !token) return
    try {
      await fetch(apiUrl('/api/logs'), {
        method:'POST',
        headers:{'content-type':'application/json', authorization:`Bearer ${token}`},
        body: JSON.stringify({date, type:'steps', value})
      })
    } catch(e){ console.error(e) }
  }

  const changeSteps = (delta: number) => {
    if (!user || !token) return onRequireLogin?.()
    const key = todayKey()
    const newVal = Math.max(0, steps + delta)
    void persist(key, newVal)
    setSteps(newVal)
  }

  const resetToday = () => {
    if (!user || !token) return onRequireLogin?.()
    const key = todayKey()
    void persist(key, 0)
    setSteps(0)
  }

  const saveGoal = (nextGoal: number) => {
    setGoal(nextGoal)
    if (!user || !token) return
    fetch(apiUrl('/api/meta'), {
      method:'POST',
      headers:{'content-type':'application/json', authorization:`Bearer ${token}`},
      body: JSON.stringify({meta:{goal: nextGoal}})
    }).catch(e=>console.error(e))
  }

  const aggregate = (period: 'day'|'week'|'month') => {
    const now = new Date()
    const relevant = logs.filter(e=>e.type==='steps')
    if (period === 'day') return steps
    if (period === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate()-6)
      return relevant.filter(e=>new Date(e.date)>=start).reduce((s,e)=>s+e.value,0)
    }
    const start = new Date(now)
    start.setMonth(now.getMonth()-1)
    return relevant.filter(e=>new Date(e.date)>=start).reduce((s,e)=>s+e.value,0)
  }

  const progress = goal ? Math.min(100, Math.round((steps / goal) * 100)) : 0

  return (
    <div>
      <div className="module-meta">
        <h2>Motion Room</h2>
        <p>Movement changes mental state. Use this room to keep the body awake while the mind does demanding work.</p>
      </div>

      <div className="steps-display">{steps.toLocaleString()} steps today</div>
      <div className="progress-rail large">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="muted">{progress}% of your daily motion goal</p>

      <div className="controls">
        <button onClick={() => changeSteps(250)}>+250</button>
        <button onClick={() => changeSteps(500)}>+500</button>
        <button onClick={() => changeSteps(-250)}>-250</button>
        <button onClick={resetToday}>Reset</button>
      </div>

      <div className="goal card inset-card">
        <label>
          Daily goal
          <input type="number" value={goal} onChange={e => saveGoal(Number(e.target.value) || 0)} />
        </label>
        <div className="goal-copy">Aim for the amount of movement that leaves you clearer, not exhausted.</div>
      </div>

      <div className="aggregates">
        <div><strong>{aggregate('day').toLocaleString()}</strong><span>Day</span></div>
        <div><strong>{aggregate('week').toLocaleString()}</strong><span>Week</span></div>
        <div><strong>{aggregate('month').toLocaleString()}</strong><span>Month</span></div>
      </div>

      {!user && (
        <div className="login-cta">
          <p className="muted">Login to preserve goals, progress, and your reward trail across devices.</p>
          <button onClick={() => onRequireLogin?.()}>Login to save motion data</button>
        </div>
      )}
    </div>
  )
}
