# Wiki-App Hermes Skill — Design Spec

**Date:** 2026-05-16
**Status:** Approved

---

## Goal

Add a Hermes skill that lets the agent fully manage the wiki-app (wiki pages, tasks, and projects) via its REST API, without needing the web UI. Includes smart workflows for common operations: summarising open tasks by project, creating tasks from natural language, and searching wiki pages by topic.

---

## Context

The wiki-app is a Hono/Bun web application deployed locally via Dokploy on `http://localhost:3002` (production). It exposes a JSON REST API with no authentication required. The web UI at `http://100.112.240.34:3001` is the visual front-end; Hermes will call the same backend directly.

Hermes skills are `SKILL.md` files with YAML frontmatter + markdown instructions. The agent reads them to understand what tools and workflows are available, then executes calls via its `terminal` tool. The Linear skill (at `~/.hermes/hermes-agent/skills/productivity/linear/`) is the canonical pattern to follow.

---

## Skill Location

```
~/.hermes/skills/productivity/wiki-app/
├── SKILL.md
└── scripts/
    └── wiki_api.py
```

The skill is placed in the global `~/.hermes/skills/` tree so all Hermes profiles can access it.

---

## SKILL.md

### Frontmatter

```yaml
---
name: wiki-app
description: "Manage wiki pages, tasks, and projects via the local wiki-app REST API (localhost:3002). CRUD for all resources plus smart workflows: summarise open tasks by project, create tasks from natural language, search wiki pages by topic."
version: 1.0.0
author: fianto74
platforms: [linux]
prerequisites:
  commands: [python3]
metadata:
  hermes:
    tags: [wiki, tasks, projects, productivity, local]
---
```

### Body sections

1. **Setup** — how to locate the script (find command, assign to `SCRIPT` variable)
2. **API Basics** — base URL, REST pattern, how to pipe output through `python3 -m json.tool`
3. **Python helper usage** — all subcommands with examples (see CLI Interface below)
4. **Smart Workflows** — explicit instructions for the three high-level workflows
5. **Direct curl** — raw curl examples for one-offs not covered by the script

---

## Python Helper: `wiki_api.py`

Zero external dependencies (stdlib only: `urllib.request`, `urllib.parse`, `json`, `argparse`, `sys`).

### Base URL

Hardcoded: `BASE_URL = "http://localhost:3002"`

### CLI Interface

```
wiki list [--search QUERY]
wiki get <path>
wiki create --title TITLE --body BODY [--path PATH]
wiki update <path> [--title TITLE] [--body BODY]
wiki delete <path>

tasks list [--status STATUS] [--project PROJECT] [--priority PRIORITY] [--summary]
tasks get <id>
tasks create --title TITLE [--status STATUS] [--project PROJECT] [--priority PRIORITY]
tasks update <id> [--status STATUS] [--title TITLE] [--project PROJECT] [--priority PRIORITY]
tasks delete <id>
tasks comments <id>
tasks comment <id> --content TEXT

projects list
projects create --name NAME
projects rename <id> --name NAME
projects delete <id>
```

### Behaviour details

**`wiki list --search QUERY`** — fetches `GET /api/wiki/files`, filters returned objects where `path` or `title` contains `QUERY` (case-insensitive), prints matching paths + titles.

**`tasks list --summary`** — fetches all tasks, groups by `project` field (null → "Unassigned"), prints a human-readable table per group showing count, task IDs, status, and priority. Respects any additional `--status`/`--project` filters passed alongside.

**`tasks create`** — POSTs to `/api/tasks`; maps `--priority` values `urgent/high/medium/low` (or numbers 1–4) to the API's numeric priority field.

**`wiki create --path PATH`** — if `--path` is omitted, auto-derives from `--title` via slugification (lowercase, hyphens, e.g. `My Page` → `my-page.md`).

**Error handling** — on non-2xx HTTP status, print the status code and response body to stderr, exit non-zero. On connection refused (API unreachable), print a helpful message: "wiki-app API unreachable at localhost:3002 — is Dokploy running?".

---

## Smart Workflows (SKILL.md instructions)

### 1. "What are my open tasks?" / "Summarise tasks"

```
python3 "$SCRIPT" tasks list --summary
```

Output example:
```
wiki-app (2 open)
  [todo]        2026-05-14-fix-kanban-drag      high
  [in-progress] 2026-05-15-add-comments-ui      medium

Unassigned (1 open)
  [todo]        2026-05-12-refactor-routes       low
```

SKILL.md instructs the agent: run this command and present the output in a readable summary. Do not reformat manually.

### 2. "Create a task: [natural language]"

SKILL.md instructs the agent:
1. Extract `title`, `project` (match against `projects list` output), `priority`, and `status` from the user's message.
2. If `project` is ambiguous or not mentioned, ask once before creating.
3. Run `tasks create` with the inferred fields.
4. Confirm back to the user: "Created task `<id>` — '<title>' in project <project>."

### 3. "Find wiki pages about [topic]"

```
python3 "$SCRIPT" wiki list --search <topic>
```

SKILL.md instructs the agent: run this and present matching paths as a list. If zero results, say so and offer to broaden the search.

---

## API Reference Summary

| Resource | Endpoints |
|----------|-----------|
| Wiki files | `GET /api/wiki/files`, `GET /api/wiki/files/*`, `POST /api/wiki/files`, `PUT /api/wiki/files/*`, `DELETE /api/wiki/files/*` |
| Tasks | `GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id` |
| Comments | `GET /api/tasks/:id/comments`, `POST /api/tasks/:id/comments`, `DELETE /api/tasks/:id/comments/:commentId` |
| Projects | `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` |

All requests/responses are `application/json`. No auth header required.

---

## What Is NOT In Scope

- Comment deletion via the helper script (available via direct curl if needed)
- Wiki file search by body content (only title/path matching)
- Moving/renaming wiki files to a different path
- Multi-profile skill registration (skill is dropped in global `~/.hermes/skills/`; Hermes auto-discovers it)

---

## Testing

1. Start the Dokploy container and verify: `curl http://localhost:3002/api/health` → `{"ok":true,"mode":"production"}`
2. Run `python3 wiki_api.py projects list` — should return the current project list.
3. Run `python3 wiki_api.py tasks list --summary` — should group tasks by project.
4. Run `python3 wiki_api.py wiki list --search tasks` — should return wiki pages with "tasks" in their path.
5. Ask Hermes "what are my open tasks?" and verify it runs `tasks list --summary` and presents a readable summary.
6. Ask Hermes "create a task: write unit tests for the projects route, project wiki-app, high priority" and verify it creates the task correctly.
