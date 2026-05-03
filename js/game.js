// game.js
// Core game logic for Switch Challenge Trainer.
// State is saved to localStorage on every meaningful action (reload-safe).
//
// HOW RELOAD DETECTION WORKS (matches geo-sudoku pattern exactly):
//
//   sessionStorage is per-tab and survives F5/Ctrl+R reload,
//   but is wiped when the tab is closed, a new tab is opened,
//   or the user navigates to a different URL (back/forward included).
//
//   Rule:
//     • On initGame()   → write SESSION_KEY to sessionStorage ("game is live")
//     • On window.onload → if SESSION_KEY exists AND a valid save exists
//       in localStorage → it's a reload → restore and resume.
//     • If SESSION_KEY is absent → new tab / closed tab / navigated away
//       → show end-game modal with saved scores, then wipe state.

const SAVE_KEY    = 'switchChallenge_state'   // localStorage  — survives reload
const SESSION_KEY = 'switchChallenge_session' // sessionStorage — dies on tab close

// ── State ────────────────────────────────────────────
const GameState = {
  score:          0,
  timeRemaining:  300,
  level:          1,
  qNumber:        1,
  totalQuestions: 0,
  correctAnswers: 0,
  wrongAnswers:   0,
  gameStarted:    false,

  // Current puzzle — stored so it can be restored after reload
  puzzle:            null,   // { base, target, operatorRows }
  selectedOperators: [],
}

let timerInterval = null

// ── Persistence ───────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      score:             GameState.score,
      timeRemaining:     GameState.timeRemaining,
      level:             GameState.level,
      qNumber:           GameState.qNumber,
      totalQuestions:    GameState.totalQuestions,
      correctAnswers:    GameState.correctAnswers,
      wrongAnswers:      GameState.wrongAnswers,
      gameStarted:       GameState.gameStarted,
      puzzle:            GameState.puzzle,
      selectedOperators: GameState.selectedOperators,
    }))
  } catch (e) {
    console.warn('SwitchChallenge: could not save state', e)
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    const s = JSON.parse(raw)
    if (typeof s.score !== 'number' || !s.puzzle) return false

    GameState.score             = s.score
    GameState.timeRemaining     = s.timeRemaining
    GameState.level             = s.level
    GameState.qNumber           = s.qNumber
    GameState.totalQuestions    = s.totalQuestions
    GameState.correctAnswers    = s.correctAnswers
    GameState.wrongAnswers      = s.wrongAnswers
    GameState.gameStarted       = s.gameStarted || false
    GameState.puzzle            = s.puzzle
    GameState.selectedOperators = s.selectedOperators || []
    return true
  } catch (e) {
    console.warn('SwitchChallenge: could not load state', e)
    return false
  }
}

function clearSavedState() {
  try { localStorage.removeItem(SAVE_KEY)     } catch (e) {}
  try { sessionStorage.removeItem(SESSION_KEY) } catch (e) {}
}

function markSessionAlive() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch (e) {}
}

function isSessionAlive() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch (e) { return false }
}

// ── Boot ─────────────────────────────────────────────
window.onload = function () {
  clearInterval(timerInterval)
  timerInterval = null

  const sessionAlive = isSessionAlive()
  const hasSave      = loadState()

  if (sessionAlive && hasSave && GameState.gameStarted) {
    // ── RELOAD of an active game → restore and resume ──────────────────
    document.getElementById('start-overlay').classList.add('hidden')
    restoreUI()
    resumeTimer()

  } else if (!sessionAlive && hasSave && GameState.gameStarted) {
    // ── NEW TAB / TAB CLOSED / NAVIGATED AWAY while game was running ───
    // Show end modal with the interrupted game's scores, then wipe state.
    clearSavedState()
    showEndModal()

  } else {
    // ── Genuine fresh start ────────────────────────────────────────────
    clearSavedState()
    freshStart()
  }
}

