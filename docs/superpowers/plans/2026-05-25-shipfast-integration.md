# ShipFast Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed a 14-day waterfall "ShipFast" framework inside any project — storing metadata on the project, auto-generating checklist tasks per phase, and showing a phase progress panel above the KanbanBoard.

**Architecture:** Projects currently use a single `projects.json` file; we migrate to individual `<id>.md` files (matching tasks) to support nested ShipFast frontmatter via gray-matter. The ShipFast panel lives entirely in the client — phase data is hardcoded, progress is derived from existing task tags/status, and only the ShipFast metadata update needs a new server endpoint.

**Tech Stack:** Bun + Hono (server), React 18 + Vite (client), TypeScript strict, gray-matter for `.md` storage, Bun test (integration tests — no component unit tests per CLAUDE.md)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `types.ts` | Modify | Add `ShipFastMeta`, extend `Project.shipfast?` |
| `src/server/lib/markdown.ts` | Modify | Add `parseProject`, `serializeProject` |
| `src/server/lib/markdown.test.ts` | Modify | Tests for new parse/serialize functions |
| `src/server/routes/projects.ts` | Modify | Migrate from `projects.json` → `projects/<id>.md`; add `PUT /:id/shipfast` |
| `src/server/routes/projects.test.ts` | Modify | Tests for `PUT /:id/shipfast` + regression for `.md` storage |
| `src/client/data/shipfast.ts` | Create | Hardcoded `SHIPFAST_PHASES` constant |
| `src/client/lib/api.ts` | Modify | Add `projectsApi.updateShipFast` |
| `src/client/hooks/useShipFast.ts` | Create | Phase progress derivation, `activatePhase`, `enableShipFast` |
| `src/client/pages/ProjectsPage.tsx` | Modify | Project detail view with ShipFast panel + KanbanBoard |
| `src/client/index.css` | Modify | ShipFast panel styles |

---

## Task 1: Update `types.ts`

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add `ShipFastMeta` and extend `Project`**

Open `types.ts` and replace the `Project` interface plus add `ShipFastMeta` before it:

```ts
export interface ShipFastMeta {
  enabled: boolean
  startDate: string        // YYYY-MM-DD
  platform: string[]       // e.g. ['iOS', 'Android']
  techStack: string        // e.g. 'Flutter'
  monetization: string     // e.g. 'Freemium'
  currentPhase: number     // 1–5
  activatedPhases: number[] // which phases have had tasks generated
}

export interface Project {
  id: string
  name: string
  shipfast?: ShipFastMeta
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add ShipFastMeta and extend Project"
```

---

## Task 2: Add `parseProject` / `serializeProject` to `markdown.ts` (TDD)

**Files:**
- Modify: `src/server/lib/markdown.ts`
- Modify: `src/server/lib/markdown.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/server/lib/markdown.test.ts` (update the import line first):

Change the import at the top from:
```ts
import { parseWikiFile, serializeWikiFile, parseTask, serializeTask } from './markdown'
```
to:
```ts
import { parseWikiFile, serializeWikiFile, parseTask, serializeTask, parseProject, serializeProject } from './markdown'
```

Then add at the end of the file:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/ubuntu/wiki-app && bun test src/server/lib/markdown.test.ts 2>&1 | tail -20
```

Expected: failures mentioning `parseProject is not a function`.

- [ ] **Step 3: Implement `parseProject` and `serializeProject` in `markdown.ts`**

Add these two functions at the end of `src/server/lib/markdown.ts`:

```ts
import type { WikiFile, Task, Project } from '../../../types'

export function parseProject(content: string, id: string): Project {
  const { data } = matter(content)
  const sf = data.shipfast
  return {
    id,
    name: String(data.name ?? ''),
    shipfast: sf
      ? {
          enabled: Boolean(sf.enabled),
          startDate: String(sf.startDate ?? ''),
          platform: Array.isArray(sf.platform) ? sf.platform.map(String) : [],
          techStack: String(sf.techStack ?? ''),
          monetization: String(sf.monetization ?? ''),
          currentPhase: Number(sf.currentPhase ?? 1),
          activatedPhases: Array.isArray(sf.activatedPhases)
            ? sf.activatedPhases.map(Number)
            : [],
        }
      : undefined,
  }
}

