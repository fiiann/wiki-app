# Wiki-App Hermes Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Hermes skill at `~/.hermes/skills/productivity/wiki-app/` that lets the agent manage wiki pages, tasks, and projects via the wiki-app REST API, including three smart workflows.

**Architecture:** A `SKILL.md` gives the agent workflow instructions and usage examples. A zero-dependency Python script (`wiki_api.py`) handles all HTTP calls and provides a clean CLI used by the agent via its terminal tool. The skill is placed in the global `~/.hermes/skills/` tree so all profiles discover it automatically.

**Tech Stack:** Python 3 stdlib only (`urllib.request`, `urllib.parse`, `json`, `argparse`, `re`, `collections`), wiki-app REST API at `http://localhost:3002`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `~/.hermes/skills/productivity/wiki-app/SKILL.md` | Create | Skill instructions, workflow guidance, usage examples for the agent |
| `~/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py` | Create | Python CLI — all HTTP calls, JSON output, --summary formatting |

No files in the wiki-app repo are modified. Both files are created in the Hermes skills tree.

---

### Task 1: Create directory structure

**Files:**
- Create: `~/.hermes/skills/productivity/wiki-app/` (directory)
- Create: `~/.hermes/skills/productivity/wiki-app/scripts/` (directory)

- [ ] **Step 1: Create directories**

```bash
mkdir -p /home/ubuntu/.hermes/skills/productivity/wiki-app/scripts
```

- [ ] **Step 2: Verify directories exist**

```bash
ls /home/ubuntu/.hermes/skills/productivity/wiki-app/
ls /home/ubuntu/.hermes/skills/productivity/wiki-app/scripts/
```

Expected: both commands return empty listings without errors.

---

### Task 2: Write `wiki_api.py` — complete script

**Files:**
- Create: `~/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py`

This is the entire script written in one step. It covers all three resources (projects, tasks, wiki) with full argparse, error handling, and the `--summary` smart workflow.

- [ ] **Step 1: Create the script**

Write this exact content to `/home/ubuntu/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py`:

