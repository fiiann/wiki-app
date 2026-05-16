import KanbanColumn from './KanbanColumn'
import type { Task, TaskStatus } from '../../../types'

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done', 'cancelled']

interface Props {
  tasks: Task[]
  onPreview: (task: Task) => void
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

export default function KanbanBoard({ tasks, onPreview, onEdit, onStatusChange }: Props) {
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s, tasks.filter((t) => t.status === s)])
  ) as Record<TaskStatus, Task[]>

  return (
    <div className="kanban-board">
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={byStatus[status]}
          onPreview={onPreview}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}
