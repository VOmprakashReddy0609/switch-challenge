// puzzleGenerator.js
// Generates a solved Latin-square board and creates a puzzle by blanking cells.

const SYMBOLS = ["▲", "■", "●", "◆", "★", "✦", "⬟", "⬢"]

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function generateOperator(size) {
  const arr = []
  for (let i = 1; i <= size; i++) arr.push(i)
  return shuffle(arr)
}

function applyOperator(base, op) {
  const result = []
  for (let i = 0; i < op.length; i++) {
    result.push(base[op[i] - 1])
  }
  return result
}

function generatePuzzle(level) {
  let size    = 4
  let rows    = 1
  let options = 3

  if (level >= 2) size    = 5
  if (level >= 3) size    = 6
  if (level >= 4) rows    = 2
  if (level >= 5) options = 4
  if (level >= 6) rows    = 3

  const base = shuffle(SYMBOLS.slice(0, size))

  const operatorRows = []
  let current = [...base]

  for (let r = 0; r < rows; r++) {
    const row       = []
    const correctOp = generateOperator(size)
    const correctResult = applyOperator(current, correctOp)

    row.push(correctOp)

    // Fill remaining options with operators that produce different results
    let attempts = 0
    while (row.length < options && attempts < 200) {
      attempts++
      const op  = generateOperator(size)
      const res = applyOperator(current, op)
      if (JSON.stringify(res) !== JSON.stringify(correctResult)) {
        row.push(op)
      }
    }

    operatorRows.push(shuffle(row))
    current = correctResult
  }

  return {
    base,
    target: current,
    operatorRows
  }
}