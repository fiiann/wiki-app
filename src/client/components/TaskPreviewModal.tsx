import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import type { Task, TaskStatus, TaskPriority, Comment } from '../../../types'
import { commentsApi } from '../lib/api'

interface Props {
  task: Task | null
  onSave: (data: Partial<Task> & { title: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}

type FormState = {
  title: string
  status: TaskStatus
  priority: TaskPriority
  due: string
  project: string
  tags: string
  body: string
}

const EMPTY: FormState = {
  title: '', status: 'todo', priority: 'medium',
  due: '', project: '', tags: '', body: ''
}

function taskToForm(task: Task): FormState {
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    due: task.due ?? '',
    project: task.project ?? '',
    tags: task.tags.join(', '),
    body: task.body
  }
}

export default function TaskPreviewModal({ task, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<FormState>(task ? taskToForm(task) : EMPTY)
  const [bodyTab, setBodyTab] = useState<'edit' | 'preview'>(
    task?.body.trim() ? 'preview' : 'edit'
  )
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!task) return
    commentsApi.list(task.id).then(setComments).catch(console.error)
  }, [task?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({
      title: form.title.trim(),
      status: form.status,
      priority: form.priority,
      due: form.due || null,
      project: form.project || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      body: form.body
    })
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

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return
    setSubmitting(true)
    try {
      const created = await commentsApi.create(task.id, newComment)
      setComments((prev) => [...prev, created])
      setNewComment('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return
    await commentsApi.remove(task.id, commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="task-dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>

        <div className="task-dialog-header">
          <input
            autoFocus
            className="task-dialog-title-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Task title"
          />
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="task-dialog-meta">
          <select
            className="task-dialog-select"
            value={form.status}
            onChange={(e) => set('status', e.target.value as TaskStatus)}
          >
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="task-dialog-select"
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <input
            type="date"
            className="task-dialog-input"
            value={form.due}
            onChange={(e) => set('due', e.target.value)}
            title="Due date"
          />

          <input
            className="task-dialog-input"
            value={form.project}
            onChange={(e) => set('project', e.target.value)}
            placeholder="Project"
            title="Project"
          />

          <input
            className="task-dialog-input task-dialog-tags"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="Tags (comma-separated)"
            title="Tags"
          />
        </div>

        <div className="task-preview-body">

          <div className="task-dialog-body-section">
            <div className="task-dialog-tabs">
              <button
                type="button"
                className={`task-dialog-tab ${bodyTab === 'edit' ? 'active' : ''}`}
                onClick={() => setBodyTab('edit')}
              >
                Edit
              </button>
              <button
                type="button"
                className={`task-dialog-tab ${bodyTab === 'preview' ? 'active' : ''}`}
                onClick={() => setBodyTab('preview')}
              >
                Preview
              </button>
            </div>

            {bodyTab === 'edit' ? (
              <textarea
                className="task-dialog-body-textarea form-input"
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder="Description (markdown supported)"
                rows={10}
              />
            ) : (
              <div className="task-dialog-body-preview markdown-body">
                {form.body.trim()
                  ? <Markdown>{form.body}</Markdown>
                  : <p className="task-preview-empty">No description.</p>
                }
              </div>
            )}
          </div>

          {task && (
            <div className="task-comments">
              <div className="task-comments-header">Comments ({comments.length})</div>

              {comments.length === 0 && (
                <p className="task-preview-empty">No comments yet.</p>
              )}

              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-meta">
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="comment-delete-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      ×
                    </button>
                  </div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              ))}

              <div className="comment-new">
                <textarea
                  className="comment-input form-input"
                  placeholder="Add a comment… (Ctrl+Enter to submit)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment()
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? 'Adding…' : 'Add Comment'}
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="task-dialog-footer">
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
          <button
            type="submit"
            className="btn-primary"
            disabled={!form.title.trim() || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </form>
    </div>
  )
}
