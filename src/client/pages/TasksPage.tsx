import { useState, useEffect } from 'react'
import KanbanBoard from '../components/KanbanBoard'
import TaskModal from '../components/TaskModal'
import TaskPreviewModal from '../components/TaskPreviewModal'
import { tasksApi } from '../lib/api'
import type { Task, TaskStatus } from '../../../types'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filterProject, setFilterProject] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [previewTask, setPreviewTask] = useState<Task | undefined>(undefined)
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined)
  // modalTask: undefined = closed, null = new task, Task = edit task

  const load = async () => {
    const results = await tasksApi.list()
    setTasks(results)
  }

  useEffect(() => { load().catch(console.error) }, [])

  const projects = [...new Set(tasks.map((t) => t.project).filter(Boolean))] as string[]

  const filtered = tasks.filter((t) => {
    if (filterProject && t.project !== filterProject) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const updated = await tasksApi.update(id, { status })
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    if (previewTask?.id === id) setPreviewTask(updated)
  }

  const handleSave = async (data: Partial<Task> & { title: string }) => {
    if (modalTask) {
      const updated = await tasksApi.update(modalTask.id, data)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      if (previewTask?.id === updated.id) setPreviewTask(updated)
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
    if (previewTask?.id === id) setPreviewTask(undefined)
  }

  const handleEdit = (task: Task) => {
    setPreviewTask(undefined)
    setModalTask(task)
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
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
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
        <button className="btn-new-task" onClick={() => setModalTask(null)}>
          + New Task
        </button>
      </div>

      <KanbanBoard
        tasks={filtered}
        onPreview={(task) => setPreviewTask(task)}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
      />

      {previewTask && (
        <TaskPreviewModal
          task={previewTask}
          onEdit={() => handleEdit(previewTask)}
          onClose={() => setPreviewTask(undefined)}
        />
      )}

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onDelete={modalTask ? handleDelete : undefined}
          onClose={() => setModalTask(undefined)}
        />
      )}
    </div>
  )
}