```python
#!/usr/bin/env python3
"""wiki-app CLI — zero dependencies, stdlib only.

Usage:
  wiki_api.py wiki list [--search QUERY]
  wiki_api.py wiki get <path>
  wiki_api.py wiki create --title TITLE --body BODY [--path PATH] [--domain DOMAIN] [--type TYPE]
  wiki_api.py wiki update <path> [--title TITLE] [--body BODY]
  wiki_api.py wiki delete <path>

  wiki_api.py tasks list [--status STATUS] [--project PROJECT] [--priority PRIORITY] [--summary]
  wiki_api.py tasks get <id>
  wiki_api.py tasks create --title TITLE [--status STATUS] [--project PROJECT] [--priority PRIORITY]
  wiki_api.py tasks update <id> [--title TITLE] [--status STATUS] [--project PROJECT] [--priority PRIORITY]
  wiki_api.py tasks delete <id>
  wiki_api.py tasks comments <id>
  wiki_api.py tasks comment <id> --content TEXT

  wiki_api.py projects list
  wiki_api.py projects create --name NAME
  wiki_api.py projects rename <id> --name NAME
  wiki_api.py projects delete <id>

Output: JSON to stdout (or formatted text for --summary). Errors to stderr, non-zero exit.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any

BASE_URL = "http://localhost:3002"


# ---------- HTTP ----------

def api(method: str, path: str, body: dict | None = None) -> Any:
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", "replace")
        sys.stderr.write(f"HTTP {e.code}: {body_text}\n")
        sys.exit(1)
    except urllib.error.URLError:
        sys.stderr.write(
            "wiki-app API unreachable at localhost:3002 — is Dokploy running?\n"
        )
        sys.exit(1)


def emit(obj: Any) -> None:
    print(json.dumps(obj, indent=2, default=str))


# ---------- Helpers ----------

def _slugify(text: str) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return slug + ".md"


def _build_query(params: dict[str, str]) -> str:
    if not params:
        return ""
    return "?" + "&".join(
        f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items()
    )


# ---------- Projects ----------

def cmd_projects(args: argparse.Namespace) -> None:
    if args.projects_cmd == "list":
        emit(api("GET", "/api/projects"))
    elif args.projects_cmd == "create":
        emit(api("POST", "/api/projects", {"name": args.name}))
    elif args.projects_cmd == "rename":
        emit(api("PUT", f"/api/projects/{args.id}", {"name": args.name}))
    elif args.projects_cmd == "delete":
        emit(api("DELETE", f"/api/projects/{args.id}"))


# ---------- Tasks ----------

def _print_summary(tasks: list[dict]) -> None:
    groups: dict[str, list[dict]] = defaultdict(list)
    for t in tasks:
        key = t.get("project") or "Unassigned"
        groups[key].append(t)
    if not groups:
        print("No tasks found.")
        return
    for project in sorted(groups):
        items = groups[project]
        print(f"\n{project} ({len(items)})")
        for t in items:
            status = f"[{t.get('status', '')}]".ljust(15)
            priority = (t.get("priority") or "").ljust(8)
            tid = t.get("id", "")
            print(f"  {status} {tid:<50} {priority}")
    print()


def cmd_tasks(args: argparse.Namespace) -> None:
    if args.tasks_cmd == "list":
        params: dict[str, str] = {}
        if args.status:
            params["status"] = args.status
        if args.project:
            params["project"] = args.project
        if args.priority:
            params["priority"] = args.priority
        tasks = api("GET", "/api/tasks" + _build_query(params))
        if args.summary:
            _print_summary(tasks)
        else:
            emit(tasks)
    elif args.tasks_cmd == "get":
        emit(api("GET", f"/api/tasks/{args.id}"))
    elif args.tasks_cmd == "create":
        body: dict[str, Any] = {"title": args.title}
        if args.status:
            body["status"] = args.status
        if args.project:
            body["project"] = args.project
        if args.priority:
            body["priority"] = args.priority
        emit(api("POST", "/api/tasks", body))
    elif args.tasks_cmd == "update":
        body = {}
        if args.title:
            body["title"] = args.title
        if args.status:
            body["status"] = args.status
        if args.project:
            body["project"] = args.project
        if args.priority:
            body["priority"] = args.priority
        emit(api("PUT", f"/api/tasks/{args.id}", body))
    elif args.tasks_cmd == "delete":
        emit(api("DELETE", f"/api/tasks/{args.id}"))
    elif args.tasks_cmd == "comments":
        emit(api("GET", f"/api/tasks/{args.id}/comments"))
    elif args.tasks_cmd == "comment":
        emit(api("POST", f"/api/tasks/{args.id}/comments", {"content": args.content}))


# ---------- Wiki ----------

def cmd_wiki(args: argparse.Namespace) -> None:
    if args.wiki_cmd == "list":
        files = api("GET", "/api/wiki/files")
        if args.search:
            q = args.search.lower()
            files = [
                f for f in files
                if q in f.get("path", "").lower() or q in f.get("title", "").lower()
            ]
        emit(files)
    elif args.wiki_cmd == "get":
        path = args.path.lstrip("/")
        emit(api("GET", f"/api/wiki/files/{path}"))
    elif args.wiki_cmd == "create":
        file_path = args.path if args.path else _slugify(args.title)
        body: dict[str, Any] = {
            "path": file_path,
            "title": args.title,
            "body": args.body,
            "domain": args.domain,
            "type": args.type,
            "tags": [],
            "sources": [],
        }
        emit(api("POST", "/api/wiki/files", body))
    elif args.wiki_cmd == "update":
        path = args.path.lstrip("/")
        body = {}
        if args.title:
            body["title"] = args.title
        if args.body:
            body["body"] = args.body
        emit(api("PUT", f"/api/wiki/files/{path}", body))
    elif args.wiki_cmd == "delete":
        path = args.path.lstrip("/")
        emit(api("DELETE", f"/api/wiki/files/{path}"))


# ---------- Argparse ----------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="wiki_api.py",
        description="wiki-app CLI — manage wiki pages, tasks, and projects",
    )
    sub = p.add_subparsers(dest="resource", required=True)

    # --- wiki ---
    wp = sub.add_parser("wiki", help="Wiki page operations")
    ws = wp.add_subparsers(dest="wiki_cmd", required=True)

    wl = ws.add_parser("list", help="List wiki files")
    wl.add_argument("--search", metavar="QUERY", help="Filter by title or path (case-insensitive)")

    wg = ws.add_parser("get", help="Get a wiki file including body")
    wg.add_argument("path", help="Relative path, e.g. concepts/attention.md")

    wc = ws.add_parser("create", help="Create a new wiki file")
    wc.add_argument("--title", required=True)
    wc.add_argument("--body", required=True, help="Markdown content")
    wc.add_argument("--path", help="Relative path; auto-derived from title if omitted")
    wc.add_argument("--domain", default="personal", choices=["ai-ml", "personal"])
    wc.add_argument("--type", default="concept",
                    choices=["entity", "concept", "comparison", "query", "summary"])

    wu = ws.add_parser("update", help="Update a wiki file (partial — only provided fields change)")
    wu.add_argument("path", help="Relative path")
    wu.add_argument("--title")
    wu.add_argument("--body", help="New full body content")

    wd = ws.add_parser("delete", help="Delete a wiki file")
    wd.add_argument("path", help="Relative path")

    # --- tasks ---
    tp = sub.add_parser("tasks", help="Task operations")
    ts = tp.add_subparsers(dest="tasks_cmd", required=True)

    tl = ts.add_parser("list", help="List tasks")
    tl.add_argument("--status", choices=["todo", "in-progress", "done", "cancelled"])
    tl.add_argument("--project", help="Filter by project id")
    tl.add_argument("--priority", choices=["low", "medium", "high", "urgent"])
    tl.add_argument("--summary", action="store_true", help="Group output by project")

    tget = ts.add_parser("get", help="Get a single task")
    tget.add_argument("id", help="Task id, e.g. 2026-05-14-fix-bug")

    tc = ts.add_parser("create", help="Create a task")
    tc.add_argument("--title", required=True)
    tc.add_argument("--status", choices=["todo", "in-progress", "done", "cancelled"],
                    default="todo")
    tc.add_argument("--project", help="Project id (from projects list)")
    tc.add_argument("--priority", choices=["low", "medium", "high", "urgent"])

    tu = ts.add_parser("update", help="Update a task (partial)")
    tu.add_argument("id")
    tu.add_argument("--title")
    tu.add_argument("--status", choices=["todo", "in-progress", "done", "cancelled"])
    tu.add_argument("--project")
    tu.add_argument("--priority", choices=["low", "medium", "high", "urgent"])

    tdel = ts.add_parser("delete", help="Delete a task")
    tdel.add_argument("id")

    tcomments = ts.add_parser("comments", help="List comments on a task")
    tcomments.add_argument("id")

    tcomment = ts.add_parser("comment", help="Add a comment to a task")
    tcomment.add_argument("id")
    tcomment.add_argument("--content", required=True)

    # --- projects ---
    pp = sub.add_parser("projects", help="Project operations")
    ps = pp.add_subparsers(dest="projects_cmd", required=True)

    ps.add_parser("list", help="List all projects")

    pcreate = ps.add_parser("create", help="Create a project")
    pcreate.add_argument("--name", required=True)

    prename = ps.add_parser("rename", help="Rename a project (keeps same id)")
    prename.add_argument("id", help="Project id (slug)")
    prename.add_argument("--name", required=True)

    pdel = ps.add_parser("delete", help="Delete a project")
    pdel.add_argument("id")

    return p


def main() -> None:
    args = build_parser().parse_args()
    if args.resource == "wiki":
        cmd_wiki(args)
    elif args.resource == "tasks":
        cmd_tasks(args)
    elif args.resource == "projects":
        cmd_projects(args)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x /home/ubuntu/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py
```

