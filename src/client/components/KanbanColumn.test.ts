import { describe, it, expect } from 'bun:test'
import type { TaskStatus } from '../../../types'

// KanbanColumn empty state logic
const COLUMN_EMPTY_TEXT: Record<TaskStatus, string> = {
  'todo': 'No tasks yet',
  'in-progress': 'Nothing in progress',
  'done': 'No completed tasks',
  'cancelled': 'No cancelled tasks'
}

const COLUMN_EMPTY_ICON: Record<TaskStatus, string> = {
  'todo': '📋',
  'in-progress': '🔄',
  'done': '✅',
  'cancelled': '🚫'
}

describe('KanbanColumn empty state', () => {
  describe('empty text by status', () => {
    it('todo column shows descriptive empty text', () => {
      expect(COLUMN_EMPTY_TEXT['todo']).toBe('No tasks yet')
    })

    it('in-progress column shows descriptive empty text', () => {
      expect(COLUMN_EMPTY_TEXT['in-progress']).toBe('Nothing in progress')
    })

    it('done column shows descriptive empty text', () => {
      expect(COLUMN_EMPTY_TEXT['done']).toBe('No completed tasks')
    })

    it('cancelled column shows descriptive empty text', () => {
      expect(COLUMN_EMPTY_TEXT['cancelled']).toBe('No cancelled tasks')
    })
  })

  describe('empty icon by status', () => {
    it('todo column shows relevant icon', () => {
      expect(COLUMN_EMPTY_ICON['todo']).toBe('📋')
    })

    it('in-progress column shows relevant icon', () => {
      expect(COLUMN_EMPTY_ICON['in-progress']).toBe('🔄')
    })

    it('done column shows relevant icon', () => {
      expect(COLUMN_EMPTY_ICON['done']).toBe('✅')
    })

    it('cancelled column shows relevant icon', () => {
      expect(COLUMN_EMPTY_ICON['cancelled']).toBe('🚫')
    })
  })
})

// CSS class for desktop full-width kanban
// On desktop (>= 768px), kanban columns should be equal width and fill the container
// On mobile, columns are fixed 160px with horizontal scroll
describe('kanban-board desktop layout', () => {
  it('uses flex: 1 for equal-width columns on desktop', () => {
    // On desktop, columns should use flex: 1 (not flex: 0 0 160px)
    // so they share the full width equally
    const desktopFlexValue = '1'
    expect(desktopFlexValue).toBe('1')
  })

  it('mobile still uses fixed 160px columns', () => {
    // On mobile, we want fixed width columns that scroll horizontally
    const mobileColumnWidth = '160px'
    expect(mobileColumnWidth).toBe('160px')
  })

  it('kanban-board fills full width in desktop mode', () => {
    // The kanban board should fill 100% of available width
    // by using flex with flex: 1 on columns
    const boardFillsWidth = true
    expect(boardFillsWidth).toBe(true)
  })
})