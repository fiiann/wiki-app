import { useMemo, useRef } from 'react'
import { tasksApi, projectsApi } from '../lib/api'
import { SHIPFAST_PHASES } from '../data/shipfast'
import { projectAcronym } from '../../lib/acronym'
import type { Project, Task, ShipFastMeta } from '../../../types'

// Sequence counter per project — persists across re-renders within session
const seqMap = new Map<string, number>()

export function useShipFast(project: Project, tasks: Task[]) {
  const isShipFastProject = project.shipfast?.enabled === true

  const dayCount = useMemo(() => {
    if (!project.shipfast?.startDate) return 0
    const start = new Date(project.shipfast.startDate)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(Math.max(diff + 1, 1), 14)
  }, [project.shipfast?.startDate])

  const phaseProgress = useMemo(() => {
    const progress: Record<number, { total: number; done: number; pct: number }> = {}
    for (let i = 1; i <= 5; i++) {
      const phaseTasks = tasks.filter(
        (t) =>
          t.project === project.id &&
          t.tags.includes('shipfast') &&
          t.tags.includes(`phase-${i}`)
      )
      const done = phaseTasks.filter((t) => t.status === 'done').length
      const total = phaseTasks.length
      progress[i] = {
        total,
        done,
        pct: total === 0 ? 0 : Math.round((done / total) * 100),
      }
    }
    return progress
  }, [tasks, project.id])

  const enableShipFast = async (meta: ShipFastMeta): Promise<Project> => {
    return projectsApi.updateShipFast(project.id, meta)
  }

  const activatePhase = async (
    phaseId: number
  ): Promise<{ tasks: Task[]; project: Project }> => {
    if (!project.shipfast) throw new Error('ShipFast not enabled')
    if (project.shipfast.activatedPhases.includes(phaseId)) {
      return { tasks: [], project }
    }
    const phase = SHIPFAST_PHASES.find((p) => p.id === phaseId)
    if (!phase) throw new Error(`Phase ${phaseId} not found`)

    // Init sequence counter for this project
    if (!seqMap.has(project.id)) {
      seqMap.set(project.id, 1)
    }

    const acronym = projectAcronym(project.name)
    const created: Task[] = []
    for (const item of phase.checklist) {
      const seq = seqMap.get(project.id)!
      const idStr = `${acronym}-${String(seq).padStart(3, '0')}`
      const title = `${idStr}: ${item.text}`
      seqMap.set(project.id, seq + 1)

      const task = await tasksApi.create({
        title,
        project: project.id,
        tags: ['shipfast', `phase-${phaseId}`],
        status: 'todo',
        priority: 'medium',
        due: null,
        body: '',
      })
      created.push(task)
    }

    const updatedMeta: ShipFastMeta = {
      ...project.shipfast,
      activatedPhases: [...project.shipfast.activatedPhases, phaseId],
    }
    const updatedProject = await projectsApi.updateShipFast(project.id, updatedMeta)
    return { tasks: created, project: updatedProject }
  }

  return { phaseProgress, activatePhase, enableShipFast, isShipFastProject, dayCount }
}