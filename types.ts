export type WikiDomain = 'ai-ml' | 'personal'
export type WikiType = 'entity' | 'concept' | 'comparison' | 'query' | 'summary'
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface WikiFile {
  path: string       // relative to wiki root, e.g. "concepts/attention.md"
  title: string
  created: string    // YYYY-MM-DD
  updated: string    // YYYY-MM-DD
  domain: WikiDomain
  type: WikiType
  tags: string[]
  sources: string[]
  body: string       // raw markdown below frontmatter
}

export interface Task {
  id: string             // filename without .md, e.g. "2026-05-15-fix-bug"
  title: string
  status: TaskStatus
  priority: TaskPriority
  due: string | null     // YYYY-MM-DD or null
  project: string | null // e.g. "olympus-project" or null
  tags: string[]
  created: string        // YYYY-MM-DD
  body: string           // markdown notes below frontmatter
}

export interface Comment {
  id: string        // crypto.randomUUID()
  content: string
  createdAt: string // ISO 8601
}

export type WikiFileMeta = Omit<WikiFile, 'body'>
