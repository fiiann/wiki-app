import matter from 'gray-matter'
import type { WikiFile, Task, Project } from '../../../types'

export function parseWikiFile(content: string, path: string): WikiFile {
  const { data, content: body } = matter(content)
  const formatDate = (d: unknown): string => {
    if (!d) return ''
    if (d instanceof Date) return d.toISOString().split('T')[0]
    return String(d)
  }
  return {
    path,
    title: String(data.title ?? ''),
    created: formatDate(data.created),
    updated: formatDate(data.updated),
    domain: data.domain ?? 'personal',
    type: data.type ?? 'concept',
    tags: Array.isArray(data.tags) ? data.tags : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
    body: body.trim()
  }
}

export function serializeWikiFile(file: WikiFile): string {
  const { body, path, ...frontmatter } = file
  return matter.stringify('\n' + body, frontmatter)
}

export function parseTask(content: string, id: string): Task {
  const { data, content: body } = matter(content)
  const formatDate = (d: unknown): string => {
    if (!d) return ''
    if (d instanceof Date) return d.toISOString().split('T')[0]
    return String(d)
  }
  return {
    id,
    title: String(data.title ?? ''),
    status: data.status ?? 'todo',
    priority: data.priority ?? 'medium',
    due: data.due ? formatDate(data.due) : null,
    project: data.project ? String(data.project) : null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    created: formatDate(data.created),
    body: body.trim()
  }
}

export function serializeTask(task: Task): string {
  const { body, id, ...frontmatter } = task
  return matter.stringify('\n' + body, frontmatter)
}

export function parseProject(content: string, id: string): Project {
  const { data } = matter(content)
  const sf = data.shipfast
  return {
    id,
    name: String(data.name ?? ''),
    shipfast: sf
      ? {
          enabled: Boolean(sf.enabled),
          startDate: String(sf.startDate ?? ''),
          platform: Array.isArray(sf.platform) ? sf.platform.map(String) : [],
          techStack: String(sf.techStack ?? ''),
          monetization: String(sf.monetization ?? ''),
          currentPhase: Number(sf.currentPhase ?? 1),
          activatedPhases: Array.isArray(sf.activatedPhases)
            ? sf.activatedPhases.map(Number)
            : [],
        }
      : undefined,
  }
}

export function serializeProject(project: Project): string {
  const { id, ...rest } = project
  const frontmatter = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined)
  )
  return matter.stringify('', frontmatter)
}
