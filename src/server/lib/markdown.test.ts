import { describe, it, expect } from 'bun:test'
import { parseWikiFile, serializeWikiFile, parseTask, serializeTask, parseProject, serializeProject } from './markdown'

const WIKI_CONTENT = `---
title: Attention Mechanism
created: 2026-05-15
updated: 2026-05-15
domain: ai-ml
type: concept
tags:
  - attention
  - transformers
sources: []
---

Body content here.
`

const TASK_CONTENT = `---
title: Fix login bug
status: in-progress
priority: high
due: 2026-05-20
project: olympus-project
tags:
  - bug
  - auth
created: 2026-05-15
---

Some notes about the task.
`

describe('parseWikiFile', () => {
  it('parses title from frontmatter', () => {
    const result = parseWikiFile(WIKI_CONTENT, 'concepts/attention.md')
    expect(result.title).toBe('Attention Mechanism')
  })

  it('parses domain and type', () => {
    const result = parseWikiFile(WIKI_CONTENT, 'concepts/attention.md')
    expect(result.domain).toBe('ai-ml')
    expect(result.type).toBe('concept')
  })

  it('parses tags as array', () => {
    const result = parseWikiFile(WIKI_CONTENT, 'concepts/attention.md')
    expect(result.tags).toEqual(['attention', 'transformers'])
  })

  it('extracts body without frontmatter', () => {
    const result = parseWikiFile(WIKI_CONTENT, 'concepts/attention.md')
    expect(result.body).toBe('Body content here.')
  })

  it('sets path from argument', () => {
    const result = parseWikiFile(WIKI_CONTENT, 'concepts/attention.md')
    expect(result.path).toBe('concepts/attention.md')
  })

  it('defaults missing fields gracefully', () => {
    const minimal = '---\ntitle: Test\n---\n\nBody.'
    const result = parseWikiFile(minimal, 'test.md')
    expect(result.tags).toEqual([])
    expect(result.sources).toEqual([])
    expect(result.domain).toBe('personal')
    expect(result.type).toBe('concept')
  })
})

describe('serializeWikiFile', () => {
  it('round-trips a wiki file', () => {
    const parsed = parseWikiFile(WIKI_CONTENT, 'concepts/attention.md')
    const serialized = serializeWikiFile(parsed)
    const reparsed = parseWikiFile(serialized, 'concepts/attention.md')
    expect(reparsed.title).toBe(parsed.title)
    expect(reparsed.body).toBe(parsed.body)
    expect(reparsed.tags).toEqual(parsed.tags)
  })
})

describe('parseTask', () => {
  it('parses all task fields', () => {
    const result = parseTask(TASK_CONTENT, '2026-05-15-fix-login-bug')
    expect(result.id).toBe('2026-05-15-fix-login-bug')
    expect(result.title).toBe('Fix login bug')
    expect(result.status).toBe('in-progress')
    expect(result.priority).toBe('high')
    expect(result.due).toBe('2026-05-20')
    expect(result.project).toBe('olympus-project')
    expect(result.tags).toEqual(['bug', 'auth'])
    expect(result.body).toBe('Some notes about the task.')
  })

  it('defaults missing optional fields to null', () => {
    const minimal = '---\ntitle: Task\nstatus: todo\npriority: medium\ncreated: 2026-05-15\n---\n'
    const result = parseTask(minimal, '2026-05-15-task')
    expect(result.due).toBeNull()
    expect(result.project).toBeNull()
    expect(result.tags).toEqual([])
  })
})

describe('serializeTask', () => {
  it('round-trips a task', () => {
    const parsed = parseTask(TASK_CONTENT, '2026-05-15-fix-login-bug')
    const serialized = serializeTask(parsed)
    const reparsed = parseTask(serialized, '2026-05-15-fix-login-bug')
    expect(reparsed.title).toBe(parsed.title)
    expect(reparsed.status).toBe(parsed.status)
    expect(reparsed.body).toBe(parsed.body)
  })
})

const MINIMAL_PROJECT_CONTENT = `---
name: My App
---
`

const PROJECT_WITH_SHIPFAST_CONTENT = `---
name: My App
shipfast:
  enabled: true
  startDate: '2026-05-25'
  platform:
    - iOS
    - Android
  techStack: Flutter
  monetization: Freemium
  currentPhase: 1
  activatedPhases:
    - 1
---
`

describe('parseProject', () => {
  it('parses id from argument and name from frontmatter', () => {
    const result = parseProject(MINIMAL_PROJECT_CONTENT, 'my-app')
    expect(result.id).toBe('my-app')
    expect(result.name).toBe('My App')
  })

  it('returns undefined shipfast when not present', () => {
    const result = parseProject(MINIMAL_PROJECT_CONTENT, 'my-app')
    expect(result.shipfast).toBeUndefined()
  })

  it('parses shipfast metadata from nested frontmatter', () => {
    const result = parseProject(PROJECT_WITH_SHIPFAST_CONTENT, 'my-app')
    expect(result.shipfast).toEqual({
      enabled: true,
      startDate: '2026-05-25',
      platform: ['iOS', 'Android'],
      techStack: 'Flutter',
      monetization: 'Freemium',
      currentPhase: 1,
      activatedPhases: [1]
    })
  })
})

describe('serializeProject', () => {
  it('round-trips a minimal project', () => {
    const project = { id: 'my-app', name: 'My App' }
    const serialized = serializeProject(project)
    const reparsed = parseProject(serialized, 'my-app')
    expect(reparsed.id).toBe('my-app')
    expect(reparsed.name).toBe('My App')
    expect(reparsed.shipfast).toBeUndefined()
  })

  it('round-trips a project with shipfast metadata', () => {
    const project = {
      id: 'my-app',
      name: 'My App',
      shipfast: {
        enabled: true,
        startDate: '2026-05-25',
        platform: ['iOS', 'Android'],
        techStack: 'Flutter',
        monetization: 'Freemium',
        currentPhase: 1,
        activatedPhases: [1]
      }
    }
    const serialized = serializeProject(project)
    const reparsed = parseProject(serialized, 'my-app')
    expect(reparsed.shipfast).toEqual(project.shipfast)
  })

  it('round-trips activatedPhases as empty array', () => {
    const project = {
      id: 'my-app',
      name: 'My App',
      shipfast: {
        enabled: true,
        startDate: '2026-05-25',
        platform: ['Web'],
        techStack: 'Next.js',
        monetization: 'Freemium',
        currentPhase: 1,
        activatedPhases: []
      }
    }
    const serialized = serializeProject(project)
    const reparsed = parseProject(serialized, 'my-app')
    expect(reparsed.shipfast?.activatedPhases).toEqual([])
  })
})
