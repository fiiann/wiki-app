import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createProjectsRouter } from './projects'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(`${tmpdir()}/projects-test-`)
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true })
})

describe('GET /', () => {
  it('returns empty array when projects.json does not exist', async () => {
    const router = createProjectsRouter(tmpDir)
    const res = await router.fetch(new Request('http://localhost/'), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns projects from existing projects.json', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Personal' }) })
    )
    const res = await router.fetch(new Request('http://localhost/'), {})
    const projects = await res.json() as Array<{ id: string; name: string }>
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Personal')
  })
})

describe('POST /', () => {
  it('creates project with id derived from name via slugify, returns 201', async () => {
    const router = createProjectsRouter(tmpDir)
    const res = await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Olympus Project' }) })
    )
    expect(res.status).toBe(201)
    const project = await res.json() as { id: string; name: string }
    expect(project.id).toBe('olympus-project')
    expect(project.name).toBe('Olympus Project')
  })

  it('persists project so GET returns it afterward', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Personal' }) })
    )
    const res = await router.fetch(new Request('http://localhost/'), {})
    const projects = await res.json() as Array<{ id: string; name: string }>
    expect(projects).toHaveLength(1)
    expect(projects[0].id).toBe('personal')
  })

  it('returns 409 if project with same id already exists', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Personal' }) })
    )
    const res = await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'personal' }) })
    )
    expect(res.status).toBe(409)
  })
})

describe('PUT /:id', () => {
  it('updates the project name, preserves id', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Old Name' }) })
    )
    const res = await router.fetch(
      new Request('http://localhost/old-name', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Name' }) })
    )
    expect(res.status).toBe(200)
    const project = await res.json() as { id: string; name: string }
    expect(project.id).toBe('old-name')
    expect(project.name).toBe('New Name')
  })

  it('returns 404 for unknown id', async () => {
    const router = createProjectsRouter(tmpDir)
    const res = await router.fetch(
      new Request('http://localhost/nonexistent', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Whatever' }) })
    )
    expect(res.status).toBe(404)
  })
})

describe('DELETE /:id', () => {
  it('deletes project and returns { deleted: id }', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'To Delete' }) })
    )
    const res = await router.fetch(
      new Request('http://localhost/to-delete', { method: 'DELETE' })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: 'to-delete' })
  })

  it('returns 404 for unknown id', async () => {
    const router = createProjectsRouter(tmpDir)
    const res = await router.fetch(
      new Request('http://localhost/nonexistent', { method: 'DELETE' })
    )
    expect(res.status).toBe(404)
  })

  it('does not affect other projects when deleting one', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Keep Me' }) })
    )
    await router.fetch(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Delete Me' }) })
    )
    await router.fetch(
      new Request('http://localhost/delete-me', { method: 'DELETE' })
    )
    const res = await router.fetch(new Request('http://localhost/'), {})
    const projects = await res.json() as Array<{ id: string; name: string }>
    expect(projects).toHaveLength(1)
    expect(projects[0].id).toBe('keep-me')
  })
})
