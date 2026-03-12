// uiRenderer.js
// Renders symbol rows and operator rows using the exam UI class names.

function renderRow(id, data) {
  const container = document.getElementById(id)
  if (!container) return
  container.innerHTML = ''

  const isTarget = (id === 'bottomPattern')

  data.forEach(s => {
    const div = document.createElement('div')
    div.className = isTarget ? 'symbol target' : 'symbol'
    div.textContent = s
    container.appendChild(div)
  })
}

function renderOperatorRows(rows) {
  const container = document.getElementById('operatorRows')
  if (!container) return
  container.innerHTML = ''

  rows.forEach((row, rowIndex) => {

    const section = document.createElement('div')
    section.className = 'operator-section'

    const rowDiv = document.createElement('div')
    rowDiv.className = 'operator-row'

    row.forEach(op => {
      const div = document.createElement('div')
      div.className = 'operator'
      div.textContent = op.join(' ')
      div.title = `Position mapping: ${op.join(' ')}`
      div.onclick = () => selectOperator(rowIndex, op, div)
      rowDiv.appendChild(div)
    })

    section.appendChild(rowDiv)
    container.appendChild(section)
  })
}