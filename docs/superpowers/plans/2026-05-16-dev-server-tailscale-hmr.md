# Dev Server on Port 3001 (Tailscale + Full HMR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the wiki-app dev server accessible at `http://100.112.240.34:3001` via Tailscale with full HMR (frontend hot reload + backend auto-restart), running persistently in a tmux session.

**Architecture:** Vite dev server moves to `0.0.0.0:3001` (externally accessible, Tailscale-reachable), proxying `/api/*` to the Bun backend on `localhost:3003`. The production Docker setup (Dokploy on port 3002) is unaffected because the backend defaults to port 3001 when `PORT` is not set — matching the existing Docker config.

**Tech Stack:** Bun, Vite 5, Hono, concurrently, tmux

---

## Current State

Before any changes:
- `localhost:3001` — orphaned `bun src/server/index.ts` (pid 832436, no hot reload)
- `localhost:5173` — Vite dev server, bound to **127.0.0.1 only** (unreachable from Tailscale)
- `localhost:3002` — Dokploy Docker production container (leave untouched)
- `bun --watch` dev server (pid 876479) is running but **cannot bind to 3001** (blocked by the orphan)

## File Map

| File | Change |
|------|--------|
| `vite.config.ts` | Add `server.host`, change `server.port` to 3001, update proxy target to `:3003` |
| `src/server/index.ts` | Use `PORT` env var (default 3001 preserves Docker) |
| `package.json` | Prefix `dev:server` with `PORT=3003` |

---

### Task 1: Kill the blocking processes

**Files:** none

- [ ] **Step 1: Kill the orphaned bun server and broken dev chain**

```bash
kill 832436 876468 876475 876476 876477 876478 876479 2>/dev/null; echo "done"
```

Expected output: `done` (errors about "no such process" are fine — they may have already exited)

- [ ] **Step 2: Verify port 3001 is now free**

```bash
ss -tlnp | grep 3001
```

Expected output: empty (no lines). If something still shows, kill it: `kill <pid>`.

- [ ] **Step 3: Verify port 3002 (production) is still running**

```bash
ss -tlnp | grep 3002
```

Expected output: a line showing `0.0.0.0:3002` — the Dokploy container is unaffected.

---

### Task 2: Update `vite.config.ts` to run on 0.0.0.0:3001

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update the file**

Replace the entire file content with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
```

Key changes:
- `host: '0.0.0.0'` — binds to all interfaces (required for Tailscale access)
- `port: 3001` — Vite now owns this port
- proxy target changes from `:3001` to `:3003` (backend moves to 3003 in dev)

- [ ] **Step 2: Commit**

```bash
cd /home/ubuntu/wiki-app
git add vite.config.ts
git commit -m "feat: bind vite dev server to 0.0.0.0:3001 for Tailscale access"
```

---

### Task 3: Update `src/server/index.ts` to use `PORT` env var

**Files:**
- Modify: `src/server/index.ts`

Why: Hardcoded port 3001 conflicts with Vite in dev. Using `PORT` env var lets dev use 3003 while production (Docker, no `PORT` set) keeps 3001.

- [ ] **Step 1: Update the port line**

In `src/server/index.ts`, change the export at the bottom (currently lines 27-30):

```ts
export default {
  port: 3001,
  fetch: app.fetch
}
```

To:

```ts
export default {
  port: Number(process.env.PORT) || 3001,
  fetch: app.fetch
}
```

The rest of the file is unchanged.

- [ ] **Step 2: Verify production is unaffected**

The Dokploy `docker-compose.yml` does not set `PORT`, so `process.env.PORT` will be `undefined` in the container → falls back to `3001`. No Docker config change needed.

- [ ] **Step 3: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: use PORT env var for server port (default 3001)"
```

---

### Task 4: Update `package.json` `dev:server` script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update the dev:server script**

In `package.json`, change:

```json
"dev:server": "bun --watch src/server/index.ts",
```

To:

```json
"dev:server": "PORT=3003 bun --watch src/server/index.ts",
```

Full scripts block after change:

```json
"scripts": {
  "dev": "concurrently \"bun run dev:server\" \"vite\"",
  "dev:server": "PORT=3003 bun --watch src/server/index.ts",
  "build": "vite build",
  "start": "NODE_ENV=production bun src/server/index.ts",
  "test": "bun test"
},
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "feat: run dev backend on PORT=3003 to free 3001 for Vite"
```

---

### Task 5: Start dev server in tmux and verify end-to-end

**Files:** none

- [ ] **Step 1: Start a named tmux session with the dev server**

```bash
tmux new-session -d -s wiki-dev -c /home/ubuntu/wiki-app 'bun run dev'
```

This starts `bun run dev` (which runs `concurrently "PORT=3003 bun --watch ..."  "vite"`) in the background. It survives SSH disconnects.

- [ ] **Step 2: Tail the logs briefly to confirm startup**

```bash
tmux pipe-pane -t wiki-dev -o 'cat >> /tmp/wiki-dev.log'
sleep 3
cat /tmp/wiki-dev.log
```

Expected: output showing both Vite (e.g. `VITE v5.x.x  ready in ... ms`) and the bun server starting. No "address already in use" errors.

- [ ] **Step 3: Verify ports**

```bash
ss -tlnp | grep -E '3001|3003'
```

Expected:
```
LISTEN  *:3001   users:(("node",...))   # Vite on 0.0.0.0:3001
LISTEN  *:3003   users:(("bun",...))    # backend on 3003
```

- [ ] **Step 4: Test API reachability from host**

```bash
curl -s http://localhost:3001/api/health
```

Expected: `{"ok":true,"mode":"development"}`

- [ ] **Step 5: Test Tailscale reachability**

From your laptop, open a browser and navigate to:
```
http://100.112.240.34:3001
```

Expected: wiki-app loads. Open browser devtools → Network tab and look for a WebSocket connection to `ws://100.112.240.34:3001` — this is Vite HMR. If the connection appears, HMR is working.

- [ ] **Step 6: Verify live reload works**

Make a trivial visible change to any React component (e.g. add a space to a heading in `src/client/pages/TasksPage.tsx`). Save the file. The browser should update **without a full page refresh** within 1-2 seconds.

Revert the change when done:

```bash
git checkout src/client/pages/TasksPage.tsx
```

---

## tmux Quick Reference

```bash
tmux attach -t wiki-dev     # reconnect to the dev session
tmux kill-session -t wiki-dev  # stop the dev server
# Inside tmux: Ctrl+B then D to detach without stopping
```

## Rollback

If anything goes wrong, restore the original state:

```bash
git checkout vite.config.ts src/server/index.ts package.json
tmux kill-session -t wiki-dev 2>/dev/null
```

The Dokploy production container (port 3002) is unaffected by all of the above.
