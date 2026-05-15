import { useState } from 'react'
import type { WikiFile, WikiDomain, WikiType } from '../../../types'

interface Props {
  onCreate: (file: WikiFile) => Promise<void>
  onCancel: () => void
}

export default function NewPageForm({ onCreate, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<WikiDomain>('personal')
  const [type, setType] = useState<WikiType>('concept')
  const [folder, setFolder] = useState('concepts')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const path = `${folder}/${slug}.md`
    await onCreate({
      path,
      title: title.trim(),
      domain,
      type,
      tags: [],
      sources: [],
      body: `## ${title.trim()}\n\n[[index]]`,
      created: '',
      updated: ''
    })
    setSaving(false)
  }

  return (
    <form className="new-page-form" onSubmit={handleSubmit}>
      <h2 className="form-title">New Page</h2>

      <label className="form-label">Title</label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Attention Mechanism"
        className="form-input"
      />

      <label className="form-label">Folder</label>
      <select value={folder} onChange={(e) => setFolder(e.target.value)} className="form-input">
        <option>concepts</option>
        <option>entities</option>
        <option>comparisons</option>
        <option>queries</option>
        <option>olympus-project</option>
      </select>

      <label className="form-label">Domain</label>
      <select value={domain} onChange={(e) => setDomain(e.target.value as WikiDomain)} className="form-input">
        <option value="ai-ml">ai-ml</option>
        <option value="personal">personal</option>
      </select>

      <label className="form-label">Type</label>
      <select value={type} onChange={(e) => setType(e.target.value as WikiType)} className="form-input">
        <option value="concept">concept</option>
        <option value="entity">entity</option>
        <option value="comparison">comparison</option>
        <option value="query">query</option>
        <option value="summary">summary</option>
      </select>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!title.trim() || saving}>
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  )
}
