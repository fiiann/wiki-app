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

export interface ShipFastMeta {
  enabled: boolean
  startDate: string        // YYYY-MM-DD
  platform: string[]       // e.g. ['iOS', 'Android']
  techStack: string        // e.g. 'Flutter'
  monetization: string     // e.g. 'Freemium'
  currentPhase: number     // 1–5
  activatedPhases: number[] // which phases have had tasks generated
}

export interface Project {
  id: string
  name: string
  shipfast?: ShipFastMeta
}

export type WikiFileMeta = Omit<WikiFile, 'body'>
