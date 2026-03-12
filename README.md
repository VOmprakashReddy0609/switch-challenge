# Switch Challenge Trainer

A browser‑based symbol sequencing puzzle used for game‑based aptitude assessments. Players transform a source sequence into a target sequence by selecting one operator per row. Difficulty increases as correct answers accumulate.

## 🎯 Features

- Dynamic puzzles with operator rows and symbol sequences
- Timer, score tracking, and progress visualization
- Rules and hints built into UI
- Responsive layout for desktop use

## 📁 Project Structure

```
index.html               # main entry point
styles/
  └── style.css          # stylesheet for layout and visuals
js/
  ├── game.js            # primary game logic and state management
  ├── puzzleGenerator.js # creates new source/target/operator sets
  ├── timer.js           # countdown and timeout handling
  ├── uiRenderer.js      # DOM updates and rendering helpers
  ├── validator.js       # checks player answers and updates score
  └── operator.js        # utility for parsing operator definitions

```

## 🚀 Getting Started

1. **Clone or download** the repository to your local machine.
2. Open `index.html` in a modern web browser (Chrome/Firefox/Edge).
3. Read the rules, then click **Start Assessment** to begin.

> ℹ️ No build tools or server required – it's a static HTML/JS/CSS project.

## 🛠️ Development

- Edit JavaScript files in `js/` to modify game behavior.
- Add new styles in `styles/style.css`.
- You can serve the folder with a simple HTTP server (e.g., `npx http-server`) if desired.

## 📝 Contributing

Feel free to fork the project and submit pull requests for:

- Additional puzzle types
- Performance improvements
- Mobile responsiveness


---

*Switch Challenge Trainer* was created as part of a game‑based aptitude project. Enjoy solving the symbol puzzles!