# Projects Feature — Context Document

> Last updated: 2026-05-26  
> Purpose: Complete reference for anyone working on the Projects feature. Read this before making any changes.

---

## 1. What the Feature Does

The Projects feature lets users create named projects and associate tasks with them. Each project has its own Kanban board (filtered view of tasks). Projects optionally use **ShipFast mode** — a 14-day, 5-phase app-launch methodology that auto-generates structured task checklists per phase.

---

## 2. File Map

```
types.ts                                    # Project, ShipFastMeta types
src/
  server/
    routes/projects.ts                      # REST API router (factory pattern)
    routes/projects.test.ts                 # Integration tests (13 tests)
    lib/markdown.ts                         # parseProject / serializeProject
  client/
    pages/ProjectsPage.tsx                  # Main page — list + detail in one component
    hooks/useShipFast.ts                    # ShipFast logic: phase progress, activate, enable
    data/shipfast.ts                        # SHIPFAST_PHASES static data (5 phases, checklists)
    lib/api.ts                              # projectsApi (client HTTP layer)
  lib/
    acronym.ts                              # projectAcronym() — derives "ET" from "Ecommerce Tracker"
    slugify.ts                              # slugify() — derives project ID from name
```

---

## 3. Data Model

### `Project` (types.ts)
```ts
interface Project {
  id: string         // slugified name, e.g. "olympus-project" — immutable after creation
  name: string       // display name, can be changed via PUT /:id
  shipfast?: ShipFastMeta
}
```

### `ShipFastMeta` (types.ts)
```ts
interface ShipFastMeta {
  enabled: boolean
  startDate: string        // YYYY-MM-DD — used to compute dayCount
  platform: string[]       // ['iOS', 'Android', 'Web', 'All']
  techStack: string        // 'Flutter' | 'React Native' | 'Swift' | 'Kotlin' | 'Next.js'
  monetization: string     // 'Free+Ads' | 'One-time' | 'Freemium' | 'Subscription'
  currentPhase: number     // 1–5 — stored but NOT auto-advanced; display-only
  activatedPhases: number[] // which phases have had tasks generated via "Generate Tasks"
}
```

### Storage
- Each project = one `.md` file at `{WIKI_ROOT}/projects/{id}.md`
- Format: YAML frontmatter (gray-matter), empty body
- Example: `projects/olympus-project.md`
  ```yaml
  ---
  name: Olympus Project
  shipfast:
    enabled: true
    startDate: "2026-05-01"
    platform: [iOS, Android]
    techStack: Flutter
    monetization: Freemium
    currentPhase: 1
    activatedPhases: [1, 2]
  ---
  ```

---

## 4. API Routes (`src/server/routes/projects.ts`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project `{ name }` → 201 or 409 if duplicate |
| `PUT` | `/api/projects/:id` | Rename project `{ name }` — preserves id, preserves shipfast |
| `DELETE` | `/api/projects/:id` | Delete project file |
| `PUT` | `/api/projects/:id/shipfast` | Save/update ShipFastMeta on project |

**⚠️ Missing:** `GET /api/projects/:id` — there is **no single-project fetch route**. The client's `projectsApi.get(id)` (called in the URL sync effect) will always 404 silently.

---

## 5. Client API (`src/client/lib/api.ts`)

```ts
projectsApi.list()                        // GET /api/projects
projectsApi.get(id)                       // GET /api/projects/:id  ← BROKEN (route missing)
projectsApi.create(name)                  // POST /api/projects
projectsApi.update(id, name)              // PUT /api/projects/:id
projectsApi.remove(id)                    // DELETE /api/projects/:id
projectsApi.updateShipFast(id, meta)      // PUT /api/projects/:id/shipfast
```

---

## 6. ProjectsPage Component (`src/client/pages/ProjectsPage.tsx`)

~500 lines. Two views rendered by the same component:

**List view** (when `selectedProject === null`):
- Shows all projects with edit/delete inline
- ShipFast-enabled projects show a 🚀 badge
- Add new project via bottom form

**Detail view** (when `selectedProject` is set):
- Toolbar with back button, project name/id, edit/delete, and "+ New Task"
- ShipFast enable bar (if not enabled) OR ShipFast setup form OR ShipFast panel
- KanbanBoard showing only this project's tasks
- TaskPreviewModal for create/edit

**URL routing**: `/projects` = list, `/projects/:id` = detail. State sync is done via two `useEffect`s — one loads the full list, a second resolves the target project from the list or falls back to `projectsApi.get(id)` (which always 404s).

**State variables** (12 total):
```
projects, selectedProject, projectTasks, activeTask
newName, editingId, editName, adding
showEnableForm, enableForm
```

---

## 7. ShipFast Logic (`src/client/hooks/useShipFast.ts`)

```ts
useShipFast(project, tasks) → {
  isShipFastProject,   // project.shipfast?.enabled === true
  dayCount,            // days since startDate, clamped 1–14
  phaseProgress,       // Record<1..5, { total, done, pct }>
  enableShipFast(meta),  // PUT /:id/shipfast
  activatePhase(id),     // generates tasks + updates activatedPhases
}
```

