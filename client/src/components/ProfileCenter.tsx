import React, { useEffect, useState } from 'react'
import { todayKey } from '../utils/wellness'
import { type ProfileMeta, type TodoItem } from '../utils/profile'
import { apiUrl } from '../utils/api'

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

export default function ProfileCenter({ user, token, onRequireLogin }: Props) {
  const today = todayKey()
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [profile, setProfile] = useState({ heightCm: '', weightKg: '', dateOfBirth: '' })
  const [journal, setJournal] = useState('')
  const [todoText, setTodoText] = useState('')
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [saveNote, setSaveNote] = useState('Login to preserve your profile and reflections.')

  useEffect(() => {
    async function load() {
      if (!user || !token) return
      try {
        const response = await fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const payload = await response.json()
        const nextMeta = payload.meta || {}
        setMeta(nextMeta)
        setProfile({
          heightCm: nextMeta.profile?.heightCm || '',
          weightKg: nextMeta.profile?.weightKg || '',
          dateOfBirth: nextMeta.profile?.dateOfBirth || '',
        })
        setJournal(nextMeta.journals?.[today] || '')
        setTodos(nextMeta.todosByDate?.[today] || [])
        setSaveNote('Your private space is synced.')
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [user, token, today])

  async function persistMeta(partial: Partial<ProfileMeta>) {
    setMeta((prev) => ({ ...prev, ...partial }))
    if (!user || !token) return onRequireLogin?.()
    setSaveNote('Saving...')
    try {
      await fetch(apiUrl('/api/meta'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ meta: partial }),
      })
      setSaveNote('Saved.')
      window.setTimeout(() => setSaveNote('Your private space is synced.'), 1200)
    } catch (error) {
      console.error(error)
      setSaveNote('Save failed.')
    }
  }

  function saveProfile() {
    void persistMeta({
      profile: {
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        dateOfBirth: profile.dateOfBirth,
      },
    })
  }

  function saveJournal() {
    if (!user || !token) return onRequireLogin?.()
    void persistMeta({
      journals: {
        ...(meta.journals || {}),
        [today]: journal,
      },
    })
  }

  function addTodo() {
    if (!user || !token) return onRequireLogin?.()
    if (!todoText.trim()) return
    const nextTodos = [...todos, { id: `${Date.now()}`, text: todoText.trim(), done: false }]
    setTodos(nextTodos)
    setTodoText('')
    void persistMeta({
      todosByDate: {
        ...(meta.todosByDate || {}),
        [today]: nextTodos,
      },
    })
  }

  function toggleTodo(id: string) {
    if (!user || !token) return onRequireLogin?.()
    const nextTodos = todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
    setTodos(nextTodos)
    void persistMeta({
      todosByDate: {
        ...(meta.todosByDate || {}),
        [today]: nextTodos,
      },
    })
  }

  function removeTodo(id: string) {
    if (!user || !token) return onRequireLogin?.()
    const nextTodos = todos.filter((todo) => todo.id !== id)
    setTodos(nextTodos)
    void persistMeta({
      todosByDate: {
        ...(meta.todosByDate || {}),
        [today]: nextTodos,
      },
    })
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Profile Room</h2>
        <p>Keep a practical snapshot of your body, write down the day, and close out your to-dos with visible relief.</p>
        <div className="session-reward">The more honestly you maintain this room, the easier it becomes to stay intentional.</div>
      </div>

      <div className="profile-layout">
        <section className="profile-card card inset-card">
          <div className="section-kicker">Profile</div>
          <div className="profile-grid">
            <label>
              Height (cm)
              <input value={profile.heightCm} onChange={(event) => setProfile((prev) => ({ ...prev, heightCm: event.target.value }))} />
            </label>
            <label>
              Weight (kg)
              <input value={profile.weightKg} onChange={(event) => setProfile((prev) => ({ ...prev, weightKg: event.target.value }))} />
            </label>
            <label>
              Date of birth
              <input type="date" value={profile.dateOfBirth} onChange={(event) => setProfile((prev) => ({ ...prev, dateOfBirth: event.target.value }))} />
            </label>
          </div>
          <div className="controls">
            <button onClick={saveProfile}>Save profile</button>
          </div>
          <p className="muted">{saveNote}</p>
        </section>

        <section className="journal-card card inset-card">
          <div className="section-kicker">Journal</div>
          <textarea
            className="intention-input journal-input"
            value={journal}
            onChange={(event) => setJournal(event.target.value)}
            placeholder="What shifted today? What drained you? What gave you real energy?"
          />
          <div className="controls">
            <button onClick={saveJournal}>Save journal</button>
          </div>
        </section>

        <section className="todo-card card inset-card">
          <div className="section-kicker">Today&apos;s Tasks</div>
          <div className="todo-entry">
            <input value={todoText} onChange={(event) => setTodoText(event.target.value)} placeholder="Add one task that matters today" />
            <button onClick={addTodo}>Add task</button>
          </div>
          <div className="todo-list">
            {todos.length === 0 ? (
              <div className="empty-panel">
                <h4>No tasks yet</h4>
                <p>Add only the work you genuinely want to close today, then tick it off when it is done.</p>
              </div>
            ) : (
              todos.map((todo) => (
                <label key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
                  <div>
                    <span>{todo.text}</span>
                    <div className="muted">Focus blocks logged: {todo.focusCount || 0}</div>
                  </div>
                  <button className="ghost-btn" onClick={() => removeTodo(todo.id)}>Remove</button>
                </label>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
