import type { WikiFileMeta } from '../../../types'

export interface FolderNode {
  [key: string]: FolderNode | WikiFileMeta
}

export function buildTree(files: WikiFileMeta[]): FolderNode {
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

export function isFile(value: FolderNode | WikiFileMeta): value is WikiFileMeta {
  return 'path' in value
}
