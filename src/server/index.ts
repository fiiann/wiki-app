import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import wiki from './routes/wiki'
import tasks from './routes/tasks'

const app = new Hono()

// API routes first — always take precedence
app.route('/api/wiki', wiki)
app.route('/api/tasks', tasks)
app.get('/api/health', (c) => c.json({ ok: true, mode: process.env.NODE_ENV ?? 'development' }))

// Static assets (hashed filenames from Vite build)
if (process.env.NODE_ENV === 'production') {
  app.use('/assets/*', serveStatic({ root: './dist' }))
  // SPA fallback — all non-API routes serve index.html
  app.get('/*', async (c) => {
    const file = Bun.file('./dist/index.html')
    const exists = await file.exists()
    if (!exists) return c.text('Run `bun run build` first', 503)
    return new Response(file, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  })
}

export default {
  port: 3001,
  fetch: app.fetch
}