// ── Fresh start (show board behind overlay, timer frozen) ────────────
function freshStart() {
  GameState.score          = 0
  GameState.timeRemaining  = 300
  GameState.level          = 1
  GameState.qNumber        = 1
  GameState.totalQuestions = 0
  GameState.correctAnswers = 0
  GameState.wrongAnswers   = 0
  GameState.gameStarted    = false
  GameState.puzzle         = null
  GameState.selectedOperators = []

  loadNextPuzzle()
  updateTimerUI()  // paint 05:00 without ticking
}

// ── Restore UI after reload ───────────────────────────
function restoreUI() {
  // Restore stat counters
  document.getElementById('score').textContent          = GameState.score
  document.getElementById('correct').textContent        = GameState.correctAnswers
  document.getElementById('wrong').textContent          = GameState.wrongAnswers
  document.getElementById('attempted').textContent      = GameState.totalQuestions
  document.getElementById('correct-count').textContent  = GameState.correctAnswers
  document.getElementById('attempted-count').textContent = GameState.totalQuestions
  document.getElementById('q-number').textContent       = GameState.qNumber - 1

  // Restore difficulty bar
  updateDifficulty()

  // Restore timer display
  updateTimerUI()

  // Re-render the current puzzle
  if (GameState.puzzle) {
    renderRow('topPattern',    GameState.puzzle.base)
    renderRow('bottomPattern', GameState.puzzle.target)
    renderOperatorRows(GameState.puzzle.operatorRows)

    // Re-apply any operators the user had already selected
    GameState.selectedOperators.forEach((op, rowIndex) => {
      if (!op) return
      const sections = document.querySelectorAll('.operator-section')
      if (!sections[rowIndex]) return
      const row = sections[rowIndex].querySelector('.operator-row')
      if (!row) return
      Array.from(row.children).forEach(el => {
        if (el.textContent === op.join(' ')) el.classList.add('selected')
      })
    })
  }

  // Restore progress bar
  updateProgress()

  // Reset hint bar to neutral
  const bar  = document.getElementById('hint-bar')
  const hint = document.getElementById('hint-text')
  bar.className = ''
  bar.style.cssText = ''
  hint.innerHTML = `Select one operator from each row. Your selections are applied <strong>top to bottom</strong>.`
}

// ── Called by index.html startGame() / beginAssessment() ─────────────
function initGame() {
  clearInterval(timerInterval)
  timerInterval = null

  GameState.gameStarted = true
  markSessionAlive()  // stamp sessionStorage so reloads know the game is live
  saveState()
  startTimer()
}

// Entry-point wired to the start button in the overlay.
function beginAssessment() {
  document.getElementById('start-overlay').classList.add('hidden')
  initGame()
}

// ── Difficulty ───────────────────────────────────────
function updateDifficulty() {
  const s = GameState.score
  if      (s >= 25) GameState.level = 6
  else if (s >= 20) GameState.level = 5
  else if (s >= 15) GameState.level = 4
  else if (s >= 10) GameState.level = 3
  else if (s >= 5)  GameState.level = 2
  else              GameState.level = 1

  const pct = Math.round((GameState.level / 6) * 100)
  const lb  = document.getElementById('level-bar-fill')
  if (lb) lb.style.width = `${Math.max(5, pct)}%`

  const ld = document.getElementById('level-num')
  if (ld) ld.textContent = GameState.level
}

// ── Puzzle Lifecycle ─────────────────────────────────
function loadNextPuzzle() {
  updateDifficulty()

  GameState.puzzle            = generatePuzzle(GameState.level)
  GameState.selectedOperators = []

  renderRow('topPattern',    GameState.puzzle.base)
  renderRow('bottomPattern', GameState.puzzle.target)
  renderOperatorRows(GameState.puzzle.operatorRows)

  // Reset feedback bar to neutral
  const bar = document.getElementById('hint-bar')
  bar.className = ''
  bar.style.cssText = ''

  const hint = document.getElementById('hint-text')
  hint.innerHTML = `Select one operator from each row. Your selections are applied <strong>top to bottom</strong>.`

  // Update question counter
  document.getElementById('q-number').textContent = GameState.qNumber
  GameState.qNumber++

  if (GameState.gameStarted) saveState()
}

