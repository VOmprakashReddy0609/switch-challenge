// game.js
// Core game logic for Switch Challenge Trainer.
// Timer only starts after user clicks "Start Assessment".

// ── State ────────────────────────────────────────────
let puzzle
let score         = 0
let timeRemaining = 300
let timerInterval = null
let level         = 1
let qNumber       = 1

let selectedOperators = []
let totalQuestions    = 0
let correctAnswers    = 0
let wrongAnswers      = 0

// ── Boot ─────────────────────────────────────────────
// Pre-render the first puzzle on load so the board is
// visible behind the start overlay — timer stays frozen.
window.onload = function () {
  loadNextPuzzle()
  updateTimerUI()   // paint 05:00 without ticking
}

// Called by index.html after user dismisses the start overlay.
function initGame() {
  startTimer()
}

// Entry-point wired to the start button in the overlay.
function beginAssessment() {
  document.getElementById('start-overlay').classList.add('hidden')
  initGame()
}

// ── Difficulty ───────────────────────────────────────
function updateDifficulty() {
  if (score >= 25) level = 6
  else if (score >= 20) level = 5
  else if (score >= 15) level = 4
  else if (score >= 10) level = 3
  else if (score >= 5)  level = 2
  else                  level = 1

  // Level bar — 6 tiers
  const pct = Math.round((level / 6) * 100)
  const lb  = document.getElementById('level-bar-fill')
  if (lb) lb.style.width = `${Math.max(5, pct)}%`

  const ld = document.getElementById('level-num')
  if (ld) ld.textContent = level
}

// ── Puzzle Lifecycle ─────────────────────────────────
function loadNextPuzzle() {
  updateDifficulty()

  puzzle            = generatePuzzle(level)
  selectedOperators = []

  renderRow('topPattern',    puzzle.base)
  renderRow('bottomPattern', puzzle.target)
  renderOperatorRows(puzzle.operatorRows)

  // Reset feedback bar to neutral
  const bar = document.getElementById('hint-bar')
  bar.className = ''
  bar.style.cssText = ''

  const hint = document.getElementById('hint-text')
  hint.innerHTML = `Select one operator from each row. Your selections are applied <strong>top to bottom</strong>.`

  // Update question counter
  document.getElementById('q-number').textContent = qNumber
  qNumber++
}

// ── Operator Selection ───────────────────────────────
function selectOperator(rowIndex, op, element) {
  selectedOperators[rowIndex] = op

  // Deselect siblings in same row
  Array.from(element.parentNode.children).forEach(el => el.classList.remove('selected'))
  element.classList.add('selected')

  // Auto-submit when all rows are filled
  if (selectedOperators.filter(Boolean).length === puzzle.operatorRows.length) {
    setTimeout(checkAnswer, 120)
  }
}

// ── Answer Checking ───────────────────────────────────
function applyChain(base, ops) {
  let result = [...base]
  ops.forEach(op => { result = applyOperator(result, op) })
  return result
}

function checkAnswer() {
  totalQuestions++
  document.getElementById('attempted').textContent  = totalQuestions
  document.getElementById('attempted-count').textContent = totalQuestions

  const result = applyChain(puzzle.base, selectedOperators)
  const correct = JSON.stringify(result) === JSON.stringify(puzzle.target)

  const bar  = document.getElementById('hint-bar')
  const hint = document.getElementById('hint-text')

  // Animate the puzzle area
  const puzzleArea = document.getElementById('puzzle-area')

  if (correct) {
    score++
    correctAnswers++

    document.getElementById('score').textContent   = score
    document.getElementById('correct').textContent = correctAnswers
    document.getElementById('correct-count').textContent = correctAnswers

    bar.className = 'correct'
    hint.innerHTML = `<strong>✓ Correct!</strong> &nbsp;+1 point — well done.`

    puzzleArea.classList.add('correct-flash')
    setTimeout(() => puzzleArea.classList.remove('correct-flash'), 400)

  } else {
    wrongAnswers++

    document.getElementById('wrong').textContent = wrongAnswers

    bar.className = 'wrong'
    hint.innerHTML = `<strong>✗ Incorrect.</strong> &nbsp;The selected operators did not produce the target sequence.`

    puzzleArea.classList.add('wrong-flash')
    setTimeout(() => puzzleArea.classList.remove('wrong-flash'), 400)
  }

  updateProgress()
  setTimeout(loadNextPuzzle, 900)
}

// ── Progress Bar ──────────────────────────────────────
function updateProgress() {
  const pct = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0
  const fill = document.getElementById('progress-bar-fill')
  if (fill) fill.style.width = `${pct}%`
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  timeRemaining = 300
  updateTimerUI()

  timerInterval = setInterval(() => {
    timeRemaining--
    updateTimerUI()

    if (timeRemaining <= 0) {
      clearInterval(timerInterval)
      endGame()
    }
  }, 1000)
}

function updateTimerUI() {
  const t    = Math.max(0, timeRemaining)
  const mins = String(Math.floor(t / 60)).padStart(2, '0')
  const secs = String(t % 60).padStart(2, '0')
  const pct  = (t / 300) * 100

  const minEl  = document.getElementById('timer-min')
  const secEl  = document.getElementById('timer-sec')
  const barEl  = document.getElementById('timer-bar-fill')
  const dispEl = document.getElementById('timer-display')

  if (minEl)  minEl.textContent   = mins
  if (secEl)  secEl.textContent   = secs
  if (barEl)  barEl.style.width   = `${pct}%`

  if (dispEl) {
    dispEl.classList.remove('warning', 'danger')
    if (pct <= 15)      dispEl.classList.add('danger')
    else if (pct <= 33) dispEl.classList.add('warning')
  }

  if (barEl) {
    if (pct <= 15)      barEl.style.background = '#b91c1c'
    else if (pct <= 33) barEl.style.background = '#c45c00'
    else                barEl.style.background = 'var(--blue)'
  }
}

// ── End Game ──────────────────────────────────────────
function endGame() {
  clearInterval(timerInterval)

  const accuracy = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0

  document.getElementById('res-score').textContent    = score
  document.getElementById('res-level').textContent    = level
  document.getElementById('res-attempts').textContent = totalQuestions
  document.getElementById('res-correct').textContent  = correctAnswers
  document.getElementById('res-wrong').textContent    = wrongAnswers
  document.getElementById('res-accuracy').textContent = `${accuracy}%`
  document.getElementById('acc-pct').textContent      = `${accuracy}%`

  const overlay = document.getElementById('modal-overlay')
  overlay.classList.remove('hidden')

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('acc-bar-fill')
      if (fill) fill.style.width = `${accuracy}%`
    }, 150)
  })
}