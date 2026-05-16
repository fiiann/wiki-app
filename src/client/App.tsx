import { useState } from 'react'
import WikiPage from './pages/WikiPage'
import TasksPage from './pages/TasksPage'
import ProjectsPage from './pages/ProjectsPage'

type Mode = 'wiki' | 'tasks' | 'projects'

export default function App() {
  const [mode, setMode] = useState<Mode>('wiki')

  return (
    <div className="app">
      <nav className="top-nav">
        <span className="app-name">WikiApp</span>
        <div className="nav-links">
          <button
            className={`nav-btn ${mode === 'wiki' ? 'active' : ''}`}
            onClick={() => setMode('wiki')}
          >
            Wiki
          </button>
          <button
            className={`nav-btn ${mode === 'tasks' ? 'active-tasks' : ''}`}
            onClick={() => setMode('tasks')}
          >
            Tasks
          </button>
          <button
            className={`nav-btn ${mode === 'projects' ? 'active' : ''}`}
            onClick={() => setMode('projects')}
          >
            Projects
          </button>
        </div>
      </nav>
      <main className="main-content">
        {mode === 'wiki' ? <WikiPage /> : mode === 'tasks' ? <TasksPage /> : <ProjectsPage />}
      </main>
    </div>
  )
}
