import type { Task, TaskStatus } from '../../../types'

interface Props {
  task: Task
  onPreview: (task: Task) => void
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  'todo': 'in-progress',
  'in-progress': 'done',
  'done': 'cancelled',
  'cancelled': 'todo'
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#5a7a5a',
  medium: '#7a7a5a',
  high: '#c47a3a',
  urgent: '#c44a4a'
}

export default function TaskCard({ task, onPreview, onEdit, onStatusChange }: Props) {
  return (
    <div className="task-card" onClick={() => onPreview(task)}>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        <span
          className="task-priority-badge"
          style={{ color: PRIORITY_COLOR[task.priority] ?? '#888' }}
        >
          {task.priority}
        </span>
        {task.due && <span className="task-due">{task.due}</span>}
        {task.project && <span className="task-project">{task.project}</span>}
      </div>
      <div className="task-card-actions">
        <button
          className="task-edit-btn"
          title="Edit task"
          onClick={(e) => { e.stopPropagation(); onEdit(task) }}
        >
          ✎
        </button>
        <button
          className="task-advance-btn"
          title={`Move to ${NEXT_STATUS[task.status]}`}
          onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, NEXT_STATUS[task.status]) }}
        >
          →
        </button>
      </div>
    </div>
  )
}
