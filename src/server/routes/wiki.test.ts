import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createWikiRouter } from './wiki'
import { writeFile, mkdir, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { serializeWikiFile } from '../lib/markdown'

let tmpDir: string
let router: ReturnType<typeof createWikiRouter>

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'wiki-test-'))
  router = createWikiRouter(tmpDir)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('Wiki Routes', () => {
  describe('GET /files', () => {
    it('returns empty list for empty directory', async () => {
      const req = new Request('http://localhost/files')
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('lists all markdown files', async () => {
      const file1 = {
        path: 'test.md',
        title: 'Test',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Content'
      }
      await writeFile(join(tmpDir, 'test.md'), serializeWikiFile(file1), 'utf-8')

      const file2 = { ...file1, path: 'other.md', title: 'Other' }
      await writeFile(join(tmpDir, 'other.md'), serializeWikiFile(file2), 'utf-8')

      const req = new Request('http://localhost/files')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(2)
    })

    it('excludes excluded directories', async () => {
      await mkdir(join(tmpDir, 'tasks'), { recursive: true })
      const taskFile = {
        path: 'tasks/task.md',
        title: 'Task',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Content'
      }
      await writeFile(join(tmpDir, 'tasks', 'task.md'), serializeWikiFile(taskFile), 'utf-8')

      const req = new Request('http://localhost/files')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(0)
    })

    it('excludes dot-prefixed files', async () => {
      await writeFile(join(tmpDir, '.hidden.md'), '# Hidden', 'utf-8')

      const req = new Request('http://localhost/files')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(0)
    })

    it('excludes non-markdown files', async () => {
      await writeFile(join(tmpDir, 'test.txt'), 'text content', 'utf-8')

      const req = new Request('http://localhost/files')
      const res = await router.fetch(req)
      const data = await res.json()
      expect(data.length).toBe(0)
    })
  })

  describe('GET /files/*', () => {
    it('returns full file with body', async () => {
      const file = {
        path: 'test.md',
        title: 'Test File',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'ai-ml' as const,
        type: 'entity' as const,
        tags: ['tag1'],
        sources: [],
        body: 'File content here'
      }
      await writeFile(join(tmpDir, 'test.md'), serializeWikiFile(file), 'utf-8')

      const req = new Request('http://localhost/files/test.md')
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Test File')
      expect(data.body).toBe('File content here')
      expect(data.path).toBe('test.md')
    })

    it('returns 404 for missing file', async () => {
      const req = new Request('http://localhost/files/missing.md')
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Not found')
    })

    it('reads from nested paths', async () => {
      await mkdir(join(tmpDir, 'concepts'), { recursive: true })
      const file = {
        path: 'concepts/test.md',
        title: 'Concept',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Concept content'
      }
      await writeFile(join(tmpDir, 'concepts', 'test.md'), serializeWikiFile(file), 'utf-8')

      const req = new Request('http://localhost/files/concepts/test.md')
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.path).toBe('concepts/test.md')
    })
  })

  describe('POST /files', () => {
    it('creates a new file with stamped dates', async () => {
      const file = {
        path: 'new.md',
        title: 'New File',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'New content',
        created: '2000-01-01',
        updated: '2000-01-01'
      }

      const req = new Request('http://localhost/files', {
        method: 'POST',
        body: JSON.stringify(file),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.title).toBe('New File')
      expect(data.created).not.toBe('2000-01-01')
      expect(data.updated).not.toBe('2000-01-01')
    })

    it('creates nested directories automatically', async () => {
      const file = {
        path: 'deep/nested/file.md',
        title: 'Nested',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Content',
        created: '',
        updated: ''
      }

      const req = new Request('http://localhost/files', {
        method: 'POST',
        body: JSON.stringify(file),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(201)
    })
  })

  describe('PUT /files/*', () => {
    it('updates existing file and stamps updated date', async () => {
      const file = {
        path: 'test.md',
        title: 'Original',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Original content'
      }
      await writeFile(join(tmpDir, 'test.md'), serializeWikiFile(file), 'utf-8')

      const updates = { title: 'Updated', body: 'Updated content' }
      const req = new Request('http://localhost/files/test.md', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Updated')
      expect(data.body).toBe('Updated content')
    })

    it('pins path from URL, ignores path in body', async () => {
      const file = {
        path: 'original.md',
        title: 'Test',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Content'
      }
      await writeFile(join(tmpDir, 'original.md'), serializeWikiFile(file), 'utf-8')

      const updates = { path: 'new.md', title: 'Test' }
      const req = new Request('http://localhost/files/original.md', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.path).toBe('original.md')
    })

    it('returns 404 for missing file', async () => {
      const updates = { title: 'Test' }
      const req = new Request('http://localhost/files/missing.md', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      })
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /files/*', () => {
    it('deletes file from disk', async () => {
      const file = {
        path: 'test.md',
        title: 'Test',
        created: '2026-05-15',
        updated: '2026-05-15',
        domain: 'personal' as const,
        type: 'concept' as const,
        tags: [],
        sources: [],
        body: 'Content'
      }
      await writeFile(join(tmpDir, 'test.md'), serializeWikiFile(file), 'utf-8')

      const req = new Request('http://localhost/files/test.md', { method: 'DELETE' })
      const res = await router.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.deleted).toBe('test.md')
    })

    it('returns 404 for missing file', async () => {
      const req = new Request('http://localhost/files/missing.md', { method: 'DELETE' })
      const res = await router.fetch(req)
      expect(res.status).toBe(404)
    })
  })
})
