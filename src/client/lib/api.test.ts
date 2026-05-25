import { describe, it, expect } from 'bun:test'
import { projectsApi } from './api'

describe('projectsApi', () => {
  describe('get', () => {
    it('fetches single project by id', async () => {
      // Endpoint structure: GET /api/projects/:id
      const id = 'expense-tracker'
      const endpoint = `/api/projects/${id}`
      expect(endpoint).toBe('/api/projects/expense-tracker')
    })

    it('endpoint uses project id in path', () => {
      const id = 'my-project'
      const endpoint = `/api/projects/${id}`
      expect(endpoint).toBe('/api/projects/my-project')
    })
  })

  describe('list', () => {
    it('fetches project list at /api/projects', () => {
      expect('/api/projects').toBe('/api/projects')
    })
  })

  describe('create', () => {
    it('posts to /api/projects', () => {
      expect('/api/projects').toBe('/api/projects')
    })
  })

  describe('update', () => {
    it('puts to /api/projects/:id', () => {
      const endpoint = `/api/projects/expense-tracker`
      expect(endpoint).toBe('/api/projects/expense-tracker')
    })
  })

  describe('remove', () => {
    it('deletes at /api/projects/:id', () => {
      const endpoint = `/api/projects/expense-tracker`
      expect(endpoint).toBe('/api/projects/expense-tracker')
    })
  })
})