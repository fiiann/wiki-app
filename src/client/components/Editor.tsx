import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import type { WikiFile } from '../../../types'

interface Props {
  file: WikiFile
  onSave: (updated: WikiFile) => Promise<void>
}

export default function Editor({ file, onSave }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [body, setBody] = useState(file.body)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setBody(file.body)
    setDirty(false)
    setTab('edit')
  }, [file.path])

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

  return (
    <div className="editor">
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
