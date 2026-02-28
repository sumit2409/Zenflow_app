export type SudokuDifficulty = 'easy' | 'medium' | 'hard'

export type SudokuPuzzle = {
  puzzle: string
  solution: string
  difficulty: SudokuDifficulty
}

const puzzlesByDifficulty: Record<SudokuDifficulty, SudokuPuzzle[]> = {
  easy: [
    {
      difficulty: 'easy',
      puzzle: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
      solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
    },
    {
      difficulty: 'easy',
      puzzle: '300200000000107000706030500070009080900020004010800050009040301000702000000008006',
      solution: '351286497492157638786934512275469183938521764614873259829645371163792845547318926',
    },
  ],
  medium: [
    {
      difficulty: 'medium',
      puzzle: '000260701680070090190004500820100040004602900050003028009300074040050036703018000',
      solution: '435269781682571493197834562826195347374682915951743628519326874248957136763418259',
    },
    {
      difficulty: 'medium',
      puzzle: '000000907000420180000705026100904000050000040000507009920108000034059000507000000',
      solution: '462831957795426183381795426173984265659312748248567319926178534834259671517643892',
    },
  ],
  hard: [
    {
      difficulty: 'hard',
      puzzle: '000900002050123400030000160908000000070000090000000205091000050007439020400007000',
      solution: '416958372859123476732674168948265713275341896163789245391842657687439521524617389',
    },
    {
      difficulty: 'hard',
      puzzle: '000000000907000420180000705026100904000050000040000507009920108000034059000507000',
      solution: '264715893957368421183249765526173984798654312341892576639425178812734659475981236',
    },
  ],
}

export function getDailyPuzzle(difficulty: SudokuDifficulty, date = new Date()): SudokuPuzzle {
  const list = puzzlesByDifficulty[difficulty]
  const daySeed = Math.floor(date.getTime() / 86400000)
  return list[daySeed % list.length]
}

export function toGrid(serialized: string) {
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => Number(serialized[row * 9 + col]))
  )
}

export function isCellLocked(puzzle: string, row: number, col: number) {
  return puzzle[row * 9 + col] !== '0'
}

export function updateGridValue(grid: number[][], row: number, col: number, value: number) {
  return grid.map((gridRow, rowIndex) =>
    gridRow.map((cell, colIndex) => (rowIndex === row && colIndex === col ? value : cell))
  )
}

export function isSolved(grid: number[][], solution: string) {
  return grid.every((row, rowIndex) =>
    row.every((cell, colIndex) => String(cell) === solution[rowIndex * 9 + colIndex])
  )
}
