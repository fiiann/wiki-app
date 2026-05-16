import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import type { Task, Comment } from '../../../types'
import { commentsApi } from '../lib/api'

interface Props {
  task: Task
  onEdit: () => void
  onClose: () => void
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#5a7a5a',
  medium: '#7a7a5a',
  high: '#c47a3a',
  urgent: '#c44a4a'
}

const STATUS_COLOR: Record<string, string> = {
  'todo': '#888',
  'in-progress': '#7ec8e3',
  'done': '#7ec86d',
  'cancelled': '#555'
}

export default function TaskPreviewModal({ task, onEdit, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    commentsApi.list(task.id).then(setComments).catch(console.error)
  }, [task.id])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
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
    await commentsApi.remove(task.id, commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-preview-modal" onClick={(e) => e.stopPropagation()}>

        <div className="task-preview-header">
          <h2 className="task-preview-title">{task.title}</h2>
          <div className="task-preview-header-actions">
            <button className="btn-edit-task" onClick={onEdit}>Edit</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="task-preview-meta">
          <span className="preview-badge" style={{ color: STATUS_COLOR[task.status] }}>
            {task.status}
          </span>
          <span className="preview-badge" style={{ color: PRIORITY_COLOR[task.priority] }}>
            {task.priority}
          </span>
          {task.due && (
            <span className="preview-meta-item">Due: {task.due}</span>
          )}
          {task.project && (
            <span className="preview-meta-item">{task.project}</span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="preview-tag">{tag}</span>
          ))}
        </div>

        <div className="task-preview-body">
          {task.body.trim() ? (
            <div className="task-preview-content markdown-body">
              <Markdown>{task.body}</Markdown>
            </div>
          ) : (
            <p className="task-preview-empty">No description.</p>
          )}

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
                className="btn-primary"
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? 'Adding…' : 'Add Comment'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
