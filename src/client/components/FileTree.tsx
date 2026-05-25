import { useState } from 'react'
import type { WikiFileMeta } from '../../../types'
import { buildTree, isFile, type FolderNode } from '../lib/tree'

// Always-visible folder structure based on wiki schema
const TOP_FOLDERS = ['Personals', 'Works', 'Logs']

interface Props {
  files: WikiFileMeta[]
  selected: string | undefined
  onSelect: (path: string) => void
  onDelete: (path: string) => void
}

interface TreeNodeProps {
  name: string
  node: FolderNode | WikiFileMeta
  selected: string | undefined
  onSelect: (path: string) => void
  onDelete: (path: string) => void
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
  fullPath: string
}

function TreeNode({
  name,
  node,
  selected,
  onSelect,
  onDelete,
  depth,
  expanded,
  onToggle,
  fullPath
}: TreeNodeProps) {
  const indent = depth * 14
  const isFolder = !isFile(node)

  if (isFolder) {
    const folderNode = node as FolderNode
    const isOpen = expanded.has(fullPath)

    return (
      <div>
        <div
          className="tree-folder"
          style={{ paddingLeft: indent + 4, cursor: 'pointer' }}
          onClick={() => onToggle(fullPath)}
        >
          <span className="tree-folder-icon">{isOpen ? '📂' : '📁'}</span>
          <span className="tree-folder-name">{name}</span>
        </div>
        {isOpen && Object.entries(folderNode)
          .sort(([, a], [, b]) => {
            const aIsFile = isFile(a)
            const bIsFile = isFile(b)
            if (aIsFile !== bIsFile) return aIsFile ? 1 : -1
            return 0
          })
          .map(([childName, childNode]) => {
            const childFullPath = fullPath + '/' + childName
            return (
              <TreeNode
                key={childName}
                name={childName}
                node={childNode}
                selected={selected}
                onSelect={onSelect}
                onDelete={onDelete}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                fullPath={childFullPath}
              />
            )
          })}
      </div>
    )
  }

  const fileNode = node as WikiFileMeta
  const active = fileNode.path === selected
  return (
    <div
      className={`tree-file ${active ? 'tree-file-active' : ''}`}
      style={{ paddingLeft: indent + 8 }}
      onClick={() => onSelect(fileNode.path)}
    >
      <span className="tree-file-name">{name}</span>
      <button
        className="tree-delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(fileNode.path) }}
        title="Delete"
      >
        ×
      </button>
    </div>
  )
}

export default function FileTree({ files, selected, onSelect, onDelete }: Props) {
  const tree = buildTree(files)

  // Ensure top-level folders always exist in tree
  for (const folder of TOP_FOLDERS) {
    if (!tree[folder]) {
      tree[folder] = {}
    }
  }

  const entries = Object.entries(tree)

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const [name] of entries) {
      initial.add(name)
    }
    return initial
  })

  const handleToggle = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  if (entries.length === 0) {
    return <div className="tree-empty">No pages yet.</div>
  }

  return (
    <div className="file-tree">
      {entries
        .sort(([aName, aNode], [bName, bNode]) => {
          // Sort: folders first, then by name
          const aIsFile = isFile(aNode)
          const bIsFile = isFile(bNode)
          if (aIsFile !== bIsFile) return aIsFile ? 1 : -1
          return aName.localeCompare(bName)
        })
        .map(([name, node]) => (
          <TreeNode
            key={name}
            name={name}
            node={node}
            selected={selected}
            onSelect={onSelect}
            onDelete={onDelete}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            fullPath={name}
          />
        ))}
    </div>
  )
}