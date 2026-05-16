import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createTasksRouter } from './tasks'
import { writeFile, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { serializeTask } from '../lib/markdown'

let tmpDir: string
let router: ReturnType<typeof createTasksRouter>

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tasks-test-'))
  router = createTasksRouter(tmpDir)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('Tasks Routes', () => {
  describe('GET /', () => {
    it('returns empty list for empty directory', async () => {
      const req = new Request('http://localhost/')
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('lists all tasks sorted by created descending', async () => {
      const task1 = {
        id: '2026-05-14-task1',
        title: 'Older Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-14',
        body: 'Content'
      }
      await writeFile(join(tmpDir, '2026-05-14-task1.md'), serializeTask(task1), 'utf-8')

      const task2 = {
        id: '2026-05-15-task2',
        title: 'Newer Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: 'Content'
      }
      await writeFile(join(tmpDir, '2026-05-15-task2.md'), serializeTask(task2), 'utf-8')

      const req = new Request('http://localhost/')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(2)
      expect(data[0].id).toBe('2026-05-15-task2')
      expect(data[1].id).toBe('2026-05-14-task1')
    })

    it('filters by status', async () => {
      const task1 = {
        id: '2026-05-15-task1',
        title: 'Todo',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task1.md'), serializeTask(task1), 'utf-8')

      const task2 = {
        id: '2026-05-15-task2',
        title: 'Done',
        status: 'done' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task2.md'), serializeTask(task2), 'utf-8')

      const req = new Request('http://localhost/?status=done')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].status).toBe('done')
    })

    it('filters by project', async () => {
      const task1 = {
        id: '2026-05-15-task1',
        title: 'Project A',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: 'project-a',
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task1.md'), serializeTask(task1), 'utf-8')

      const task2 = {
        id: '2026-05-15-task2',
        title: 'Project B',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: 'project-b',
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task2.md'), serializeTask(task2), 'utf-8')

      const req = new Request('http://localhost/?project=project-a')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].project).toBe('project-a')
    })

    it('filters by priority', async () => {
      const task1 = {
        id: '2026-05-15-task1',
        title: 'Urgent',
        status: 'todo' as const,
        priority: 'urgent' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task1.md'), serializeTask(task1), 'utf-8')

      const task2 = {
        id: '2026-05-15-task2',
        title: 'Low',
        status: 'todo' as const,
        priority: 'low' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task2.md'), serializeTask(task2), 'utf-8')

      const req = new Request('http://localhost/?priority=urgent')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].priority).toBe('urgent')
    })

    it('combines multiple filters with AND logic', async () => {
      const task1 = {
        id: '2026-05-15-task1',
        title: 'Match',
        status: 'todo' as const,
        priority: 'high' as const,
        due: null,
        project: 'p1',
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task1.md'), serializeTask(task1), 'utf-8')

      const task2 = {
        id: '2026-05-15-task2',
        title: 'No Match - Wrong Priority',
        status: 'todo' as const,
        priority: 'low' as const,
        due: null,
        project: 'p1',
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task2.md'), serializeTask(task2), 'utf-8')

      const req = new Request('http://localhost/?status=todo&priority=high&project=p1')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].title).toBe('Match')
    })

    it('returns empty array when no tasks match filter', async () => {
      const req = new Request('http://localhost/?status=done')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('ignores non-markdown files', async () => {
      await writeFile(join(tmpDir, 'ignored.txt'), 'text', 'utf-8')

      const req = new Request('http://localhost/')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(0)
    })
  })

  describe('GET /:id', () => {
    it('returns task by id', async () => {
      const task = {
        id: '2026-05-15-test-task',
        title: 'Test Task',
        status: 'in-progress' as const,
        priority: 'high' as const,
        due: '2026-05-20',
        project: 'proj1',
        tags: ['tag1'],
        created: '2026-05-15',
        body: 'Task notes'
      }
      await writeFile(join(tmpDir, '2026-05-15-test-task.md'), serializeTask(task), 'utf-8')

      const req = new Request('http://localhost/2026-05-15-test-task')
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Test Task')
      expect(data.status).toBe('in-progress')
      expect(data.body).toBe('Task notes')
    })

    it('returns 404 for missing task', async () => {
      const req = new Request('http://localhost/missing-task')
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Not found')
    })
  })

  describe('POST /', () => {
    it('creates task with slug from title', async () => {
      const body = {
        title: 'Fix My Bug',
        status: 'todo' as const,
        priority: 'high' as const,
        due: null,
        project: null,
        tags: [],
        body: ''
      }

      const req = new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.id).toMatch(/^\d{4}-\d{2}-\d{2}-fix-my-bug$/)
      expect(data.title).toBe('Fix My Bug')
    })

    it('stamps created date to today', async () => {
      const body = {
        title: 'Test',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        body: ''
      }

      const req = new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      const data = await res.json()
      const today = new Date().toISOString().split('T')[0]
      expect(data.created).toBe(today)
    })
  })

  describe('PUT /:id', () => {
    it('updates task and pins id from URL', async () => {
      const task = {
        id: '2026-05-15-original',
        title: 'Original',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: 'Original'
      }
      await writeFile(join(tmpDir, '2026-05-15-original.md'), serializeTask(task), 'utf-8')

      const updates = {
        title: 'Updated',
        status: 'done' as const,
        id: 'should-be-ignored'
      }
      const req = new Request('http://localhost/2026-05-15-original', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('2026-05-15-original')
      expect(data.title).toBe('Updated')
      expect(data.status).toBe('done')
    })

    it('returns 404 for missing task', async () => {
      const updates = { title: 'Test' }
      const req = new Request('http://localhost/missing-task', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /:id', () => {
    it('deletes task', async () => {
      const task = {
        id: '2026-05-15-task',
        title: 'Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, '2026-05-15-task.md'), serializeTask(task), 'utf-8')

      const req = new Request('http://localhost/2026-05-15-task', { method: 'DELETE' })
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.deleted).toBe('2026-05-15-task')
    })

    it('returns 404 for missing task', async () => {
      const req = new Request('http://localhost/missing-task', { method: 'DELETE' })
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
    })
  })

  describe('Comment Routes', () => {
    const taskId = '2026-05-15-test-task'

    beforeEach(async () => {
      const task = {
        id: taskId,
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        due: null,
        project: null,
        tags: [],
        created: '2026-05-15',
        body: ''
      }
      await writeFile(join(tmpDir, `${taskId}.md`), serializeTask(task), 'utf-8')
    })

    it('returns empty array when no comments exist', async () => {
      const req = new Request(`http://localhost/${taskId}/comments`)
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual([])
    })

    it('returns 404 for comments on a non-existent task', async () => {
      const req = new Request('http://localhost/no-such-task/comments')
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
    })

    it('creates a comment and returns it with id and createdAt', async () => {
      const req = new Request(`http://localhost/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello world' }),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.content).toBe('Hello world')
      expect(typeof data.id).toBe('string')
      expect(typeof data.createdAt).toBe('string')
    })

    it('lists comments after creation', async () => {
      await router.fetch(new Request(`http://localhost/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: 'First comment' }),
        headers: { 'Content-Type': 'application/json' }
      }))

      const res = await router.fetch(new Request(`http://localhost/${taskId}/comments`))
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].content).toBe('First comment')
    })

    it('deletes a comment by id', async () => {
      const createRes = await router.fetch(new Request(`http://localhost/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: 'To delete' }),
        headers: { 'Content-Type': 'application/json' }
      }))
      const created = await createRes.json()

      const deleteRes = await router.fetch(
        new Request(`http://localhost/${taskId}/comments/${created.id}`, { method: 'DELETE' })
      )
      expect(deleteRes.status).toBe(200)
      const deleteData = await deleteRes.json()
      expect(deleteData.deleted).toBe(created.id)

      const listRes = await router.fetch(new Request(`http://localhost/${taskId}/comments`))
      expect(await listRes.json()).toEqual([])
    })
  })
})
