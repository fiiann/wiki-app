import { useEffect } from 'react'
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom'
import WikiPage from './pages/WikiPage'
import TasksPage from './pages/TasksPage'
import ProjectsPage from './pages/ProjectsPage'

function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="top-nav">
      <span className="app-name">WikiApp</span>
      <div className="nav-links">
        <button
          className={`nav-btn ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          Wiki
        </button>
        <button
          className={`nav-btn ${isActive('/tasks') ? 'active-tasks' : ''}`}
          onClick={() => navigate('/tasks')}
        >
          Tasks
        </button>
        <button
          className={`nav-btn ${isActive('/projects') ? 'active' : ''}`}
          onClick={() => navigate('/projects')}
        >
          Projects
        </button>
      </div>
    </nav>
  )
}

// Project detail wrapper that reads project ID from URL and renders ProjectsPage
function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  return <ProjectsPage initialProjectId={id} />
}

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<WikiPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}