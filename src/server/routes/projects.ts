import { Hono } from 'hono'
import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { join } from 'path'
import { slugify } from '../../lib/slugify'
import { parseProject, serializeProject } from '../lib/markdown'
import type { Project, ShipFastMeta } from '../../../types'

export function createProjectsRouter(wikiRoot: string) {
  const router = new Hono()
  const projectsDir = join(wikiRoot, 'projects')

  async function readProjects(): Promise<Project[]> {
    let files: string[]
    try {
      files = await readdir(projectsDir)
    } catch {
      return []
    }
    const results: Project[] = []
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const content = await readFile(join(projectsDir, file), 'utf-8')
      results.push(parseProject(content, file.slice(0, -3)))
    }
    return results
  }

  async function readProject(id: string): Promise<Project> {
    const content = await readFile(join(projectsDir, `${id}.md`), 'utf-8')
    return parseProject(content, id)
  }

  async function saveProject(project: Project): Promise<void> {
    await mkdir(projectsDir, { recursive: true })
    await writeFile(
      join(projectsDir, `${project.id}.md`),
      serializeProject(project),
      'utf-8'
    )
  }

  router.get('/', async (c) => c.json(await readProjects()))

  router.post('/', async (c) => {
    const { name } = await c.req.json<{ name: string }>()
    const id = slugify(name)
    const projects = await readProjects()
    if (projects.find((p) => p.id === id))
      return c.json({ error: 'Project already exists' }, 409)
    const project: Project = { id, name }
    await saveProject(project)
    return c.json(project, 201)
  })

  router.put('/:id/shipfast', async (c) => {
    const id = c.req.param('id')
    const meta = await c.req.json<ShipFastMeta>()
    try {
      const existing = await readProject(id)
      const updated: Project = { ...existing, shipfast: meta }
      await saveProject(updated)
      return c.json(updated)
    } catch {
      return c.json({ error: 'Not found' }, 404)
    }
  })

  router.put('/:id', async (c) => {
    const id = c.req.param('id')
    const { name } = await c.req.json<{ name: string }>()
    try {
      const existing = await readProject(id)
      const updated: Project = { ...existing, name }
      await saveProject(updated)
      return c.json(updated)
    } catch {
      return c.json({ error: 'Not found' }, 404)
    }
  })

  router.delete('/:id', async (c) => {
    const id = c.req.param('id')
    try {
      await unlink(join(projectsDir, `${id}.md`))
      return c.json({ deleted: id })
    } catch {
      return c.json({ error: 'Not found' }, 404)
    }
  })

  return router
}

const wikiRoot = process.env.WIKI_ROOT ?? '/home/ubuntu/wiki'
export default createProjectsRouter(wikiRoot)
