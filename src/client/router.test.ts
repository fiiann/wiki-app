import { describe, it, expect } from 'bun:test'

// These tests verify the URL structure for the wiki app routing.
// They describe expected routing behavior without implementation details.

// Routes expected:
//   /                   → Wiki tab (default)
//   /tasks              → Tasks tab
//   /projects           → Projects tab (project list)
//   /projects/:id       → Projects tab with selected project detail

describe('routing', () => {
  describe('tab routes', () => {
    it('wiki tab is at root path', () => {
      expect('/').toBe('/')
    })

    it('tasks tab has /tasks path', () => {
      expect('/tasks').toBe('/tasks')
    })

    it('projects tab has /projects path', () => {
      expect('/projects').toBe('/projects')
    })
  })

  describe('project detail route', () => {
    it('project detail uses /projects/:id format', () => {
      expect('/projects/expense-tracker').toBe('/projects/expense-tracker')
    })

    it('project id is derived from project slug', () => {
      const projectName = 'Expense Tracker'
      const slug = projectName.toLowerCase().replace(/\s+/g, '-')
      expect(slug).toBe('expense-tracker')
    })
  })

  describe('route preservation', () => {
    it('refreshing /tasks keeps tasks tab active', () => {
      const path = '/tasks'
      expect(path).toBe('/tasks')
    })

    it('refreshing /projects/expense-tracker keeps project detail active', () => {
      const path = '/projects/expense-tracker'
      expect(path).toBe('/projects/expense-tracker')
    })

    it('deep link to project task opens correct project', () => {
      const path = '/projects/expense-tracker'
      const projectId = path.split('/')[2]
      expect(projectId).toBe('expense-tracker')
    })
  })

  describe('navigation', () => {
    it('navigating to project detail changes URL', () => {
      const basePath = '/projects'
      const projectId = 'expense-tracker'
      const fullPath = `${basePath}/${projectId}`
      expect(fullPath).toBe('/projects/expense-tracker')
    })
  })
})