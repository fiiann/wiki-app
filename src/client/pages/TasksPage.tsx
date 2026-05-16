import { useState, useEffect } from 'react'
import KanbanBoard from '../components/KanbanBoard'
import TaskPreviewModal from '../components/TaskPreviewModal'
import { tasksApi, projectsApi } from '../lib/api'
import type { Task, TaskStatus, Project } from '../../../types'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterProject, setFilterProject] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null | undefined>(undefined)

  const load = async () => {
    const results = await tasksApi.list()
    setTasks(results)
  }

  useEffect(() => {
    load().catch(console.error)
    projectsApi.list().then(setProjects).catch(console.error)
  }, [])


  const filtered = tasks.filter((t) => {
    if (filterProject && t.project !== filterProject) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const updated = await tasksApi.update(id, { status })
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const handleSave = async (data: Partial<Task> & { title: string }) => {
    if (activeTask) {
      const updated = await tasksApi.update(activeTask.id, data)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } else {
      const created = await tasksApi.create({
        status: 'todo',
        priority: 'medium',
        due: null,
        project: null,
        tags: [],
        body: '',
        ...data
      })
      setTasks((prev) => [...prev, created])
    }
  }

  const handleDelete = async (id: string) => {
    await tasksApi.remove(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="tasks-page">
      <div className="tasks-toolbar">
        <span className="tasks-toolbar-title">Tasks</span>
        <div className="tasks-filters">
          <select
            className="filter-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button className="btn-new-task" onClick={() => setActiveTask(null)}>
          + New Task
        </button>
      </div>

      <KanbanBoard
        tasks={filtered}
        onOpen={(task) => setActiveTask(task)}
        onStatusChange={handleStatusChange}
      />

      {activeTask !== undefined && (
        <TaskPreviewModal
          task={activeTask}
          projects={projects}
          onSave={handleSave}
          onDelete={activeTask ? handleDelete : undefined}
          onClose={() => setActiveTask(undefined)}
        />
      )}
    </div>
  )
}
