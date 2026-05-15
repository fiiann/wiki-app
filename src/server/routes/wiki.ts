import { Hono } from 'hono'
import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { parseWikiFile, serializeWikiFile } from '../lib/markdown'
import type { WikiFile } from '../../../types'

const WIKI_ROOT = '/home/ubuntu/wiki'
const EXCLUDE_DIRS = new Set(['tasks', 'docs', '_meta', '.superpowers'])

const wiki = new Hono()

wiki.get('/files', async (c) => {
  const files = await walkDir(WIKI_ROOT)
  const results = await Promise.all(
    files.map(async (fullPath) => {
      const content = await readFile(fullPath, 'utf-8')
      const rel = fullPath.slice(WIKI_ROOT.length + 1)
      const { body, ...meta } = parseWikiFile(content, rel)
      return meta
    })
  )
  return c.json(results)
})

wiki.get('/files/*', async (c) => {
  const path = c.req.path.split('/files/')[1]
  const fullPath = join(WIKI_ROOT, path)
  try {
    const content = await readFile(fullPath, 'utf-8')
    return c.json(parseWikiFile(content, path))
  } catch {
    return c.json({ error: 'Not found' }, 404)
  }
})

wiki.post('/files', async (c) => {
  const body = await c.req.json<WikiFile>()
  const today = todayStr()
  const file: WikiFile = { ...body, created: today, updated: today }
  const fullPath = join(WIKI_ROOT, file.path)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, serializeWikiFile(file), 'utf-8')
  return c.json(file, 201)
})

wiki.put('/files/*', async (c) => {
  const path = c.req.path.split('/files/')[1]
  const fullPath = join(WIKI_ROOT, path)
  try {
    const existing = await readFile(fullPath, 'utf-8')
    const parsed = parseWikiFile(existing, path)
    const updates = await c.req.json<Partial<WikiFile>>()
    const updated: WikiFile = { ...parsed, ...updates, path, updated: todayStr() }
    await writeFile(fullPath, serializeWikiFile(updated), 'utf-8')
    return c.json(updated)
  } catch {
    return c.json({ error: 'Not found' }, 404)
  }
})

wiki.delete('/files/*', async (c) => {
  const path = c.req.path.split('/files/')[1]
  const fullPath = join(WIKI_ROOT, path)
  try {
    await unlink(fullPath)
    return c.json({ deleted: path })
  } catch {
    return c.json({ error: 'Not found' }, 404)
  }
})

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await walkDir(full))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export default wiki
