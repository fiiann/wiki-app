import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import wiki from './routes/wiki'
import tasks from './routes/tasks'

const app = new Hono()

app.route('/api/wiki', wiki)
app.route('/api/tasks', tasks)

app.get('/api/health', (c) => c.json({ ok: true }))

if (process.env.NODE_ENV === 'production') {
  app.use('/assets/*', serveStatic({ root: './dist' }))
  app.get('/*', (c) => {
    return serveStatic({ path: './dist/index.html' })(c, async () => {})
  })
}

export default {
  port: 3001,
  fetch: app.fetch
}
