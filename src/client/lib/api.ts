import type { WikiFile, WikiFileMeta, Task, Comment, Project, ShipFastMeta } from '../../../types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

function json(body: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }
}

export const wikiApi = {
  list: () =>
    req<WikiFileMeta[]>('/api/wiki/files'),

  get: (path: string) =>
    req<WikiFile>(`/api/wiki/files/${path}`),

  create: (file: Omit<WikiFile, 'created' | 'updated'>) =>
    req<WikiFile>('/api/wiki/files', { method: 'POST', ...json(file) }),

  update: (path: string, data: Partial<WikiFile>) =>
    req<WikiFile>(`/api/wiki/files/${path}`, { method: 'PUT', ...json(data) }),

  remove: (path: string) =>
    req<{ deleted: string }>(`/api/wiki/files/${path}`, { method: 'DELETE' }),
}

export const tasksApi = {
  list: (filters: { status?: string; project?: string; priority?: string } = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    )
    return req<Task[]>(`/api/tasks${params.size ? '?' + params : ''}`)
  },

  get: (id: string) =>
    req<Task>(`/api/tasks/${id}`),

  create: (task: Omit<Task, 'id' | 'created'>) =>
    req<Task>('/api/tasks', { method: 'POST', ...json(task) }),

  update: (id: string, data: Partial<Task>) =>
    req<Task>(`/api/tasks/${id}`, { method: 'PUT', ...json(data) }),

  remove: (id: string) =>
    req<{ deleted: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),
}

export const commentsApi = {
  list: (taskId: string) =>
    req<Comment[]>(`/api/tasks/${taskId}/comments`),

  create: (taskId: string, content: string) =>
    req<Comment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      ...json({ content })
    }),

  remove: (taskId: string, commentId: string) =>
    req<{ deleted: string }>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE'
    }),
}

export const projectsApi = {
  list: () =>
    req<Project[]>('/api/projects'),

  create: (name: string) =>
    req<Project>('/api/projects', { method: 'POST', ...json({ name }) }),

  update: (id: string, name: string) =>
    req<Project>(`/api/projects/${id}`, { method: 'PUT', ...json({ name }) }),

  remove: (id: string) =>
    req<{ deleted: string }>(`/api/projects/${id}`, { method: 'DELETE' }),

  updateShipFast: (id: string, meta: ShipFastMeta) =>
    req<Project>(`/api/projects/${id}/shipfast`, {
      method: 'PUT',
      ...json(meta)
    }),
}
