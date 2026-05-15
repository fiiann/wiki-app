import { describe, it, expect } from 'bun:test'
import { buildTree, isFile } from './tree'
import type { WikiFileMeta } from '../../../types'

describe('buildTree', () => {
  it('builds tree from flat file list', () => {
    const files: WikiFileMeta[] = [
      { path: 'a.md', title: 'A', created: '', updated: '', domain: 'personal', type: 'concept', tags: [], sources: [] },
      { path: 'b.md', title: 'B', created: '', updated: '', domain: 'personal', type: 'concept', tags: [], sources: [] }
    ]
    const tree = buildTree(files)
    expect(tree['a.md']).toBeDefined()
    expect(tree['b.md']).toBeDefined()
  })

  it('builds nested directory structure', () => {
    const files: WikiFileMeta[] = [
      { path: 'a/b.md', title: 'B', created: '', updated: '', domain: 'personal', type: 'concept', tags: [], sources: [] }
    ]
    const tree = buildTree(files)
    expect(tree['a']).toBeDefined()
    const aNode = tree['a'] as any
    expect(aNode['b.md']).toBeDefined()
    expect(isFile(aNode['b.md'])).toBe(true)
  })

  it('returns empty tree for empty file list', () => {
    const tree = buildTree([])
    expect(Object.keys(tree).length).toBe(0)
  })

  it('handles deeply nested paths', () => {
    const files: WikiFileMeta[] = [
      { path: 'a/b/c/d.md', title: 'D', created: '', updated: '', domain: 'personal', type: 'concept', tags: [], sources: [] }
    ]
    const tree = buildTree(files)
    const a = tree['a'] as any
    const b = a['b'] as any
    const c = b['c'] as any
    expect(isFile(c['d.md'])).toBe(true)
  })

  it('mixes files and folders at same level', () => {
    const files: WikiFileMeta[] = [
      { path: 'a.md', title: 'A', created: '', updated: '', domain: 'personal', type: 'concept', tags: [], sources: [] },
      { path: 'b/c.md', title: 'C', created: '', updated: '', domain: 'personal', type: 'concept', tags: [], sources: [] }
    ]
    const tree = buildTree(files)
    expect(isFile(tree['a.md'])).toBe(true)
    expect(!isFile(tree['b'])).toBe(true)
  })
})

describe('isFile', () => {
  it('returns true for WikiFileMeta with path property', () => {
    const file: WikiFileMeta = {
      path: 'test.md',
      title: 'Test',
      created: '',
      updated: '',
      domain: 'personal',
      type: 'concept',
      tags: [],
      sources: []
    }
    expect(isFile(file)).toBe(true)
  })

  it('returns false for FolderNode without path', () => {
    const folder = { subfile: { path: 'test.md' } }
    expect(isFile(folder)).toBe(false)
  })

  it('returns false for empty folder node', () => {
    const folder = {}
    expect(isFile(folder)).toBe(false)
  })
})