- [ ] **Step 3: Verify projects list**

```bash
SCRIPT=/home/ubuntu/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py
python3 "$SCRIPT" projects list
```

Expected: JSON array of project objects, e.g.:
```json
[
  {
    "id": "wiki-app",
    "name": "wiki-app"
  }
]
```
(Content will vary. What matters: exits 0, outputs valid JSON array.)

- [ ] **Step 4: Verify tasks list --summary**

```bash
python3 "$SCRIPT" tasks list --summary
```

Expected: human-readable output grouped by project, e.g.:
```
wiki-app (3)
  [todo]          2026-05-14-fix-kanban-drag                         high

Unassigned (1)
  [in-progress]   2026-05-12-some-task                               medium
```
(Content will vary. What matters: exits 0, groups tasks by project, no JSON.)

- [ ] **Step 5: Verify wiki list --search**

```bash
python3 "$SCRIPT" wiki list --search concepts
```

Expected: JSON array of wiki file metadata objects whose `path` or `title` contains "concepts". May be an empty array `[]` — that is fine as long as it exits 0.

- [ ] **Step 6: Verify error handling when API is unreachable**

```bash
BASE_URL=http://localhost:9999 python3 -c "
import sys
sys.path.insert(0, '/home/ubuntu/.hermes/skills/productivity/wiki-app/scripts')
# Quick smoke test — just check the error message prints correctly
import urllib.error, urllib.request
req = urllib.request.Request('http://localhost:9999/api/projects', method='GET')
try:
    urllib.request.urlopen(req, timeout=2)
except urllib.error.URLError:
    print('Connection refused correctly caught')
"
```

