# Deploying Wiki App via Dokploy

This guide covers the full deployment process: from building the Docker image to going live on `garfianto.web.id` via Dokploy.

---

## Prerequisites

- VPS with Dokploy installed and running on port `3000`
- Docker installed on the VPS
- Domain DNS access (to point `garfianto.web.id` to your VPS IP)
- Wiki data directory at `/home/ubuntu/wiki` on the VPS

---

## Project Files Overview

```
wiki-app/
├── Dockerfile          # Two-stage build: installs deps, builds Vite frontend, runs Hono server
├── docker-compose.yml  # Dokploy Compose config: volume mount, env vars, Traefik labels
├── .dockerignore       # Excludes node_modules, dist, .git from build context
└── deploy-setup.sh     # Script to regenerate docker-compose.yml with a custom domain
```

---

## Step 1 — Understand the Docker Setup

### How the container works

The app runs as a single container:
- **Hono server** (port `3001`) serves both the API and the built Vite frontend
- **Wiki files** are read from `/app/wiki` inside the container, mounted from `/home/ubuntu/wiki` on the host
- **Environment variables:**
  - `NODE_ENV=production` — enables static file serving from `dist/`
  - `WIKI_ROOT=/app/wiki` — tells the server where to find wiki markdown files

### The Dockerfile (two-stage build)

```
Stage 1 (builder):
  - Installs dependencies with bun
  - Runs `bun run build` → produces dist/ (Vite frontend)

Stage 2 (production):
  - Copies dist/ and src/ from builder
  - Runs: bun src/server/index.ts
  - Exposes port 3001
```

### The docker-compose.yml

```yaml
services:
  wiki-app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      WIKI_ROOT: /app/wiki
    volumes:
      - /home/ubuntu/wiki:/app/wiki   # host wiki dir → container
    restart: unless-stopped
    networks:
      - dokploy-network               # shared Traefik network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.wiki-app.rule=Host(`garfianto.web.id`)"
      - "traefik.http.routers.wiki-app.entrypoints=websecure"
      - "traefik.http.routers.wiki-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.wiki-app.loadbalancer.server.port=3001"

networks:
  dokploy-network:
    external: true
```

> The `dokploy-network` is created automatically by Dokploy. Traefik reads the labels to route `garfianto.web.id` → port `3001` inside the container, and provisions an SSL certificate via Let's Encrypt.

---

## Step 2 — DNS Configuration

Before deploying, point your domain to the VPS.

1. Log into your DNS provider
2. Add an **A record**:
   - **Name:** `garfianto.web.id` (or `@` if it's the root domain)
   - **Value:** your VPS public IP address
   - **TTL:** 300 (or lowest available)

DNS can take a few minutes to propagate. You can check with:

```bash
dig garfianto.web.id
```

---

## Step 3 — Deploy via Dokploy

### 3.1 — Open Dokploy dashboard

Go to `http://YOUR_VPS_IP:3000` in your browser.

### 3.2 — Create a Project

1. Click **"Create Project"**
2. Name it: `wiki-app`
3. Click **Create**

### 3.3 — Create a Compose Service

1. Inside the `wiki-app` project, click **"Create Service"**
2. Choose **"Compose"**
3. Configure the source:
   - **Source type:** Path
   - **Path:** `/home/ubuntu/wiki-app`
   - **Compose file:** `docker-compose.yml`
4. Click **Save**

### 3.4 — Deploy

1. Click the **"Deploy"** button
2. Dokploy will:
   - Build the Docker image from the Dockerfile
   - Start the container with the volume mount and env vars
   - Register the Traefik routing rules for `garfianto.web.id`
   - Provision an SSL certificate automatically

Watch the deploy logs in the Dokploy UI for any errors.

---

## Step 4 — Verify the Deployment

### Check the container is running

```bash
sudo docker ps | grep wiki-app
```

Expected output: a running container with status `healthy`.

### Test the API directly (on the VPS)

```bash
curl http://localhost:3001/api/wiki/files
```

Expected: a JSON array of wiki file metadata (not empty).

### Test via domain

```bash
curl https://garfianto.web.id/api/wiki/files
```

Expected: same JSON array. If this works, the full stack is live.

### Open in browser

Visit `https://garfianto.web.id` — the wiki app should load with your files listed in the sidebar.

---

## Redeploying After Code Changes

1. Push your changes to the project files on the VPS (`/home/ubuntu/wiki-app`)
2. In Dokploy, go to the `wiki-app` service
3. Click **"Redeploy"** — Dokploy rebuilds the image and restarts the container

---

## Changing the Domain

If you need to deploy to a different domain, run:

```bash
cd /home/ubuntu/wiki-app
./deploy-setup.sh
```

Enter the new domain when prompted. It regenerates `docker-compose.yml` with the correct Traefik label, then redeploy via Dokploy.

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Wiki is empty | Is `/home/ubuntu/wiki` mounted? Run `sudo docker inspect <container-id>` and look for `Mounts` |
| SSL not working | DNS hasn't propagated yet — wait a few minutes and redeploy |
| 502 Bad Gateway | Container may have crashed — check logs: `sudo docker logs <container-id>` |
| Dokploy can't find compose file | Confirm path `/home/ubuntu/wiki-app/docker-compose.yml` exists |
| Port conflict | Ensure nothing else is bound to port `3001` on the host |
