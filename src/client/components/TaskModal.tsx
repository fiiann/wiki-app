import { useState, useEffect } from 'react'
import type { Task, TaskStatus, TaskPriority } from '../../../types'

interface Props {
  task: Task | null        // null = create mode
  onSave: (data: Partial<Task> & { title: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}

const EMPTY: Omit<Task, 'id' | 'created'> = {
  title: '',
  status: 'todo',
  priority: 'medium',
  due: null,
  project: null,
  tags: [],
  body: ''
}

export default function TaskModal({ task, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<Omit<Task, 'id' | 'created'>>(task ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm(task ?? EMPTY)
  }, [task])

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({ ...form, title: form.title.trim() })
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!task || !onDelete) return
    if (!confirm(`Delete "${task.title}"?`)) return
    setDeleting(true)
    await onDelete(task.id)
    setDeleting(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="form-label">Title</label>
          <input
            autoFocus
            className="form-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Task title"
          />

          <div className="modal-row">
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="modal-row">
            <div>
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={form.due ?? ''}
                onChange={(e) => set('due', e.target.value || null)}
              />
            </div>
            <div>
              <label className="form-label">Project</label>
              <input
                className="form-input"
                value={form.project ?? ''}
                onChange={(e) => set('project', e.target.value || null)}
                placeholder="e.g. olympus-project"
              />
            </div>
          </div>

          <label className="form-label">Tags (comma-separated)</label>
          <input
            className="form-input"
            value={form.tags.join(', ')}
            onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
            placeholder="bug, auth, frontend"
          />

          <label className="form-label">Notes</label>
          <textarea
            className="form-input modal-notes"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            placeholder="Markdown notes…"
            rows={6}
          />

          <div className="modal-actions">
            {task && onDelete && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!form.title.trim() || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
