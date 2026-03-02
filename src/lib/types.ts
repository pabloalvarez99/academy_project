// Shared TypeScript types — replaces wailsjs/go/models.ts
// All interfaces match the JSON shapes returned by Electron IPC handlers.

// ── Content ──────────────────────────────────────────────────────────────────

export interface ExerciseMeta {
  version: string
  contentVersion: number
  module: string
  language: string
  category: string
}

export interface TestCase {
  input: string
  expectedOutput: string
  timeLimitMs: number
  memoryLimitKb: number
}

export interface Exercise {
  id: string
  title: string
  difficulty: number
  tags: string[]
  description: string
  starterCode: string
  testCases: TestCase[]
  hints: string[]
  solution: string
  metadata: ExerciseMeta
}

export interface ExerciseSummary {
  id: string
  title: string
  difficulty: number
  category: string
}

export interface ModuleVersion {
  version: string
  exercise_count?: number
  article_count?: number
}

export interface ContentVersion {
  version: string
  build: number
  modules: Record<string, ModuleVersion>
}

// ── Grammar ───────────────────────────────────────────────────────────────────

export interface ValidationError {
  position: number
  length: number
  message: string
  rule: string
  original: string
  suggest: string
}

export interface ValidationResult {
  input: string
  errors: ValidationError[]
  score: number
  isValid: boolean
}

export interface ConceptGroup {
  id: string
  name: string
  description: string
  exercises: ExerciseSummary[]
}

export interface CurriculumLevel {
  level: number
  name: string
  description: string
  concepts: ConceptGroup[]
}

// ── Programming ───────────────────────────────────────────────────────────────

export interface SubmitRequest {
  exerciseId: string
  language: string
  code: string
}

export interface TestResult {
  testIndex: number
  passed: boolean
  expectedOutput: string
  actualOutput: string
  timeMs: number
  timedOut: boolean
}

export interface SubmitResult {
  passed: boolean
  score: number
  testResults: TestResult[]
  error?: string
}

// ── SQL ───────────────────────────────────────────────────────────────────────

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowsAffected: number
  timeMs: number
  error?: string
}

export interface EvaluationResult {
  passed: boolean
  userResult: QueryResult
  score: number
  message: string
  queryPlan?: string
}

// ── Knowledge ────────────────────────────────────────────────────────────────

export interface KnowledgeCategory {
  id: string
  title: string
  count: number
}

export interface KnowledgeArticle {
  id: string
  title: string
  category: string
  tags: string[]
  body: string
}

// ── User & Progress ───────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  displayName: string
  avatar: string
  createdAt: number
  lastActive: number
  settings: string
}

export interface CreateUserRequest {
  username: string
  displayName: string
  pin: string
  avatar: string
}

export interface ModuleProgress {
  module: string
  category: string
  total: number
  completed: number
  passed: number
  percent: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt?: number
  earned: boolean
}

export interface UserStats {
  totalAttempts: number
  totalPassed: number
  passRate: number
  moduleProgress: ModuleProgress[]
  achievements: Achievement[]
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string
  title: string
  module: string
  category: string
  excerpt: string
  score: number
}