// ── Operator Selection ───────────────────────────────
function selectOperator(rowIndex, op, element) {
  GameState.selectedOperators[rowIndex] = op

  // Deselect siblings in same row
  Array.from(element.parentNode.children).forEach(el => el.classList.remove('selected'))
  element.classList.add('selected')

  if (GameState.gameStarted) saveState()

  // Auto-submit when all rows are filled
  if (GameState.selectedOperators.filter(Boolean).length === GameState.puzzle.operatorRows.length) {
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
  GameState.totalQuestions++
  document.getElementById('attempted').textContent       = GameState.totalQuestions
  document.getElementById('attempted-count').textContent = GameState.totalQuestions

  const result  = applyChain(GameState.puzzle.base, GameState.selectedOperators)
  const correct = JSON.stringify(result) === JSON.stringify(GameState.puzzle.target)

  const bar        = document.getElementById('hint-bar')
  const hint       = document.getElementById('hint-text')
  const puzzleArea = document.getElementById('puzzle-area')

  if (correct) {
    GameState.score++
    GameState.correctAnswers++

    document.getElementById('score').textContent          = GameState.score
    document.getElementById('correct').textContent        = GameState.correctAnswers
    document.getElementById('correct-count').textContent  = GameState.correctAnswers

    bar.className  = 'correct'
    hint.innerHTML = `<strong>✓ Correct!</strong> &nbsp;+1 point — well done.`

    puzzleArea.classList.add('correct-flash')
    setTimeout(() => puzzleArea.classList.remove('correct-flash'), 400)

  } else {
    GameState.wrongAnswers++
    document.getElementById('wrong').textContent = GameState.wrongAnswers

    bar.className  = 'wrong'
    hint.innerHTML = `<strong>✗ Incorrect.</strong> &nbsp;The selected operators did not produce the target sequence.`

    puzzleArea.classList.add('wrong-flash')
    setTimeout(() => puzzleArea.classList.remove('wrong-flash'), 400)
  }

  updateProgress()
  if (GameState.gameStarted) saveState()
  setTimeout(loadNextPuzzle, 900)
}

// ── Progress Bar ──────────────────────────────────────
function updateProgress() {
  const pct = GameState.totalQuestions > 0
    ? Math.round((GameState.correctAnswers / GameState.totalQuestions) * 100)
    : 0
  const fill = document.getElementById('progress-bar-fill')
  if (fill) fill.style.width = `${pct}%`
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval)
  GameState.timeRemaining = 300
  updateTimerUI()
  _runTimer()
}

function resumeTimer() {
  clearInterval(timerInterval)
  updateTimerUI()
  _runTimer()
}

function _runTimer() {
  timerInterval = setInterval(() => {
    GameState.timeRemaining--
    updateTimerUI()
    if (GameState.timeRemaining % 5 === 0) saveState()  // periodic save

    if (GameState.timeRemaining <= 0) {
      clearInterval(timerInterval)
      timerInterval = null
      endGame()
    }
  }, 1000)
}

function updateTimerUI() {
  const t    = Math.max(0, GameState.timeRemaining)
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
  timerInterval = null
  clearSavedState()   // wipe save — next visit starts fresh
  showEndModal()
}

function showEndModal() {
  const { score, level, totalQuestions, correctAnswers, wrongAnswers } = GameState
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

  // Hide start overlay so the modal is visible
  const startOverlay = document.getElementById('start-overlay')
  if (startOverlay) startOverlay.classList.add('hidden')

  document.getElementById('modal-overlay').classList.remove('hidden')

  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById('acc-bar-fill')
      if (fill) fill.style.width = `${accuracy}%`
    }, 150)
  })
}

// ── Restart ───────────────────────────────────────────
function restartGame() {
  clearInterval(timerInterval)
  timerInterval = null
  clearSavedState()
  location.reload()
}

// ── Parent hub hooks (mirrors geo-sudoku pattern) ─────
function pauseAndSave() {
  clearInterval(timerInterval)
  timerInterval = null
  if (GameState.gameStarted) endGame()
  else clearSavedState()
}

function resumeGame() {
  clearSavedState()
  freshStart()
  const overlay = document.getElementById('start-overlay')
  if (overlay) overlay.classList.remove('hidden')
}

window.switchChallenge = { pauseAndSave, resumeGame }
