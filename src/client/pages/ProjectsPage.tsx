import { useState, useEffect } from 'react'
import { projectsApi } from '../lib/api'
import type { Project } from '../../../types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error)
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      const created = await projectsApi.create(newName.trim())
      setProjects((prev) => [...prev, created])
      setNewName('')
    } finally { setAdding(false) }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return
    const updated = await projectsApi.update(id, editName.trim())
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return
    await projectsApi.remove(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="projects-page">
      <div className="tasks-toolbar">
        <span className="tasks-toolbar-title">Projects</span>
      </div>
      <div className="projects-list">
        {projects.length === 0 && <p className="task-preview-empty">No projects yet.</p>}
        {projects.map((p) => (
          <div key={p.id} className="project-item">
            {editingId === p.id ? (
              <>
                <input
                  autoFocus
                  className="task-dialog-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(p.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <button className="btn-primary" onClick={() => handleSaveEdit(p.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="project-name">{p.name}</span>
                <span className="project-id">{p.id}</span>
                <button onClick={() => { setEditingId(p.id); setEditName(p.name) }}>Edit</button>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
      <form className="project-add-form" onSubmit={handleAdd}>
        <input
          className="task-dialog-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name"
        />
        <button type="submit" className="btn-new-task" disabled={!newName.trim() || adding}>
          {adding ? 'Adding…' : '+ Add Project'}
        </button>
      </form>
    </div>
  )
}
