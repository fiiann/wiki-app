import KanbanColumn from './KanbanColumn'
import type { Task, TaskStatus } from '../../../types'

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done', 'cancelled']

interface Props {
  tasks: Task[]
  onOpen: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

export default function KanbanBoard({ tasks, onOpen, onStatusChange }: Props) {
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
          onOpen={onOpen}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}
