import React, { useEffect, useMemo, useState } from 'react'
import { getFreshPuzzle, getSolutionValue, isCellLocked, isSolved, toGrid, updateGridValue, type SudokuDifficulty } from '../utils/sudoku'
import { todayKey } from '../utils/wellness'
import { playStartChime, playVictoryFanfare } from '../utils/sound'
import { apiUrl } from '../utils/api'
import type { ProfileMeta } from '../utils/profile'

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

type LeaderboardEntry = {
  username: string
  fullName: string
  bestMs: number
}

function createEmptyLeaderboard(): Record<SudokuDifficulty, LeaderboardEntry[]> {
  return {
    easy: [],
    medium: [],
    hard: [],
  }
}

function formatDurationMs(ms: number | null) {
  if (!ms) return '-'

  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const tenths = Math.floor((ms % 1000) / 100)

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
  }

  return `${seconds}.${tenths}s`
}

export default function SudokuTrainer({ user, token, onRequireLogin }: Props) {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>('medium')
  const [puzzleVersion, setPuzzleVersion] = useState(0)
  const puzzle = useMemo(() => getFreshPuzzle(difficulty), [difficulty, puzzleVersion])
  const [grid, setGrid] = useState(() => toGrid(puzzle.puzzle))
  const [solved, setSolved] = useState(false)
  const [winMessage, setWinMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('Use the number that matches the solution for each square.')
  const [invalidCells, setInvalidCells] = useState<Record<string, boolean>>({})
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [leaderboard, setLeaderboard] = useState<Record<SudokuDifficulty, LeaderboardEntry[]>>(createEmptyLeaderboard())
  const [leaderboardVersion, setLeaderboardVersion] = useState(0)
  const [startedAt, setStartedAt] = useState(() => performance.now())
  const [elapsedMs, setElapsedMs] = useState(0)

  const currentBestMs = meta.sudoku?.bestTimesMs?.[difficulty] || null

  useEffect(() => {
    async function loadStats() {
      if (!user || !token) {
        setMeta({})
        setLeaderboard(createEmptyLeaderboard())
        return
      }

      try {
        const [metaResponse, recordsResponse] = await Promise.all([
          fetch(apiUrl('/api/meta'), { headers: { authorization: `Bearer ${token}` } }),
          fetch(apiUrl('/api/leaderboard/game-records'), { headers: { authorization: `Bearer ${token}` } }),
        ])

        if (metaResponse.ok) {
          const payload = await metaResponse.json()
          setMeta(payload.meta || {})
        }

        if (recordsResponse.ok) {
          const payload = await recordsResponse.json()
          setLeaderboard(payload.sudoku || createEmptyLeaderboard())
        }
      } catch (error) {
        console.error(error)
      }
    }

    void loadStats()
  }, [leaderboardVersion, token, user])

  useEffect(() => {
    setGrid(toGrid(puzzle.puzzle))
    setSolved(false)
    setWinMessage('')
    setFeedbackMessage('Use the number that matches the solution for each square.')
    setInvalidCells({})
    setStartedAt(performance.now())
    setElapsedMs(0)
  }, [puzzle])

  useEffect(() => {
    if (solved) return undefined

    const interval = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startedAt))
    }, 200)

    return () => window.clearInterval(interval)
  }, [solved, startedAt])

  async function persistSolve(solveMs: number) {
    if (!user || !token) return onRequireLogin?.()
    try {
      const requests = [
        fetch(apiUrl('/api/logs'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ date: todayKey(), type: `sudoku-${difficulty}`, value: 1 }),
        }),
      ]

      if (!currentBestMs || solveMs < currentBestMs) {
        const nextBestTimesMs = {
          ...(meta.sudoku?.bestTimesMs || {}),
          [difficulty]: solveMs,
        }

        setMeta((current) => ({
          ...current,
          sudoku: {
            ...(current.sudoku || {}),
            bestTimesMs: nextBestTimesMs,
          },
        }))

        requests.push(
          fetch(apiUrl('/api/meta'), {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
            body: JSON.stringify({
              meta: {
                sudoku: {
                  ...(meta.sudoku || {}),
                  bestTimesMs: nextBestTimesMs,
                },
              },
            }),
          }),
        )
      }

      await Promise.all(requests)
      setLeaderboardVersion((value) => value + 1)
    } catch (error) {
      console.error(error)
    }
  }

  function handleChange(row: number, col: number, nextValue: string) {
    if (solved || isCellLocked(puzzle.puzzle, row, col)) return

    const cellKey = `${row}-${col}`
    const parsed = Number(nextValue.replace(/[^1-9]/g, '').slice(-1) || 0)
    const nextGrid = updateGridValue(grid, row, col, parsed)
    setGrid(nextGrid)

    if (parsed === 0) {
      setInvalidCells((current) => {
        const nextState = { ...current }
        delete nextState[cellKey]
        return nextState
      })
      setFeedbackMessage('Value cleared.')
      return
    }

    const expectedValue = getSolutionValue(puzzle.solution, row, col)
    if (parsed !== expectedValue) {
      setInvalidCells((current) => ({ ...current, [cellKey]: true }))
      setFeedbackMessage(`${parsed} is not correct for row ${row + 1}, column ${col + 1}.`)
      return
    }

    setInvalidCells((current) => {
      const nextState = { ...current }
      delete nextState[cellKey]
      return nextState
    })
    setFeedbackMessage(`Row ${row + 1}, column ${col + 1} is correct.`)

    if (isSolved(nextGrid, puzzle.solution)) {
      const solveMs = Math.round(performance.now() - startedAt)
      const isNewBest = !currentBestMs || solveMs < currentBestMs

      setElapsedMs(solveMs)
      setSolved(true)
      setWinMessage(`You solved the ${difficulty} puzzle in ${formatDurationMs(solveMs)}${isNewBest ? ' and set a new best time.' : '.'}`)
      void playVictoryFanfare()
      void persistSolve(solveMs)
    }
  }

  function loadNewPuzzle() {
    void playStartChime()
    setPuzzleVersion((value) => value + 1)
  }

  function clearWrongEntries() {
    const nextGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => (invalidCells[`${rowIndex}-${colIndex}`] ? 0 : cell))
    )
    setGrid(nextGrid)
    setInvalidCells({})
    setFeedbackMessage('Wrong entries cleared.')
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Sudoku</h2>
        <p>Play a fresh 9x9 puzzle, correct mistakes quickly, and track completed games.</p>
        <div className="session-reward">Each completed puzzle adds to your daily progress.</div>
      </div>

      <div className="sudoku-shell">
        <div>
          <div className="difficulty-switch" role="tablist" aria-label="Sudoku difficulty">
            {(['easy', 'medium', 'hard'] as SudokuDifficulty[]).map((level) => (
              <button
                key={level}
                className={`difficulty-chip ${difficulty === level ? 'active' : ''}`}
                onClick={() => {
                  setDifficulty(level)
                  setPuzzleVersion((value) => value + 1)
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="sudoku-board" role="grid" aria-label={`Sudoku puzzle ${difficulty}`}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`
                return (
                  <input
                    key={cellKey}
                    className={`sudoku-cell ${isCellLocked(puzzle.puzzle, rowIndex, colIndex) ? 'locked' : ''} ${invalidCells[cellKey] ? 'incorrect' : ''} ${colIndex % 3 === 0 ? 'block-left' : ''} ${colIndex === 8 ? 'block-right' : ''} ${rowIndex % 3 === 0 ? 'block-top' : ''} ${rowIndex === 8 ? 'block-bottom' : ''}`}
                    value={cell || ''}
                    onChange={(event) => handleChange(rowIndex, colIndex, event.target.value)}
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Row ${rowIndex + 1} Column ${colIndex + 1}`}
                    disabled={isCellLocked(puzzle.puzzle, rowIndex, colIndex)}
                  />
                )
              })
            )}
          </div>
        </div>

        <div className="sudoku-side card inset-card">
          <h3>Current puzzle</h3>
          <p className="muted">Every new round loads a fresh board. Wrong entries are highlighted immediately so you can correct them quickly.</p>
          <div className="mini-stats sudoku-stats">
            <div>
              <strong>{solved ? 'Done' : 'Live'}</strong>
              <span>Status</span>
            </div>
            <div>
              <strong>{difficulty}</strong>
              <span>Level</span>
            </div>
            <div>
              <strong>{formatDurationMs(elapsedMs)}</strong>
              <span>Timer</span>
            </div>
            <div>
              <strong>{Object.keys(invalidCells).length}</strong>
              <span>Mistakes</span>
            </div>
            <div>
              <strong>{currentBestMs ? formatDurationMs(currentBestMs) : '-'}</strong>
              <span>Your best</span>
            </div>
          </div>
          <div className="controls">
            <button onClick={loadNewPuzzle}>New puzzle</button>
            <button onClick={clearWrongEntries} disabled={Object.keys(invalidCells).length === 0}>Clear mistakes</button>
          </div>
          <div className={`game-result ${Object.keys(invalidCells).length === 0 ? 'success' : ''}`} role="status" aria-live="polite">
            {feedbackMessage}
          </div>
          {winMessage && (
            <div className={`game-result ${solved ? 'success' : ''}`} role="status" aria-live="polite">
              {winMessage}
            </div>
          )}
          {solved ? (
            <div className="empty-panel">
              <h4>Puzzle solved</h4>
              <p>Load another puzzle whenever you want a new round.</p>
            </div>
          ) : (
            <div className="empty-panel">
              <h4>Board guide</h4>
              <p>The thicker borders mark each 3x3 section so the grid is easier to scan on a phone screen.</p>
            </div>
          )}

          <div className="records-grid">
            {(['easy', 'medium', 'hard'] as SudokuDifficulty[]).map((level) => (
              <section key={level} className="record-panel">
                <div className="section-kicker">{level} fastest</div>
                {leaderboard[level].length > 0 ? (
                  <div className="leaderboard-list compact">
                    {leaderboard[level].map((entry, index) => (
                      <div key={`${level}-${entry.username}`} className="leaderboard-row">
                        <strong>#{index + 1}</strong>
                        <div>
                          <span>@{entry.username}</span>
                          <small>{entry.fullName}</small>
                        </div>
                        <span>{formatDurationMs(entry.bestMs)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No solved times logged yet.</p>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