export function serializeProject(project: Project): string {
  const { id, ...frontmatter } = project
  return matter.stringify('', frontmatter)
}
```

Note: the `import type` line at the top of `markdown.ts` already imports from `'../../../types'` — extend it to include `Project`:
```ts
import type { WikiFile, Task, Project } from '../../../types'
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/ubuntu/wiki-app && bun test src/server/lib/markdown.test.ts 2>&1 | tail -20
```

Expected: all tests pass including the new `parseProject` / `serializeProject` suites.

- [ ] **Step 5: Commit**

```bash
git add src/server/lib/markdown.ts src/server/lib/markdown.test.ts
git commit -m "feat(markdown): add parseProject and serializeProject"
```

---

## Task 3: Migrate `projects.ts` to `.md` storage + add `PUT /:id/shipfast` (TDD)

**Files:**
- Modify: `src/server/routes/projects.ts`
- Modify: `src/server/routes/projects.test.ts`

### 3a — Write failing tests first

- [ ] **Step 1: Add new tests to `projects.test.ts`**

Append to the end of `src/server/routes/projects.test.ts`:

```ts
describe('PUT /:id/shipfast', () => {
  it('stores shipfast metadata on the project, returns updated project', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My App' })
      })
    )
    const meta = {
      enabled: true,
      startDate: '2026-05-25',
      platform: ['iOS', 'Android'],
      techStack: 'Flutter',
      monetization: 'Freemium',
      currentPhase: 1,
      activatedPhases: []
    }
    const res = await router.fetch(
      new Request('http://localhost/my-app/shipfast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      })
    )
    expect(res.status).toBe(200)
    const project = await res.json() as { id: string; name: string; shipfast: typeof meta }
    expect(project.shipfast).toEqual(meta)
  })

  it('returns 404 when project does not exist', async () => {
    const router = createProjectsRouter(tmpDir)
    const res = await router.fetch(
      new Request('http://localhost/nonexistent/shipfast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          startDate: '2026-05-25',
          platform: ['Web'],
          techStack: 'Next.js',
          monetization: 'Freemium',
          currentPhase: 1,
          activatedPhases: []
        })
      })
    )
    expect(res.status).toBe(404)
  })

  it('persists shipfast so GET returns it afterward', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My App' })
      })
    )
    const meta = {
      enabled: true,
      startDate: '2026-05-25',
      platform: ['iOS'],
      techStack: 'React Native',
      monetization: 'Subscription',
      currentPhase: 2,
      activatedPhases: [1]
    }
    await router.fetch(
      new Request('http://localhost/my-app/shipfast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      })
    )
    const res = await router.fetch(new Request('http://localhost/'))
    const projects = await res.json() as Array<{ shipfast: typeof meta }>
    expect(projects[0].shipfast).toEqual(meta)
  })

  it('PUT /:id (rename) preserves existing shipfast metadata', async () => {
    const router = createProjectsRouter(tmpDir)
    await router.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Old Name' })
      })
    )
    const meta = {
      enabled: true,
      startDate: '2026-05-25',
      platform: ['Android'],
      techStack: 'Kotlin',
      monetization: 'One-time',
      currentPhase: 1,
      activatedPhases: []
    }
    await router.fetch(
      new Request('http://localhost/old-name/shipfast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      })
    )
    const res = await router.fetch(
      new Request('http://localhost/old-name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' })
      })
    )
    const project = await res.json() as { name: string; shipfast: typeof meta }
    expect(project.name).toBe('New Name')
    expect(project.shipfast).toEqual(meta)
  })
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd /home/ubuntu/wiki-app && bun test src/server/routes/projects.test.ts 2>&1 | tail -30
```

Expected: existing tests pass, new `PUT /:id/shipfast` tests fail (route does not exist yet).

### 3b — Implement the migration + new endpoint

- [ ] **Step 3: Rewrite `src/server/routes/projects.ts`**

Replace the entire file with:

```ts
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
```

- [ ] **Step 4: Run all project tests**

```bash
cd /home/ubuntu/wiki-app && bun test src/server/routes/projects.test.ts 2>&1 | tail -30
```

Expected: all tests pass — both old CRUD tests and new ShipFast tests.

- [ ] **Step 5: Run full test suite to ensure no regressions**

```bash
cd /home/ubuntu/wiki-app && bun test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/projects.ts src/server/routes/projects.test.ts
git commit -m "feat(projects): migrate to .md storage, add PUT /shipfast endpoint"
```

---

## Task 4: Create `src/client/data/shipfast.ts`

**Files:**
- Create: `src/client/data/shipfast.ts`

- [ ] **Step 1: Create the file with hardcoded phase data**

Create `src/client/data/shipfast.ts`:

```ts
export interface ShipFastPhase {
  id: number
  name: string
  days: string
  color: string
  gate: string
  summary: string
  checklist: { id: string; text: string }[]
}

