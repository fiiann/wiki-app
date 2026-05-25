import { useState, useEffect, useCallback } from 'react'
import Markdown from 'react-markdown'
import type { WikiFile } from '../../../types'

interface Props {
  file: WikiFile
  onSave: (updated: WikiFile) => Promise<void>
}

export default function Editor({ file, onSave }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('preview')
  const [body, setBody] = useState(file.body)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    setBody(file.body)
    setDirty(false)
    setTab('preview')
  }, [file.path])

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false)
        document.querySelector('.sidebar')?.classList.remove('sidebar-hidden')
        document.querySelector('.wiki-page')?.classList.remove('wiki-fullscreen')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen])

  const handleChange = (value: string) => {
    setBody(value)
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...file, body })
    setDirty(false)
    setSaving(false)
  }

  const handleExpand = useCallback(() => {
    setFullscreen(true)
    setTab('preview')
    document.querySelector('.sidebar')?.classList.add('sidebar-hidden')
    document.querySelector('.wiki-page')?.classList.add('wiki-fullscreen')
  }, [])

  const handleCollapse = useCallback(() => {
    setFullscreen(false)
    document.querySelector('.sidebar')?.classList.remove('sidebar-hidden')
    document.querySelector('.wiki-page')?.classList.remove('wiki-fullscreen')
  }, [])

  return (
    <div className={`editor ${fullscreen ? 'editor-fullscreen' : ''}`}>
      <div className="editor-header">
        <div className="editor-tabs">
          <button
            className={`tab-btn ${tab === 'edit' ? 'tab-active' : ''}`}
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            className={`tab-btn ${tab === 'preview' ? 'tab-active' : ''}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
        <span className="editor-path">{file.path}</span>
        {!fullscreen && (
          <button
            className="expand-btn"
            onClick={handleExpand}
            title="Fullscreen preview"
            data-testid="expand-btn"
          >
            ⛶
          </button>
        )}
        {fullscreen && (
          <button
            className="collapse-btn"
            onClick={handleCollapse}
            title="Exit fullscreen"
            data-testid="collapse-btn"
          >
            ✕
          </button>
        )}
        <button
          className={`save-btn ${dirty ? 'save-btn-dirty' : ''}`}
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {tab === 'edit' ? (
        <textarea
          className="editor-textarea"
          value={body}
          onChange={(e) => handleChange(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className="editor-preview">
          <Markdown>{body}</Markdown>
        </div>
      )}
    </div>
  )
}