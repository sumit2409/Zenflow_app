import React, { useEffect, useMemo, useState } from 'react'
import { getDailyPuzzle, isCellLocked, isSolved, toGrid, updateGridValue, type SudokuDifficulty } from '../utils/sudoku'
import { todayKey } from '../utils/wellness'
import { playStartChime, playVictoryFanfare } from '../utils/sound'
import { apiUrl } from '../utils/api'

type Props = { user: string | null; token?: string | null; onRequireLogin?: () => void }

export default function SudokuTrainer({ user, token, onRequireLogin }: Props) {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>('medium')
  const puzzle = useMemo(() => getDailyPuzzle(difficulty), [difficulty])
  const [grid, setGrid] = useState(() => toGrid(getDailyPuzzle('medium').puzzle))
  const [solved, setSolved] = useState(false)
  const [alreadyLogged, setAlreadyLogged] = useState(false)
  const [winMessage, setWinMessage] = useState('')

  useEffect(() => {
    setGrid(toGrid(puzzle.puzzle))
    setSolved(false)
    setAlreadyLogged(false)
    setWinMessage('')
  }, [puzzle])

  useEffect(() => {
    async function load() {
      if (!user || !token) {
        setAlreadyLogged(false)
        return
      }
      try {
        const response = await fetch(apiUrl('/api/logs'), { headers: { authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const payload = await response.json()
        const doneToday = (payload.logs || []).some((entry: any) => entry.date === todayKey() && entry.type === `sudoku-${difficulty}` && entry.value >= 1)
        setAlreadyLogged(doneToday)
        setSolved(doneToday)
        if (doneToday) {
          setGrid(toGrid(puzzle.solution))
          setWinMessage(`Already cleared today’s ${difficulty} grid.`)
        }
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [user, token, difficulty, puzzle.solution])

  async function persistSolve() {
    if (!user || !token) return onRequireLogin?.()
    try {
      await fetch(apiUrl('/api/logs'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: todayKey(), type: `sudoku-${difficulty}`, value: 1 }),
      })
      setAlreadyLogged(true)
    } catch (error) {
      console.error(error)
    }
  }

  function handleChange(row: number, col: number, nextValue: string) {
    if (solved || isCellLocked(puzzle.puzzle, row, col)) return

    const parsed = Number(nextValue.replace(/[^1-9]/g, '').slice(-1) || 0)
    const nextGrid = updateGridValue(grid, row, col, parsed)
    setGrid(nextGrid)

    if (isSolved(nextGrid, puzzle.solution)) {
      setSolved(true)
      setWinMessage(`You won the ${difficulty} Sudoku.`)
      void playVictoryFanfare()
      if (!alreadyLogged) void persistSolve()
    }
  }

  function resetPuzzle() {
    void playStartChime()
    setGrid(toGrid(alreadyLogged ? puzzle.solution : puzzle.puzzle))
    setSolved(alreadyLogged)
    if (!alreadyLogged) setWinMessage('')
  }

  return (
    <div>
      <div className="module-meta">
        <h2>Mind Puzzle Room</h2>
        <p>Train recall, pattern recognition, and patience with a daily Sudoku ritual designed to sharpen attention.</p>
        <div className="session-reward">Solve today&apos;s grid to complete your mind ritual and earn sanctuary points.</div>
      </div>

      <div className="sudoku-shell">
        <div>
          <div className="difficulty-switch" role="tablist" aria-label="Sudoku difficulty">
            {(['easy', 'medium', 'hard'] as SudokuDifficulty[]).map((level) => (
              <button
                key={level}
                className={`difficulty-chip ${difficulty === level ? 'active' : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="sudoku-board" role="grid" aria-label={`Sudoku puzzle ${difficulty}`}>
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <input
                key={`${rowIndex}-${colIndex}`}
                className={`sudoku-cell ${isCellLocked(puzzle.puzzle, rowIndex, colIndex) ? 'locked' : ''}`}
                value={cell || ''}
                onChange={(event) => handleChange(rowIndex, colIndex, event.target.value)}
                inputMode="numeric"
                maxLength={1}
                aria-label={`Row ${rowIndex + 1} Column ${colIndex + 1}`}
                disabled={isCellLocked(puzzle.puzzle, rowIndex, colIndex)}
              />
            ))
          )}
          </div>
        </div>

        <div className="sudoku-side card inset-card">
          <h3>Daily brain-sharpening ritual</h3>
          <p className="muted">Complete one puzzle and your dashboard will count it toward today&apos;s reward cycle. Difficulty changes the challenge, not the clarity.</p>
          <div className="mini-stats sudoku-stats">
            <div>
              <strong>{solved ? 'Done' : 'Live'}</strong>
              <span>status</span>
            </div>
            <div>
              <strong>{difficulty}</strong>
              <span>level</span>
            </div>
            <div>
              <strong>+70</strong>
              <span>points</span>
            </div>
            <div>
              <strong>{alreadyLogged ? '1/1' : '0/1'}</strong>
              <span>daily solve</span>
            </div>
          </div>
          <div className="controls">
            <button onClick={resetPuzzle}>Reset board</button>
          </div>
          {winMessage && (
            <div className={`game-result ${solved ? 'success' : ''}`} role="status" aria-live="polite">
              {winMessage}
            </div>
          )}
          {solved ? (
            <div className="empty-panel">
              <h4>Puzzle cleared</h4>
              <p>You solved today&apos;s {difficulty} grid. Let that clean win reset your attention before the next task.</p>
            </div>
          ) : (
            <div className="empty-panel">
              <h4>Stay steady</h4>
              <p>Sudoku rewards patient attention. Fill only what is obvious, then let the pattern reveal itself.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
