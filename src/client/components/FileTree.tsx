import type { WikiFileMeta } from '../../../types'

interface Props {
  files: WikiFileMeta[]
  selected: string | undefined
  onSelect: (path: string) => void
  onDelete: (path: string) => void
}

interface FolderNode {
  [key: string]: FolderNode | WikiFileMeta
}

function buildTree(files: WikiFileMeta[]): FolderNode {
  const root: FolderNode = {}
  for (const file of files) {
    const parts = file.path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = {}
      node = node[parts[i]] as FolderNode
    }
    node[parts[parts.length - 1]] = file
  }
  return root
}

function isFile(value: FolderNode | WikiFileMeta): value is WikiFileMeta {
  return 'path' in value
}

function TreeNode({
  name,
  node,
  selected,
  onSelect,
  onDelete,
  depth = 0
}: {
  name: string
  node: FolderNode | WikiFileMeta
  selected: string | undefined
  onSelect: (path: string) => void
  onDelete: (path: string) => void
  depth?: number
}) {
  const indent = depth * 14

  if (isFile(node)) {
    const active = node.path === selected
    return (
      <div
        className={`tree-file ${active ? 'tree-file-active' : ''}`}
        style={{ paddingLeft: indent + 8 }}
        onClick={() => onSelect(node.path)}
      >
        <span className="tree-file-name">{name}</span>
        <button
          className="tree-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(node.path) }}
          title="Delete"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="tree-folder" style={{ paddingLeft: indent + 4 }}>
        <span>📁 {name}</span>
      </div>
      {Object.entries(node)
        .sort(([, a], [, b]) => {
          const aIsFile = isFile(a)
          const bIsFile = isFile(b)
          if (aIsFile !== bIsFile) return aIsFile ? 1 : -1
          return 0
        })
        .map(([childName, childNode]) => (
          <TreeNode
            key={childName}
            name={childName}
            node={childNode}
            selected={selected}
            onSelect={onSelect}
            onDelete={onDelete}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

export default function FileTree({ files, selected, onSelect, onDelete }: Props) {
  const tree = buildTree(files)
  const entries = Object.entries(tree)

  if (entries.length === 0) {
    return <div className="tree-empty">No pages yet.</div>
  }

  return (
    <div className="file-tree">
      {entries
        .sort(([, a], [, b]) => {
          const aIsFile = isFile(a)
          const bIsFile = isFile(b)
          if (aIsFile !== bIsFile) return aIsFile ? 1 : -1
          return 0
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
          />
        ))}
    </div>
  )
}