export const SHIPFAST_PHASES: ShipFastPhase[] = [
  {
    id: 1,
    name: 'Idea & Research',
    days: 'Days 1–2',
    color: '#F59E0B',
    gate: 'Go / No-Go',
    summary: 'Validate before writing code. Kill bad ideas early.',
    checklist: [
      { id: '1-1', text: 'Write a 1-sentence problem statement: "App X helps [WHO] do [WHAT] without [PAIN]"' },
      { id: '1-2', text: 'Identify 3–5 competing apps — list their strengths and gaps' },
      { id: '1-3', text: 'Decide monetization: Free+Ads / One-time / Freemium / Subscription' },
      { id: '1-4', text: 'List MVP features only (max 5–7 screens for v1.0)' },
      { id: '1-5', text: 'Decide tech stack: Flutter / React Native / Swift / Kotlin / Next.js' },
      { id: '1-6', text: 'Define target platform(s): iOS / Android / Web / All' },
      { id: '1-7', text: 'Set a Go / No-Go decision by end of Day 2' },
      { id: '1-8', text: 'Name the app (even a working title)' },
      { id: '1-9', text: 'Check app name availability on App Store and Play Store' },
    ],
  },
  {
    id: 2,
    name: 'Design & Assets',
    days: 'Days 3–5',
    color: '#06B6D4',
    gate: 'Assets Ready',
    summary: 'Build visual identity and all static assets before touching code.',
    checklist: [
      { id: '2-1', text: 'Define primary + secondary + accent colors (hex codes locked)' },
      { id: '2-2', text: 'Choose 1–2 fonts (heading + body)' },
      { id: '2-3', text: 'Design app icon at 1024×1024px (single source of truth)' },
      { id: '2-4', text: 'Export icon in all required sizes for iOS and Android' },
      { id: '2-5', text: 'Design splash screen (iOS LaunchScreen + Android launch drawable)' },
      { id: '2-6', text: 'Design onboarding screens (max 3 slides)' },
      { id: '2-7', text: 'Create mini style guide: buttons, cards, colors, fonts' },
      { id: '2-8', text: 'Wireframe all MVP screens (low-fi is fine)' },
      { id: '2-9', text: 'Draft App Store / Play Store short + long description' },
      { id: '2-10', text: 'Plan 3–5 store screenshots (what to showcase)' },
    ],
  },
  {
    id: 3,
    name: 'Development',
    days: 'Days 6–11',
    color: '#10B981',
    gate: 'RC Build',
    summary: '6 days of focused development. No feature creep. New ideas go to backlog.',
    checklist: [
      { id: '3-1', text: 'Initialize repo with .gitignore and README' },
      { id: '3-2', text: 'Set up folder structure (features/, shared/, assets/, services/)' },
      { id: '3-3', text: 'Configure base theme with colors and typography from Phase 2' },
      { id: '3-4', text: 'Integrate app icon and splash screen assets' },
      { id: '3-5', text: 'Set up navigation (bottom nav, stack, or tab structure)' },
      { id: '3-6', text: 'Build all MVP screens with real UI (not placeholder)' },
      { id: '3-7', text: 'Wire up state management' },
      { id: '3-8', text: 'Integrate backend or local storage solution' },
      { id: '3-9', text: 'Implement monetization layer (Ads / IAP / Paywall)' },
      { id: '3-10', text: 'Handle empty states, error states, and loading states for every screen' },
      { id: '3-11', text: "Add onboarding flow (skip logic, don't show again flag)" },
      { id: '3-12', text: 'No feature creep — log new ideas in backlog' },
    ],
  },
  {
    id: 4,
    name: 'QA & Polish',
    days: 'Days 12–13',
    color: '#EF4444',
    gate: 'Release Candidate',
    summary: 'Test everything that can break before users find it. Fix P1+P2 only.',
    checklist: [
      { id: '4-1', text: 'Test every screen on at least 1 real iOS + 1 real Android device' },
      { id: '4-2', text: 'Test on a small screen and a large screen' },
      { id: '4-3', text: 'Test offline behavior — graceful no-internet handling' },
      { id: '4-4', text: 'Test onboarding flow from fresh install' },
      { id: '4-5', text: 'Test all navigation paths (no dead ends, back buttons work)' },
      { id: '4-6', text: 'Test monetization flow (ad loading, paywall, purchase flow)' },
      { id: '4-7', text: 'Check all text for typos and grammar' },
      { id: '4-8', text: 'Verify icons and images render sharply on all screen densities' },
      { id: '4-9', text: 'Run performance check — no janky animations or memory leaks' },
      { id: '4-10', text: 'Fix all P1 (crash) bugs before proceeding' },
      { id: '4-11', text: 'Fix all P2 (broken feature) bugs before proceeding' },
      { id: '4-12', text: 'Log P3 (cosmetic) bugs as v1.1 backlog — do NOT fix now' },
    ],
  },
  {
    id: 5,
    name: 'Release Prep',
    days: 'Day 14',
    color: '#8B5CF6',
    gate: 'Submitted',
    summary: 'Package everything for submission. Day 14 is the last day of your 14-day window.',
    checklist: [
      { id: '5-1', text: 'Bump version number (1.0.0) and build number' },
      { id: '5-2', text: 'Build release/production binary' },
      { id: '5-3', text: 'Sign the Android APK/AAB with your release keystore' },
      { id: '5-4', text: 'Sign the iOS IPA with distribution certificate and provisioning profile' },
      { id: '5-5', text: 'Upload app icon to App Store Connect and Play Console' },
      { id: '5-6', text: 'Create all store screenshots (required sizes for both stores)' },
      { id: '5-7', text: 'Fill in App Store Connect metadata: name, subtitle, description, keywords' },
      { id: '5-8', text: 'Fill in Play Console metadata: title, descriptions, category' },
      { id: '5-9', text: 'Set up pricing and availability (regions, release date)' },
      { id: '5-10', text: 'Complete App Store privacy questionnaire' },
      { id: '5-11', text: 'Complete Play Store content rating questionnaire' },
      { id: '5-12', text: 'Submit to App Store for review' },
      { id: '5-13', text: 'Submit to Google Play for review' },
      { id: '5-14', text: 'Set up crash monitoring (Firebase Crashlytics or Sentry)' },
    ],
  },
]
```

- [ ] **Step 2: Verify build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/data/shipfast.ts
git commit -m "feat(data): add SHIPFAST_PHASES constant"
```