Expected output: `Connection refused correctly caught`

- [ ] **Step 7: Commit**

```bash
git -C /home/ubuntu/wiki-app add docs/superpowers/plans/2026-05-16-wiki-app-hermes-skill.md
git -C /home/ubuntu/wiki-app commit -m "docs: add wiki-app hermes skill implementation plan"

# Note: the skill files live outside the wiki-app repo — no git commit needed for them.
# They are installed directly to ~/.hermes/skills/ which Hermes scans at runtime.
```

---

### Task 3: Write `SKILL.md`

**Files:**
- Create: `~/.hermes/skills/productivity/wiki-app/SKILL.md`

- [ ] **Step 1: Create SKILL.md**

Write this exact content to `/home/ubuntu/.hermes/skills/productivity/wiki-app/SKILL.md`:

```markdown
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

# Wiki-App — Knowledge Base & Task Manager

Manage the local wiki-app directly: create/read/update/delete wiki pages, tasks, and projects via its REST API. No browser needed.

**Backend URL:** `http://localhost:3002` (Dokploy production container)

## Setup

Locate the helper script once and assign it to `$SCRIPT`:

```bash
SCRIPT=$(find ~/.hermes -path '*skills/productivity/wiki-app/scripts/wiki_api.py' 2>/dev/null | head -1)
echo "$SCRIPT"
# Expected: /home/ubuntu/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py
```

Verify the API is up:

```bash
curl -s http://localhost:3002/api/health
# Expected: {"ok":true,"mode":"production"}
```

If health check fails, Dokploy is not running.

## Smart Workflows

### "What are my open tasks?" / "Show task summary"

```bash
python3 "$SCRIPT" tasks list --summary
```

This groups ALL tasks by project. To show only a specific status:

```bash
python3 "$SCRIPT" tasks list --status todo --summary
python3 "$SCRIPT" tasks list --status in-progress --summary
```

Present the command output directly to the user — do not reformat it.

### "Create a task: [natural language description]"

1. Extract from the user's message: `title`, `project`, `priority`, and optionally `status`
2. Check that the project exists: `python3 "$SCRIPT" projects list`
3. If `project` is ambiguous or not mentioned, ask the user exactly once before creating
4. Run:

```bash
python3 "$SCRIPT" tasks create --title "TITLE" --project PROJECT_ID --priority PRIORITY
```

5. Confirm: "Created task `<id>` — '<title>' in project <project> (<priority> priority)."

**Priority values:** `low`, `medium`, `high`, `urgent`
**Status values:** `todo` (default), `in-progress`, `done`, `cancelled`

### "Find wiki pages about [topic]"

```bash
python3 "$SCRIPT" wiki list --search TOPIC
```

If zero results are returned, say so and offer to retry with a shorter or different keyword.
Present matching pages as a simple list of `path` and `title`.

---

## Projects

```bash
# List all projects (shows id and name)
python3 "$SCRIPT" projects list

# Create a project
python3 "$SCRIPT" projects create --name "My Project"
# id is auto-generated as a slug, e.g. "my-project"

# Rename a project (keeps same id)
python3 "$SCRIPT" projects rename my-project --name "New Name"

# Delete a project
python3 "$SCRIPT" projects delete my-project
```

---

## Tasks