**`activatePhase` flow:**
1. Find `SHIPFAST_PHASES[phaseId]`
2. Read/increment a **module-level** `seqMap: Map<string, number>` counter
3. For each checklist item: `tasksApi.create({ title: "ET-001: Write problem statement", tags: ['shipfast', 'phase-1'], ... })`
4. `projectsApi.updateShipFast(id, { ...meta, activatedPhases: [..., phaseId] })`

**⚠️ Bug:** `seqMap` is module-level — it resets on page reload. If a project already has tasks, the counter restarts at 1 and will generate duplicate-prefixed titles (e.g., `ET-001` again).

**Phase progress** is computed by filtering tasks where `tags` includes `'shipfast'` AND `'phase-N'`.

---

## 8. ShipFast Phases (`src/client/data/shipfast.ts`)

5 phases, all static:

| ID | Name | Days | Gate |
|----|------|------|------|
| 1 | Idea & Research | Days 1–2 | Go / No-Go |
| 2 | Design & Assets | Days 3–5 | Assets Ready |
| 3 | Development | Days 6–11 | RC Build |
| 4 | QA & Polish | Days 12–13 | Release Candidate |
| 5 | Release Prep | Day 14 | Submitted |

Each phase has a `checklist: { id, text }[]` used by `activatePhase` to generate tasks.

---

## 9. Known Bugs

| Severity | Description | Location |
|----------|-------------|----------|
| **High** | `GET /api/projects/:id` route missing — `projectsApi.get()` always 404s | `projects.ts` |
| **High** | `seqMap` resets on reload → duplicate task ID prefixes (e.g., `ET-001` again) | `useShipFast.ts:8` |
| **Medium** | Delete project doesn't cascade — orphaned tasks remain with `project: deleted-id` | `projects.ts:81` |
| **Low** | `ShipFastMeta.currentPhase` is stored but never auto-advanced; phase buttons don't update it | `useShipFast.ts` |
| **Low** | CSS has duplicate `.task-advance-btn` rules (defined at lines ~449 and ~748) | `index.css` |
| **Low** | `.project-name` CSS class defined but never used (`.project-name-link` is used instead) | `index.css:887` |

---

## 10. Missing Features / Improvement Opportunities

### High Value
1. **`GET /api/projects/:id` route** — needed for direct URL navigation to a project  
2. **Task count on project list** — show `(5 tasks)` badge per project in list view  
3. **Cascade delete** — when deleting a project, offer to delete or re-assign its tasks  
4. **`seqMap` fix** — derive sequence from existing task count instead of in-memory counter  

### Medium Value
5. **Project description field** — add `description?: string` to `Project` type and storage  
6. **ShipFast currentPhase auto-advance** — automatically advance `currentPhase` when all tasks in a phase are `done`  
7. **Manual phase advancement** — UI button to manually set the active phase  
8. **Error handling in UI** — show error toasts/messages when API calls fail (currently silent)  
9. **Projects list search/filter** — search by name; filter by ShipFast enabled  

### Low Value / Refactoring
10. **Decompose `ProjectsPage.tsx`** — extract `ProjectList`, `ProjectDetail`, `ShipFastEnableForm` as separate components  
11. **Project created-at timestamp** — add `createdAt: string` to data model (like tasks have `created`)  
12. **Project color/icon** — visual differentiation in the list  
13. **ShipFast 14-day limit** — currently hard-coded; could be configurable per project  

---

## 11. Test Coverage

| File | Tests | What's Covered |
|------|-------|----------------|
| `projects.test.ts` | 13 | All API routes: GET, POST, PUT, DELETE, PUT shipfast |
| `useShipFast.ts` | 0 | **Untested** — phase progress, activatePhase, enableShipFast |
| `api.ts` (projectsApi) | 0 | Thin HTTP wrapper, low priority |

To run project-specific tests:
```bash
bun test src/server/routes/projects.test.ts
```

---

## 12. Adding a New Project Feature — Checklist

Follow CLAUDE.md TDD guidelines:

1. Write test in `projects.test.ts` (server) or co-located test file (client hook/util)
2. Add/modify the API route in `projects.ts`
3. Update `types.ts` if the data model changes
4. Update `parseProject` / `serializeProject` in `markdown.ts`
5. Update `projectsApi` in `api.ts` if a new endpoint is added
6. Update `ProjectsPage.tsx` or extract to a sub-component
7. Run `bun test` — all tests must pass

---

## 13. Architecture Notes

- **File-based storage**: No database. Each project is a `.md` file. Reads all files on every `GET /` (acceptable at small scale; becomes slow at hundreds of projects).
- **Factory pattern**: `createProjectsRouter(wikiRoot)` — makes the router testable with temp directories.
- **ID is immutable**: `id = slugify(name)` at creation time. Rename (`PUT /:id`) only changes the display name, not the filename or id. This means renaming "My App" → "New App" keeps `id = my-app`.
- **ShipFast is opt-in per project**: The `shipfast` field is `undefined` by default. `isShipFastProject` checks `project.shipfast?.enabled === true`.
- **Task ↔ Project link**: Tasks have `project: string | null` (the project id). There is no index; filtering is done in-memory on the server by scanning all task files.
