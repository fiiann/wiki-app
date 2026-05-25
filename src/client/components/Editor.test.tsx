import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { render, fireEvent } from '@testing-library/react'
import type { WikiFile } from '../../types'
import Editor from './Editor'

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: function MockMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-preview">{children}</div>
  }
}))

const mockFile: WikiFile = {
  path: 'test.md',
  body: '# Hello World\n\nThis is a test.',
  modified: '2026-05-25',
}

describe('Editor', () => {
  describe('default tab = preview', () => {
    it('renders preview tab as active by default on first load', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const previewTab = container.querySelector('.tab-btn:last-child')
      expect(previewTab?.className).toContain('tab-active')
    })

    it('shows markdown preview content by default', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const preview = container.querySelector('[data-testid="markdown-preview"]')
      expect(preview).toBeTruthy()
      expect(preview?.textContent).toContain('# Hello World')
    })

    it('does NOT show textarea by default', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const textarea = container.querySelector('textarea')
      expect(textarea).toBeNull()
    })

    it('switches to edit tab when Edit button is clicked', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const editTab = container.querySelector('.tab-btn:first-child') as HTMLElement
      fireEvent.click(editTab)

      const textarea = container.querySelector('textarea')
      expect(textarea).toBeTruthy()
    })

    it('stays on current tab when switching files (auto-resets to preview)', () => {
      const onSave = vi.fn()
      const { rerender, container } = render(<Editor file={mockFile} onSave={onSave} />)

      // Click edit tab
      const editTab = container.querySelector('.tab-btn:first-child') as HTMLElement
      fireEvent.click(editTab)
      expect(container.querySelector('textarea')).toBeTruthy()

      // Switch to a new file
      const newFile: WikiFile = { path: 'new.md', body: '# New', modified: '2026-05-26' }
      rerender(<Editor file={newFile} onSave={onSave} />)

      // Should reset to preview (default tab)
      const previewTab = container.querySelector('.tab-btn:last-child')
      expect(previewTab?.className).toContain('tab-active')
    })
  })

  describe('fullscreen mode', () => {
    it('renders expand button in editor header', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const expandBtn = container.querySelector('[data-testid="expand-btn"]')
      expect(expandBtn).toBeTruthy()
    })

    it('clicking expand button enters fullscreen mode', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const expandBtn = container.querySelector('[data-testid="expand-btn"]') as HTMLElement
      fireEvent.click(expandBtn)

      const editorEl = container.querySelector('.editor')
      expect(editorEl?.className).toContain('editor-fullscreen')
    })

    it('clicking expand button hides sidebar in fullscreen', () => {
      // Sidebar lives in WikiPage DOM (not Editor), tested via integration
      // Here we verify fullscreen state is set correctly
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const expandBtn = container.querySelector('[data-testid="expand-btn"]') as HTMLElement
      fireEvent.click(expandBtn)

      // Editor receives fullscreen state
      const editor = container.querySelector('.editor')
      expect(editor?.classList.contains('editor-fullscreen')).toBe(true)
    })

    it('clicking expand button auto-switches to preview tab', () => {
      const { rerender, container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      // First switch to edit
      const editTab = container.querySelector('.tab-btn:first-child') as HTMLElement
      fireEvent.click(editTab)
      expect(container.querySelector('textarea')).toBeTruthy()

      // Now expand
      const expandBtn = container.querySelector('[data-testid="expand-btn"]') as HTMLElement
      fireEvent.click(expandBtn)

      // Should auto-switch to preview
      const previewTab = container.querySelector('.tab-btn:last-child')
      expect(previewTab?.className).toContain('tab-active')
      expect(container.querySelector('[data-testid="markdown-preview"]')).toBeTruthy()
    })

    it('clicking collapse button exits fullscreen mode', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const expandBtn = container.querySelector('[data-testid="expand-btn"]') as HTMLElement
      fireEvent.click(expandBtn) // enter fullscreen

      // Now collapse
      const collapseBtn = container.querySelector('[data-testid="collapse-btn"]') as HTMLElement
      fireEvent.click(collapseBtn)

      const editorEl = container.querySelector('.editor')
      expect(editorEl?.className).not.toContain('editor-fullscreen')
    })

    it('pressing Escape exits fullscreen mode', () => {
      const { container } = render(<Editor file={mockFile} onSave={vi.fn()} />)

      const expandBtn = container.querySelector('[data-testid="expand-btn"]') as HTMLElement
      fireEvent.click(expandBtn) // enter fullscreen

      fireEvent.keyDown(document, { key: 'Escape' })

      const editorEl = container.querySelector('.editor')
      expect(editorEl?.className).not.toContain('editor-fullscreen')
    })
  })
})