---

## Task 5: Update `src/client/lib/api.ts`

**Files:**
- Modify: `src/client/lib/api.ts`

- [ ] **Step 1: Add `updateShipFast` to `projectsApi`**

Change the import at the top of `src/client/lib/api.ts` from:
```ts
import type { WikiFile, WikiFileMeta, Task, Comment, Project } from '../../../types'
```
to:
```ts
import type { WikiFile, WikiFileMeta, Task, Comment, Project, ShipFastMeta } from '../../../types'
```

Then in the `projectsApi` object, add after `remove`:
```ts
  updateShipFast: (id: string, meta: ShipFastMeta) =>
    req<Project>(`/api/projects/${id}/shipfast`, {
      method: 'PUT',
      ...json(meta)
    }),
```

- [ ] **Step 2: Verify build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/lib/api.ts
git commit -m "feat(api): add projectsApi.updateShipFast"
```

---

## Task 6: Create `src/client/hooks/useShipFast.ts`

**Files:**
- Create: `src/client/hooks/useShipFast.ts`

- [ ] **Step 1: Create the hook**

Create directory and file:

```bash
mkdir -p /home/ubuntu/wiki-app/src/client/hooks
```

Create `src/client/hooks/useShipFast.ts`:

```ts
import { useMemo } from 'react'
import { tasksApi, projectsApi } from '../lib/api'
import { SHIPFAST_PHASES } from '../data/shipfast'
import type { Project, Task, ShipFastMeta } from '../../../types'

