import { useState, useEffect } from 'react'
import FileTree from '../components/FileTree'
import Editor from '../components/Editor'
import NewPageForm from '../components/NewPageForm'
import { wikiApi } from '../lib/api'
import type { WikiFile, WikiFileMeta } from '../../../types'

export default function WikiPage() {
  const [files, setFiles] = useState<WikiFileMeta[]>([])
  const [selected, setSelected] = useState<WikiFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    wikiApi.list().then(setFiles).catch(console.error)
  }, [])

  const handleSelect = async (path: string) => {
    setShowNew(false)
    setLoading(true)
    try {
      const file = await wikiApi.get(path)
      setSelected(file)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (updated: WikiFile) => {
    const saved = await wikiApi.update(updated.path, { body: updated.body })
    setSelected(saved)
    setFiles((prev) =>
      prev.map((f) => (f.path === saved.path ? { ...saved } : f))
    )
  }

  const handleCreate = async (file: WikiFile) => {
    const created = await wikiApi.create(file)
    setFiles((prev) => [...prev, created])
    setSelected(created)
    setShowNew(false)
  }

  const handleDelete = async (path: string) => {
    if (!confirm(`Delete "${path}"?`)) return
    await wikiApi.remove(path)
    setFiles((prev) => prev.filter((f) => f.path !== path))
    if (selected?.path === path) setSelected(null)
  }

  return (
    <div className="wiki-page">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Files</span>
        </div>
        <div className="sidebar-scroll">
          <FileTree
            files={files}
            selected={selected?.path}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </div>
        <div className="sidebar-footer">
          <button className="btn-new-page" onClick={() => { setShowNew(true); setSelected(null) }}>
            + New Page
          </button>
        </div>
      </aside>

      <section className="editor-panel">
        {loading && <div className="panel-message">Loading…</div>}
        {!loading && showNew && (
          <NewPageForm onCreate={handleCreate} onCancel={() => setShowNew(false)} />
        )}
        {!loading && !showNew && selected && (
          <Editor file={selected} onSave={handleSave} />
        )}
        {!loading && !showNew && !selected && (
          <div className="panel-message">Select a page or create a new one.</div>
        )}
      </section>
    </div>
  )
}