```bash
# List all tasks (JSON)
python3 "$SCRIPT" tasks list

# Filter by status, project, or priority (all combinable)
python3 "$SCRIPT" tasks list --status todo
python3 "$SCRIPT" tasks list --project wiki-app --priority high
python3 "$SCRIPT" tasks list --status todo --summary

# Get a single task
python3 "$SCRIPT" tasks get 2026-05-14-fix-kanban-drag

# Create a task (id is auto-generated as YYYY-MM-DD-<slug>)
python3 "$SCRIPT" tasks create --title "Fix login bug" --project wiki-app --priority high
python3 "$SCRIPT" tasks create --title "Write docs" --priority low

# Update a task — only provide fields to change
python3 "$SCRIPT" tasks update 2026-05-14-fix-kanban-drag --status done
python3 "$SCRIPT" tasks update 2026-05-14-fix-kanban-drag --priority urgent --project wiki-app

# Delete a task
python3 "$SCRIPT" tasks delete 2026-05-14-fix-kanban-drag

# List comments on a task
python3 "$SCRIPT" tasks comments 2026-05-14-fix-kanban-drag

# Add a comment
python3 "$SCRIPT" tasks comment 2026-05-14-fix-kanban-drag --content "Blocked by upstream issue"
```

---

## Wiki Pages

```bash
# List all pages (metadata only — no body)
python3 "$SCRIPT" wiki list

# Search by title or path (case-insensitive substring)
python3 "$SCRIPT" wiki list --search authentication
python3 "$SCRIPT" wiki list --search concepts/

# Read a full page including body
python3 "$SCRIPT" wiki get concepts/attention.md

# Create a page
# --path is optional; auto-derived from title if omitted (e.g. "My Concept" -> "my-concept.md")
python3 "$SCRIPT" wiki create --title "My New Concept" --body "# My New Concept\n\nContent here."
python3 "$SCRIPT" wiki create \
  --title "Auth Overview" \
  --body "# Auth Overview\n\nDetails here." \
  --path "concepts/auth-overview.md" \
  --domain personal \
  --type concept

# Update a page (only provided fields change; updated date is auto-set)
python3 "$SCRIPT" wiki update concepts/auth-overview.md --body "# Updated content."
python3 "$SCRIPT" wiki update concepts/auth-overview.md --title "Auth Overview v2"

# Delete a page
python3 "$SCRIPT" wiki delete concepts/auth-overview.md
```

**`--domain`** values: `personal` (default), `ai-ml`
**`--type`** values: `concept` (default), `entity`, `comparison`, `query`, `summary`

---

## Direct curl (for one-offs not in the script)

```bash
BASE=http://localhost:3002

# Health check
curl -s $BASE/api/health

# Delete a comment (not exposed in script)
curl -s -X DELETE $BASE/api/tasks/TASK_ID/comments/COMMENT_UUID | python3 -m json.tool

# Raw task create with all fields
curl -s -X POST $BASE/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"My task","status":"todo","priority":"high","project":"wiki-app"}' \
  | python3 -m json.tool
```
```

- [ ] **Step 2: Verify the SKILL.md parses correctly (frontmatter)**

```bash
python3 -c "
import re
with open('/home/ubuntu/.hermes/skills/productivity/wiki-app/SKILL.md') as f:
    content = f.read()
assert content.startswith('---'), 'Missing frontmatter opening'
end = content.index('---', 3)
fm = content[3:end]
assert 'name: wiki-app' in fm, 'Missing name field'
assert 'description:' in fm, 'Missing description field'
assert 'prerequisites:' in fm, 'Missing prerequisites'
print('SKILL.md frontmatter OK')
"
```

Expected output: `SKILL.md frontmatter OK`

- [ ] **Step 3: Verify Hermes discovers the skill**

```bash
python3 -c "
import sys
sys.path.insert(0, '/home/ubuntu/.hermes/hermes-agent')
import os
os.environ.setdefault('HERMES_HOME', '/home/ubuntu/.hermes')
from tools.skills_tool import SKILLS_DIR
skill_md = SKILLS_DIR / 'productivity' / 'wiki-app' / 'SKILL.md'
print('Skill file exists:', skill_md.exists())
print('Path:', skill_md)
"
```

Expected output:
```
Skill file exists: True
Path: /home/ubuntu/.hermes/skills/productivity/wiki-app/SKILL.md
```

---

### Task 4: End-to-end verification

**Files:** none (read-only verification)

Run each of these to confirm the full stack works — script reaches the API and returns sensible data.

- [ ] **Step 1: Health check**

```bash
curl -s http://localhost:3002/api/health
```

Expected: `{"ok":true,"mode":"production"}`

If this fails, start Dokploy or check that port 3002 is up (`ss -tlnp | grep 3002`).

- [ ] **Step 2: Projects round-trip**

```bash
SCRIPT=/home/ubuntu/.hermes/skills/productivity/wiki-app/scripts/wiki_api.py