export function useShipFast(project: Project, tasks: Task[]) {
  const isShipFastProject = project.shipfast?.enabled === true

  const dayCount = useMemo(() => {
    if (!project.shipfast?.startDate) return 0
    const start = new Date(project.shipfast.startDate)
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(Math.max(diff + 1, 1), 14)
  }, [project.shipfast?.startDate])

  const phaseProgress = useMemo(() => {
    const progress: Record<number, { total: number; done: number; pct: number }> = {}
    for (let i = 1; i <= 5; i++) {
      const phaseTasks = tasks.filter(
        (t) =>
          t.project === project.id &&
          t.tags.includes('shipfast') &&
          t.tags.includes(`phase-${i}`)
      )
      const done = phaseTasks.filter((t) => t.status === 'done').length
      const total = phaseTasks.length
      progress[i] = {
        total,
        done,
        pct: total === 0 ? 0 : Math.round((done / total) * 100),
      }
    }
    return progress
  }, [tasks, project.id])

  const enableShipFast = async (meta: ShipFastMeta): Promise<Project> => {
    return projectsApi.updateShipFast(project.id, meta)
  }

  const activatePhase = async (
    phaseId: number
  ): Promise<{ tasks: Task[]; project: Project }> => {
    if (!project.shipfast) throw new Error('ShipFast not enabled')
    if (project.shipfast.activatedPhases.includes(phaseId)) {
      return { tasks: [], project }
    }
    const phase = SHIPFAST_PHASES.find((p) => p.id === phaseId)
    if (!phase) throw new Error(`Phase ${phaseId} not found`)

    const created: Task[] = []
    for (const item of phase.checklist) {
      const task = await tasksApi.create({
        title: item.text,
        project: project.id,
        tags: ['shipfast', `phase-${phaseId}`],
        status: 'todo',
        priority: 'medium',
        due: null,
        body: '',
      })
      created.push(task)
    }

    const updatedMeta: ShipFastMeta = {
      ...project.shipfast,
      activatedPhases: [...project.shipfast.activatedPhases, phaseId],
    }
    const updatedProject = await projectsApi.updateShipFast(project.id, updatedMeta)
    return { tasks: created, project: updatedProject }
  }

  return { phaseProgress, activatePhase, enableShipFast, isShipFastProject, dayCount }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/hooks/useShipFast.ts
git commit -m "feat(hooks): add useShipFast hook"
```

---

## Task 7: Update `src/client/pages/ProjectsPage.tsx`

**Files:**
- Modify: `src/client/pages/ProjectsPage.tsx`

This task adds a two-view structure: list view (default) and detail view (when a project is selected). The detail view includes the ShipFast panel and KanbanBoard. A `ShipFastPanel` sub-component is defined in the same file.

- [ ] **Step 1: Replace `ProjectsPage.tsx` entirely**

Replace the entire contents of `src/client/pages/ProjectsPage.tsx` with:

```tsx
import { useState, useEffect } from 'react'
import { projectsApi, tasksApi } from '../lib/api'
import KanbanBoard from '../components/KanbanBoard'
import TaskPreviewModal from '../components/TaskPreviewModal'
import { useShipFast } from '../hooks/useShipFast'
import { SHIPFAST_PHASES } from '../data/shipfast'
import type { Project, Task, TaskStatus, ShipFastMeta } from '../../../types'

const PLATFORM_OPTIONS = ['iOS', 'Android', 'Web', 'All']
const STACK_OPTIONS = ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Next.js']
const MONETIZATION_OPTIONS = ['Free+Ads', 'One-time', 'Freemium', 'Subscription']

const todayStr = () => new Date().toISOString().split('T')[0]

// ── ShipFast panel sub-component ─────────────────────────────────────────────

interface ShipFastPanelProps {
  project: Project
  phaseProgress: Record<number, { total: number; done: number; pct: number }>
  dayCount: number
  onActivatePhase: (phaseId: number) => Promise<void>
}

function ShipFastPanel({
  project,
  phaseProgress,
  dayCount,
  onActivatePhase,
}: ShipFastPanelProps) {
  const sf = project.shipfast!
  const [activating, setActivating] = useState<number | null>(null)
  const currentPhase = SHIPFAST_PHASES.find((p) => p.id === sf.currentPhase)!

  const handleActivate = async (phaseId: number) => {
    setActivating(phaseId)
    try {
      await onActivatePhase(phaseId)
    } finally {
      setActivating(null)
    }
  }

  return (
    <div className="sf-panel">
      <div className="sf-header">
        <span className="sf-title">🚀 ShipFast</span>
        <span className="sf-day">Day {dayCount} / 14</span>
        <div className="sf-meta-chips">
          {sf.platform.map((p) => (
            <span key={p} className="sf-meta-chip">{p}</span>
          ))}
          <span className="sf-meta-chip">{sf.techStack}</span>
          <span className="sf-meta-chip">{sf.monetization}</span>
        </div>
      </div>

      <div className="sf-phases">
        {SHIPFAST_PHASES.map((phase) => {
          const prog = phaseProgress[phase.id]
          const isActivated = sf.activatedPhases.includes(phase.id)
          const isActivating = activating === phase.id
          return (
            <div
              key={phase.id}
              className={`sf-phase-col ${sf.currentPhase === phase.id ? 'sf-phase-active' : ''}`}
            >
              <div className="sf-phase-name" style={{ color: phase.color }}>
                {phase.name}
              </div>
              <div className="sf-phase-days">{phase.days}</div>
              <div className="sf-progress-track">
                <div
                  className="sf-progress-fill"
                  style={{ width: `${prog.pct}%`, background: phase.color }}
                />
              </div>
              <div className="sf-progress-pct">{prog.pct}%</div>
              {!isActivated ? (
                <button
                  className="sf-generate-btn"
                  disabled={isActivating}
                  onClick={() => handleActivate(phase.id)}
                >
                  {isActivating ? '…' : 'Generate Tasks'}
                </button>
              ) : (
                <span className="sf-activated-badge">✓ Generated</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="sf-current-phase">
        <span className="sf-current-label">
          Active: Phase {currentPhase.id} — {currentPhase.name} ({currentPhase.days})
        </span>
        <span className="sf-gate">Gate: {currentPhase.gate}</span>
        <span className="sf-summary">{currentPhase.summary}</span>
      </div>
    </div>
  )
}

// ── Main page component ───────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null | undefined>(undefined)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showEnableForm, setShowEnableForm] = useState(false)
  const [enableForm, setEnableForm] = useState({
    startDate: todayStr(),
    platform: [] as string[],
    techStack: '',
    monetization: '',
  })

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setProjectTasks([])
      return
    }
    tasksApi.list({ project: selectedProject.id }).then(setProjectTasks).catch(console.error)
  }, [selectedProject?.id])

  const { phaseProgress, activatePhase, enableShipFast, isShipFastProject, dayCount } =
    useShipFast(selectedProject ?? { id: '', name: '' }, projectTasks)

  const handleSelectProject = (p: Project) => {
    setSelectedProject(p)
    setShowEnableForm(false)
  }

  const handleBack = () => {
    setSelectedProject(null)
    setShowEnableForm(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      const created = await projectsApi.create(newName.trim())
      setProjects((prev) => [...prev, created])
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return
    const updated = await projectsApi.update(id, editName.trim())
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    if (selectedProject?.id === id) setSelectedProject(updated)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return
    await projectsApi.remove(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (selectedProject?.id === id) setSelectedProject(null)
  }

  const handleEnableShipFast = async () => {
    if (
      !selectedProject ||
      !enableForm.techStack ||
      !enableForm.monetization ||
      enableForm.platform.length === 0
    )
      return
    const meta: ShipFastMeta = {
      enabled: true,
      startDate: enableForm.startDate,
      platform: enableForm.platform,
      techStack: enableForm.techStack,
      monetization: enableForm.monetization,
      currentPhase: 1,
      activatedPhases: [],
    }
    const updated = await enableShipFast(meta)
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedProject(updated)
    setShowEnableForm(false)
  }

  const handleActivatePhase = async (phaseId: number) => {
    if (!selectedProject) return
    const { tasks: newTasks, project: updatedProject } = await activatePhase(phaseId)
    setProjectTasks((prev) => [...prev, ...newTasks])
    setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
    setSelectedProject(updatedProject)
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const updated = await tasksApi.update(id, { status })
    setProjectTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const handleTaskSave = async (data: Partial<Task> & { title: string }) => {
    if (!selectedProject) return
    if (activeTask) {
      const updated = await tasksApi.update(activeTask.id, data)
      setProjectTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } else {
      const created = await tasksApi.create({
        status: 'todo',
        priority: 'medium',
        due: null,
        project: selectedProject.id,
        tags: [],
        body: '',
        ...data,
      })
      setProjectTasks((prev) => [...prev, created])
    }
  }

  const handleTaskDelete = async (id: string) => {
    await tasksApi.remove(id)
    setProjectTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // ── Detail view ─────────────────────────────────────────────────────────────

  if (selectedProject) {
    return (
      <div className="projects-page">
        <div className="tasks-toolbar">
          <button className="sf-back-btn" onClick={handleBack}>
            ← Back
          </button>
          {editingId === selectedProject.id ? (
            <>
              <input
                autoFocus
                className="task-dialog-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(selectedProject.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
              />
              <button className="btn-primary" onClick={() => handleSaveEdit(selectedProject.id)}>
                Save
              </button>
              <button onClick={() => setEditingId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <span className="tasks-toolbar-title">{selectedProject.name}</span>
              <span className="project-id">{selectedProject.id}</span>
              <button
                onClick={() => {
                  setEditingId(selectedProject.id)
                  setEditName(selectedProject.name)
                }}
              >
                Edit
              </button>
              <button onClick={() => handleDelete(selectedProject.id)}>Delete</button>
            </>
          )}
          <button className="btn-new-task" onClick={() => setActiveTask(null)}>
            + New Task
          </button>
        </div>

        {!isShipFastProject && !showEnableForm && (
          <div className="sf-enable-bar">
            <button className="sf-enable-btn" onClick={() => setShowEnableForm(true)}>
              Enable ShipFast 🚀
            </button>
          </div>
        )}

        {showEnableForm && (
          <div className="sf-enable-form">
            <div className="sf-enable-form-title">Setup ShipFast 🚀</div>
            <div className="sf-form-row">
              <label className="sf-form-label">Start Date</label>
              <input
                type="date"
                className="task-dialog-input"
                value={enableForm.startDate}
                onChange={(e) =>
                  setEnableForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="sf-form-row">
              <label className="sf-form-label">Platform</label>
              <div className="sf-chips">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    className={`sf-chip ${enableForm.platform.includes(p) ? 'sf-chip-active' : ''}`}
                    onClick={() =>
                      setEnableForm((prev) => ({
                        ...prev,
                        platform: prev.platform.includes(p)
                          ? prev.platform.filter((x) => x !== p)
                          : [...prev.platform, p],
                      }))
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-form-row">
              <label className="sf-form-label">Tech Stack</label>
              <div className="sf-chips">
                {STACK_OPTIONS.map((s) => (
                  <button
                    key={s}
                    className={`sf-chip ${enableForm.techStack === s ? 'sf-chip-active' : ''}`}
                    onClick={() =>
                      setEnableForm((prev) => ({ ...prev, techStack: s }))
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-form-row">
              <label className="sf-form-label">Monetization</label>
              <div className="sf-chips">
                {MONETIZATION_OPTIONS.map((m) => (
                  <button
                    key={m}
                    className={`sf-chip ${enableForm.monetization === m ? 'sf-chip-active' : ''}`}
                    onClick={() =>
                      setEnableForm((prev) => ({ ...prev, monetization: m }))
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="sf-form-actions">
              <button
                className="btn-primary"
                onClick={handleEnableShipFast}
                disabled={
                  !enableForm.techStack ||
                  !enableForm.monetization ||
                  enableForm.platform.length === 0
                }
              >
                Enable ShipFast
              </button>
              <button onClick={() => setShowEnableForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {isShipFastProject && selectedProject.shipfast && (
          <ShipFastPanel
            project={selectedProject}
            phaseProgress={phaseProgress}
            dayCount={dayCount}
            onActivatePhase={handleActivatePhase}
          />
        )}

        <KanbanBoard
          tasks={projectTasks}
          onOpen={(task) => setActiveTask(task)}
          onStatusChange={handleStatusChange}
        />

        {activeTask !== undefined && (
          <TaskPreviewModal
            task={activeTask}
            projects={projects}
            onSave={handleTaskSave}
            onDelete={activeTask ? handleTaskDelete : undefined}
            onClose={() => setActiveTask(undefined)}
          />
        )}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────

  return (
    <div className="projects-page">
      <div className="tasks-toolbar">
        <span className="tasks-toolbar-title">Projects</span>
      </div>
      <div className="projects-list">
        {projects.length === 0 && (
          <p className="task-preview-empty">No projects yet.</p>
        )}
        {projects.map((p) => (
          <div key={p.id} className="project-item">
            {editingId === p.id ? (
              <>
                <input
                  autoFocus
                  className="task-dialog-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(p.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <button className="btn-primary" onClick={() => handleSaveEdit(p.id)}>
                  Save
                </button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <button
                  className="project-name-link"
                  onClick={() => handleSelectProject(p)}
                >
                  {p.name}
                  {p.shipfast?.enabled && <span className="sf-badge"> 🚀</span>}
                </button>
                <span className="project-id">{p.id}</span>
                <button
                  onClick={() => {
                    setEditingId(p.id)
                    setEditName(p.name)
                  }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
      <form className="project-add-form" onSubmit={handleAdd}>
        <input
          className="task-dialog-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name"
        />
        <button
          type="submit"
          className="btn-new-task"
          disabled={!newName.trim() || adding}
        >
          {adding ? 'Adding…' : '+ Add Project'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/ProjectsPage.tsx
git commit -m "feat(projects): add ShipFast panel and project detail view"
```

---

## Task 8: Add ShipFast CSS to `src/client/index.css`

**Files:**
- Modify: `src/client/index.css`

- [ ] **Step 1: Append ShipFast styles**

Append the following to the end of `src/client/index.css`:

```css
/* ── ShipFast ─────────────────────────────────────────────────────────────── */

.sf-back-btn {
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-hover);
  flex-shrink: 0;
}

.sf-back-btn:hover { color: var(--text); }

.project-name-link {
  flex: 1;
  font-weight: 500;
  text-align: left;
  font-size: 13px;
  color: var(--text);
  padding: 2px 0;
}

.project-name-link:hover { color: var(--accent); }

.sf-badge { font-size: 12px; }

/* Enable bar */
.sf-enable-bar {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sf-enable-btn {
  padding: 5px 14px;
  font-size: 12px;
  color: #F59E0B;
  border: 1px solid #3d2f00;
  border-radius: 4px;
  background: #1a1400;
}

.sf-enable-btn:hover { background: #231c00; }

/* Enable form */
.sf-enable-form {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-panel);
  flex-shrink: 0;
}

.sf-enable-form-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.sf-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sf-form-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  width: 90px;
  flex-shrink: 0;
}

.sf-chips { display: flex; gap: 6px; flex-wrap: wrap; }

.sf-chip {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  background: var(--bg-hover);
  transition: color 0.1s, border-color 0.1s, background 0.1s;
}

.sf-chip:hover { color: var(--text); border-color: #444; }

.sf-chip-active {
  color: #F59E0B;
  border-color: #6b4700;
  background: #1a1000;
}

.sf-form-actions { display: flex; gap: 8px; align-items: center; padding-top: 4px; }

/* ShipFast panel */
.sf-panel {
  border-bottom: 1px solid var(--border);
  background: var(--bg-panel);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.sf-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 8px;
  border-bottom: 1px solid var(--border);
}

.sf-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.sf-day {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.sf-meta-chips { display: flex; gap: 4px; }

.sf-meta-chip {
  font-size: 10px;
  padding: 2px 7px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-dim);
  background: var(--bg-hover);
}

.sf-phases {
  display: flex;
  gap: 0;
  padding: 0;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.sf-phase-col {
  flex: 1;
  min-width: 120px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid var(--border);
}

.sf-phase-col:last-child { border-right: none; }

.sf-phase-active { background: #111a11; }

.sf-phase-name {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
}

.sf-phase-days {
  font-size: 10px;
  color: var(--text-dim);
}

.sf-progress-track {
  height: 4px;
  background: var(--bg-hover);
  border-radius: 2px;
  overflow: hidden;
  margin: 2px 0;
}

.sf-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.sf-progress-pct {
  font-size: 10px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.sf-generate-btn {
  font-size: 10px;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  background: var(--bg-hover);
  margin-top: 2px;
  align-self: flex-start;
}

.sf-generate-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
.sf-generate-btn:disabled { opacity: 0.4; cursor: default; }

.sf-activated-badge {
  font-size: 10px;
  color: var(--green);
  margin-top: 2px;
}

.sf-current-phase {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 16px;
  flex-wrap: wrap;
}

.sf-current-label {
  font-size: 12px;
  color: var(--text-muted);
}

.sf-gate {
  font-size: 11px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.sf-summary {
  font-size: 11px;
  color: var(--text-dim);
  font-style: italic;
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/index.css
git commit -m "feat(css): add ShipFast panel styles"
```

---

## Task 9: Final Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
cd /home/ubuntu/wiki-app && bun test 2>&1
```

Expected: all tests pass (54+ passing, 0 failing).

- [ ] **Step 2: Run build**

```bash
cd /home/ubuntu/wiki-app && bun run build 2>&1
```

Expected: exits 0, no TypeScript errors, no Vite errors.

- [ ] **Step 3: Smoke test the dev server**

```bash
cd /home/ubuntu/wiki-app && PORT=3003 bun run dev:server &
sleep 2
curl -s http://localhost:3003/api/projects | head -c 100
kill %1 2>/dev/null
```

Expected: returns `[]` or a valid JSON array.

---

## Self-Review: Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Any project can have ShipFast enabled via a button | Task 7 (enable bar + form) |
| Enabling stores metadata (startDate, platform, stack, monetization) | Tasks 1, 3, 5, 7 |
| "Generate Phase N Tasks" creates one task per checklist item, tagged `shipfast` + `phase-N` | Task 6 (activatePhase) |
| Tasks appear immediately in the Kanban | Task 7 (handleActivatePhase updates projectTasks state) |
| Phase progress (%) derived live from task statuses | Task 6 (phaseProgress memo) |
| Day counter (Day X / 14) from startDate | Task 6 (dayCount memo) |
| Existing Kanban, Tasks page, Wiki page — untouched | KanbanBoard.tsx not modified; TasksPage.tsx not modified |
| `bun run build` passes | Tasks 2, 3, 4, 5, 6, 7, 8, 9 each verify |
| `bun test` passes | Tasks 2, 3, 9 run tests; existing tests pass because storage change is transparent to the API |
| `PUT /api/projects/:id/shipfast` endpoint | Task 3 |
| `parseProject` / `serializeProject` in markdown.ts | Task 2 |
| Client data file `src/client/data/shipfast.ts` | Task 4 |
| `projectsApi.updateShipFast` in api.ts | Task 5 |
| `useShipFast` hook | Task 6 |
| ShipFast panel with phase columns, progress bars, day counter | Tasks 7, 8 |
| Phase activate button disabled after activation (✓ Generated badge) | Task 7 (ShipFastPanel + sf.activatedPhases check) |
| Enable form with platform/stack/monetization chips | Task 7 |
| Projects stored as `.md` with gray-matter (migration from JSON) | Task 3 |
| `PUT /:id` rename preserves shipfast metadata | Task 3 (reads existing project, spreads then overrides name) |
