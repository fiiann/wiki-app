import { Hono } from 'hono'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { slugify } from '../../lib/slugify'
import type { Project } from '../../../types'

export function createProjectsRouter(wikiRoot: string) {
  const router = new Hono()
  const filePath = join(wikiRoot, 'projects.json')

  async function readProjects(): Promise<Project[]> {
    try { return JSON.parse(await readFile(filePath, 'utf-8')) }
    catch { return [] }
  }

  async function saveProjects(projects: Project[]) {
    await writeFile(filePath, JSON.stringify(projects, null, 2), 'utf-8')
  }

  router.get('/', async (c) => c.json(await readProjects()))

  router.post('/', async (c) => {
    const { name } = await c.req.json<{ name: string }>()
    const id = slugify(name)
    const projects = await readProjects()
    if (projects.find((p) => p.id === id))
      return c.json({ error: 'Project already exists' }, 409)
    const project: Project = { id, name }
    await saveProjects([...projects, project])
    return c.json(project, 201)
  })

  router.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name } = await c.req.json<{ name: string }>()
    const projects = await readProjects()
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return c.json({ error: 'Not found' }, 404)
    projects[idx] = { id, name }
    await saveProjects(projects)
    return c.json(projects[idx])
  })

  router.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const projects = await readProjects()
    const next = projects.filter((p) => p.id !== id)
    if (next.length === projects.length) return c.json({ error: 'Not found' }, 404)
    await saveProjects(next)
    return c.json({ deleted: id })
  })

  return router
}

const wikiRoot = process.env.WIKI_ROOT ?? '/home/ubuntu/wiki'
export default createProjectsRouter(wikiRoot)
