import { useState, useEffect } from 'react'
import { projectsApi, tasksApi } from '../lib/api'
import KanbanBoard from '../components/KanbanBoard'
import TaskPreviewModal from '../components/TaskPreviewModal'
import { useShipFast } from '../hooks/useShipFast'
import { SHIPFAST_PHASES } from '../data/shipfast'
import type { Project, Task, TaskStatus, ShipFastMeta } from '../../../types'

const PLATFORM_OPTIONS = ['iOS', 'Android', 'Web', 'All']
const STACK_OPTIONS = ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Next.js']
const MONETIZATION_OPTIONS = ['Free+Ads', 'One-time', 'Freemium', 'Subscription']

const todayStr = () => new Date().toISOString().split('T')[0]

// ── ShipFast panel sub-component ─────────────────────────────────────────────

interface ShipFastPanelProps {
  project: Project
  phaseProgress: Record<number, { total: number; done: number; pct: number }>
  dayCount: number
  onActivatePhase: (phaseId: number) => Promise<void>
}

function ShipFastPanel({
  project,
  phaseProgress,
  dayCount,
  onActivatePhase,
}: ShipFastPanelProps) {
  const sf = project.shipfast!
  const [activating, setActivating] = useState<number | null>(null)
  const currentPhase = SHIPFAST_PHASES.find((p) => p.id === sf.currentPhase)!

  const handleActivate = async (phaseId: number) => {
    setActivating(phaseId)
    try {
      await onActivatePhase(phaseId)
    } finally {
      setActivating(null)
    }
  }

  return (
    <div className="sf-panel">
      <div className="sf-header">
        <span className="sf-title">🚀 ShipFast</span>
        <span className="sf-day">Day {dayCount} / 14</span>
        <div className="sf-meta-chips">
          {sf.platform.map((p) => (
            <span key={p} className="sf-meta-chip">{p}</span>
          ))}
          <span className="sf-meta-chip">{sf.techStack}</span>
          <span className="sf-meta-chip">{sf.monetization}</span>
        </div>
      </div>

      <div className="sf-phases">
        {SHIPFAST_PHASES.map((phase) => {
          const prog = phaseProgress[phase.id]
          const isActivated = sf.activatedPhases.includes(phase.id)
          const isActivating = activating === phase.id
          return (
            <div
              key={phase.id}
              className={`sf-phase-col ${sf.currentPhase === phase.id ? 'sf-phase-active' : ''}`}
            >
              <div className="sf-phase-name" style={{ color: phase.color }}>
                {phase.name}
              </div>
              <div className="sf-phase-days">{phase.days}</div>
              <div className="sf-progress-track">
                <div
                  className="sf-progress-fill"
                  style={{ width: `${prog.pct}%`, background: phase.color }}
                />
              </div>
              <div className="sf-progress-pct">{prog.pct}%</div>
              {!isActivated ? (
                <button
                  className="sf-generate-btn"
                  disabled={isActivating}
                  onClick={() => handleActivate(phase.id)}
                >
                  {isActivating ? '…' : 'Generate Tasks'}
                </button>
              ) : (
                <span className="sf-activated-badge">✓ Generated</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="sf-current-phase">
        <span className="sf-current-label">
          Active: Phase {currentPhase.id} — {currentPhase.name} ({currentPhase.days})
        </span>
        <span className="sf-gate">Gate: {currentPhase.gate}</span>
        <span className="sf-summary">{currentPhase.summary}</span>
      </div>
    </div>
  )
}

// ── Main page component ───────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null | undefined>(undefined)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showEnableForm, setShowEnableForm] = useState(false)
  const [enableForm, setEnableForm] = useState({
    startDate: todayStr(),
    platform: [] as string[],
    techStack: '',
    monetization: '',
  })

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setProjectTasks([])
      return
    }
    tasksApi.list({ project: selectedProject.id }).then(setProjectTasks).catch(console.error)
  }, [selectedProject?.id])

  const { phaseProgress, activatePhase, enableShipFast, isShipFastProject, dayCount } =
    useShipFast(selectedProject ?? { id: '', name: '' }, projectTasks)

  const handleSelectProject = (p: Project) => {
    setSelectedProject(p)
    setShowEnableForm(false)
  }

  const handleBack = () => {
    setSelectedProject(null)
    setShowEnableForm(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      const created = await projectsApi.create(newName.trim())
      setProjects((prev) => [...prev, created])
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return
    const updated = await projectsApi.update(id, editName.trim())
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    if (selectedProject?.id === id) setSelectedProject(updated)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return
    await projectsApi.remove(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (selectedProject?.id === id) setSelectedProject(null)
  }

  const handleEnableShipFast = async () => {
    if (
      !selectedProject ||
      !enableForm.techStack ||
      !enableForm.monetization ||
      enableForm.platform.length === 0
    )
      return
    const meta: ShipFastMeta = {
      enabled: true,
      startDate: enableForm.startDate,
      platform: enableForm.platform,
      techStack: enableForm.techStack,
      monetization: enableForm.monetization,
      currentPhase: 1,
      activatedPhases: [],
    }
    const updated = await enableShipFast(meta)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedProject(updated)
    setShowEnableForm(false)
  }

  const handleActivatePhase = async (phaseId: number) => {
    if (!selectedProject) return
    const { tasks: newTasks, project: updatedProject } = await activatePhase(phaseId)
    setProjectTasks((prev) => [...prev, ...newTasks])
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
    setSelectedProject(updatedProject)
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const updated = await tasksApi.update(id, { status })
    setProjectTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const handleTaskSave = async (data: Partial<Task> & { title: string }) => {
    if (!selectedProject) return
    if (activeTask) {
      const updated = await tasksApi.update(activeTask.id, data)
      setProjectTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } else {
      const created = await tasksApi.create({
        status: 'todo',
        priority: 'medium',
        due: null,
        project: selectedProject.id,
        tags: [],
        body: '',
        ...data,
      })
      setProjectTasks((prev) => [...prev, created])
    }
  }

  const handleTaskDelete = async (id: string) => {
    await tasksApi.remove(id)
    setProjectTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // ── Detail view ─────────────────────────────────────────────────────────────

  if (selectedProject) {
    return (
      <div className="projects-page">
        <div className="tasks-toolbar">
          <button className="sf-back-btn" onClick={handleBack}>
            ← Back
          </button>
          {editingId === selectedProject.id ? (
            <>
              <input
                autoFocus
                className="task-dialog-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(selectedProject.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
              <button className="btn-primary" onClick={() => handleSaveEdit(selectedProject.id)}>
                Save
              </button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <span className="tasks-toolbar-title">{selectedProject.name}</span>
              <span className="project-id">{selectedProject.id}</span>
              <button
                onClick={() => {
                  setEditingId(selectedProject.id)
                  setEditName(selectedProject.name)
                }}
              >
                Edit
              </button>
              <button onClick={() => handleDelete(selectedProject.id)}>Delete</button>
            </>
          )}
          <button className="btn-new-task" onClick={() => setActiveTask(null)}>
            + New Task
          </button>
        </div>

        {!isShipFastProject && !showEnableForm && (
          <div className="sf-enable-bar">
            <button className="sf-enable-btn" onClick={() => setShowEnableForm(true)}>
              Enable ShipFast 🚀
            </button>
          </div>
        )}

        {showEnableForm && (
          <div className="sf-enable-form">
            <div className="sf-enable-form-title">Setup ShipFast 🚀</div>
            <div className="sf-form-row">
              <label className="sf-form-label">Start Date</label>
              <input
                type="date"
                className="task-dialog-input"
                value={enableForm.startDate}
                onChange={(e) =>
                  setEnableForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="sf-form-row">
              <label className="sf-form-label">Platform</label>
              <div className="sf-chips">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    className={`sf-chip ${enableForm.platform.includes(p) ? 'sf-chip-active' : ''}`}
                    onClick={() =>
                      setEnableForm((prev) => ({
                        ...prev,
                        platform: prev.platform.includes(p)
                          ? prev.platform.filter((x) => x !== p)
                          : [...prev.platform, p],
                      }))
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-form-row">
              <label className="sf-form-label">Tech Stack</label>
              <div className="sf-chips">
                {STACK_OPTIONS.map((s) => (
                  <button
                    key={s}
                    className={`sf-chip ${enableForm.techStack === s ? 'sf-chip-active' : ''}`}
                    onClick={() =>
                      setEnableForm((prev) => ({ ...prev, techStack: s }))
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-form-row">
              <label className="sf-form-label">Monetization</label>
              <div className="sf-chips">
                {MONETIZATION_OPTIONS.map((m) => (
                  <button
                    key={m}
                    className={`sf-chip ${enableForm.monetization === m ? 'sf-chip-active' : ''}`}
                    onClick={() =>
                      setEnableForm((prev) => ({ ...prev, monetization: m }))
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-form-actions">
              <button
                className="btn-primary"
                onClick={handleEnableShipFast}
                disabled={
                  !enableForm.techStack ||
                  !enableForm.monetization ||
                  enableForm.platform.length === 0
                }
              >
                Enable ShipFast
              </button>
              <button onClick={() => setShowEnableForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {isShipFastProject && selectedProject.shipfast && (
          <ShipFastPanel
            project={selectedProject}
            phaseProgress={phaseProgress}
            dayCount={dayCount}
            onActivatePhase={handleActivatePhase}
          />
        )}

        <KanbanBoard
          tasks={projectTasks}
          onOpen={(task) => setActiveTask(task)}
          onStatusChange={handleStatusChange}
        />

        {activeTask !== undefined && (
          <TaskPreviewModal
            task={activeTask}
            projects={projects}
            onSave={handleTaskSave}
            onDelete={activeTask ? handleTaskDelete : undefined}
            onClose={() => setActiveTask(undefined)}
          />
        )}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────

  return (
    <div className="projects-page">
      <div className="tasks-toolbar">
        <span className="tasks-toolbar-title">Projects</span>
      </div>
      <div className="projects-list">
        {projects.length === 0 && (
          <p className="task-preview-empty">No projects yet.</p>
        )}
        {projects.map((p) => (
          <div key={p.id} className="project-item">
            {editingId === p.id ? (
              <>
                <input
                  autoFocus
                  className="task-dialog-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(p.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <button className="btn-primary" onClick={() => handleSaveEdit(p.id)}>
                  Save
                </button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <button
                  className="project-name-link"
                  onClick={() => handleSelectProject(p)}
                >
                  {p.name}
                  {p.shipfast?.enabled && <span className="sf-badge"> 🚀</span>}
                </button>
                <span className="project-id">{p.id}</span>
                <button
                  onClick={() => {
                    setEditingId(p.id)
                    setEditName(p.name)
                  }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
      <form className="project-add-form" onSubmit={handleAdd}>
        <input
          className="task-dialog-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name"
        />
        <button
          type="submit"
          className="btn-new-task"
          disabled={!newName.trim() || adding}
        >
          {adding ? 'Adding…' : '+ Add Project'}
        </button>
      </form>
    </div>
  )
}
