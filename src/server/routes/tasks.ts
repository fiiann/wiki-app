import { Hono } from 'hono'
import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { join } from 'path'
import { parseTask, serializeTask } from '../lib/markdown'
import { slugify } from '../../lib/slugify'
import type { Task } from '../../../types'

export function createTasksRouter(tasksDir: string) {
  const tasks = new Hono()

  tasks.get('/', async (c) => {
    const { status, project, priority } = c.req.query()
    let files: string[]
    try {
      files = await readdir(tasksDir)
    } catch {
      return c.json([])
    }
    const results: Task[] = []
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const content = await readFile(join(tasksDir, file), 'utf-8')
      const task = parseTask(content, file.slice(0, -3))
      if (status && task.status !== status) continue
      if (project && task.project !== project) continue
      if (priority && task.priority !== priority) continue
      results.push(task)
    }
    results.sort((a, b) => b.created.localeCompare(a.created))
    return c.json(results)
  })

  tasks.get('/:id', async (c) => {
    const id = c.req.param('id')
    try {
      const content = await readFile(join(tasksDir, `${id}.md`), 'utf-8')
      return c.json(parseTask(content, id))
    } catch {
      return c.json({ error: 'Not found' }, 404)
    }
  })

  tasks.post('/', async (c) => {
    const body = await c.req.json<Omit<Task, 'id' | 'created'>>()
    const today = todayStr()
    const slug = slugify(body.title)
    const id = `${today}-${slug}`
    const task: Task = { ...body, id, created: today }
    await writeFile(join(tasksDir, `${id}.md`), serializeTask(task), 'utf-8')
    return c.json(task, 201)
  })

  tasks.put('/:id', async (c) => {
    const id = c.req.param('id')
    const filePath = join(tasksDir, `${id}.md`)
    try {
      const content = await readFile(filePath, 'utf-8')
      const existing = parseTask(content, id)
      const updates = await c.req.json<Partial<Task>>()
      const updated: Task = { ...existing, ...updates, id }
      await writeFile(filePath, serializeTask(updated), 'utf-8')
      return c.json(updated)
    } catch {
      return c.json({ error: 'Not found' }, 404)
    }
  })

  tasks.delete('/:id', async (c) => {
    const id = c.req.param('id')
    try {
      await unlink(join(tasksDir, `${id}.md`))
      return c.json({ deleted: id })
    } catch {
      return c.json({ error: 'Not found' }, 404)
    }
  })

  function todayStr(): string {
    return new Date().toISOString().split('T')[0]
  }

  return tasks
}

const wikiRoot = process.env.WIKI_ROOT ?? '/home/ubuntu/wiki'
await mkdir(join(wikiRoot, 'tasks'), { recursive: true })
const tasks = createTasksRouter(join(wikiRoot, 'tasks'))
export default tasks