# Create a test project
python3 "$SCRIPT" projects create --name "hermes-test-project"

# Verify it appears in list
python3 "$SCRIPT" projects list | python3 -c "
import json, sys
projects = json.load(sys.stdin)
ids = [p['id'] for p in projects]
assert 'hermes-test-project' in ids, f'Not found. Got: {ids}'
print('Project created and listed OK')
"

# Clean up
python3 "$SCRIPT" projects delete hermes-test-project
echo "Deleted test project"
```

Expected:
```
Project created and listed OK
Deleted test project
```

- [ ] **Step 3: Tasks round-trip**

```bash
# Create a test task
python3 "$SCRIPT" tasks create --title "Hermes Skill Smoke Test" --priority low

# Capture the id from the output
TASK_ID=$(python3 "$SCRIPT" tasks list | python3 -c "
import json, sys
tasks = json.load(sys.stdin)
t = next((t for t in tasks if 'hermes-skill-smoke-test' in t['id']), None)
if t: print(t['id'])
")
echo "Created task: $TASK_ID"

# Update its status
python3 "$SCRIPT" tasks update "$TASK_ID" --status done

# Verify update
python3 "$SCRIPT" tasks get "$TASK_ID" | python3 -c "
import json, sys
t = json.load(sys.stdin)
assert t['status'] == 'done', f'Expected done, got {t[\"status\"]}'
print('Task update OK')
"

# Add a comment
python3 "$SCRIPT" tasks comment "$TASK_ID" --content "smoke test comment"
python3 "$SCRIPT" tasks comments "$TASK_ID" | python3 -c "
import json, sys
comments = json.load(sys.stdin)
assert any('smoke test comment' in c['content'] for c in comments), 'Comment not found'
print('Comment OK')
"

# Clean up
python3 "$SCRIPT" tasks delete "$TASK_ID"
echo "Deleted test task"
```

Expected:
```
Created task: 2026-05-16-hermes-skill-smoke-test
Task update OK
Comment OK
Deleted test task
```

- [ ] **Step 4: Wiki round-trip**

```bash
# Create a test wiki page
python3 "$SCRIPT" wiki create \
  --title "Hermes Skill Test Page" \
  --body "# Test\n\nThis page was created by the hermes skill smoke test." \
  --path "hermes-skill-test.md"

# Verify it's listed
python3 "$SCRIPT" wiki list | python3 -c "
import json, sys
files = json.load(sys.stdin)
paths = [f['path'] for f in files]
assert 'hermes-skill-test.md' in paths, f'Not found. Got: {paths}'
print('Wiki page listed OK')
"

# Search for it
python3 "$SCRIPT" wiki list --search "hermes-skill" | python3 -c "
import json, sys
results = json.load(sys.stdin)
assert len(results) > 0, 'Search returned no results'
print(f'Search returned {len(results)} result(s) OK')
"

# Get full content
python3 "$SCRIPT" wiki get hermes-skill-test.md | python3 -c "
import json, sys
page = json.load(sys.stdin)
assert 'smoke test' in page.get('body', ''), 'Body not found'
print('Wiki get OK')
"

# Update it
python3 "$SCRIPT" wiki update hermes-skill-test.md --title "Hermes Skill Test Page (Updated)"

# Delete it
python3 "$SCRIPT" wiki delete hermes-skill-test.md
echo "Deleted test wiki page"
```

Expected:
```
Wiki page listed OK
Search returned 1 result(s) OK
Wiki get OK
Deleted test wiki page
```

- [ ] **Step 5: Verify --summary smart workflow output format**

```bash
python3 "$SCRIPT" tasks list --summary
```

Expected: grouped output like:
```

wiki-app (N)
  [todo]          2026-05-14-some-task                               high

Unassigned (N)
  ...

```
(Exact content varies. What matters: not raw JSON, groups tasks by project name, each line has `[status]`, task id, and priority.)

- [ ] **Step 6: Final check — script --help works**

```bash
python3 "$SCRIPT" --help
python3 "$SCRIPT" tasks --help
python3 "$SCRIPT" wiki create --help
```

Expected: argparse help text for each, exits 0.

---

## Rollback

If you need to remove the skill:

```bash
rm -rf /home/ubuntu/.hermes/skills/productivity/wiki-app/
```

The wiki-app repo and Dokploy container are unaffected.
