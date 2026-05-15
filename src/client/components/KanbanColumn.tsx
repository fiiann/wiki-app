import TaskCard from './TaskCard'
import type { Task, TaskStatus } from '../../../types'

interface Props {
  status: TaskStatus
  tasks: Task[]
  onOpen: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

const COLUMN_LABEL: Record<TaskStatus, string> = {
  'todo': 'Todo',
  'in-progress': 'In Progress',
  'done': 'Done',
  'cancelled': 'Cancelled'
}

const COLUMN_COLOR: Record<TaskStatus, string> = {
  'todo': '#888',
  'in-progress': '#7ec8e3',
  'done': '#7ec86d',
  'cancelled': '#555'
}

export default function KanbanColumn({ status, tasks, onOpen, onStatusChange }: Props) {
  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span
          className="kanban-column-title"
          style={{ color: COLUMN_COLOR[status] }}
        >
          {COLUMN_LABEL[status]}
        </span>
        <span className="kanban-column-count">{tasks.length}</span>
      </div>
      <div className="kanban-column-body">
        {tasks.length === 0 && (
          <div className="kanban-empty">—</div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onOpen={onOpen}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  )
}
