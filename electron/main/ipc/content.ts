import { ipcMain, app } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, statSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import yaml from 'js-yaml'

// ── Content directory resolution ─────────────────────────────────────────────

export function getContentDir(): string {
  if (is.dev) {
    return join(process.cwd(), 'resources', 'content')
  }
  return join(process.resourcesPath, 'content')
}

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface ContentVersion {
  version: string
  build: number
  modules: Record<string, { version: string; exercise_count?: number; article_count?: number }>
}

// ── In-memory cache ───────────────────────────────────────────────────────────

const exerciseCache = new Map<string, Exercise>()

// ── Core functions ────────────────────────────────────────────────────────────

export function loadExercise(relativePath: string): Exercise {
  if (exerciseCache.has(relativePath)) {
    return exerciseCache.get(relativePath)!
  }
  const fullPath = join(getContentDir(), relativePath)
  const raw = readFileSync(fullPath, 'utf-8')
  const parsed = yaml.load(raw) as Record<string, unknown>

  const ex: Exercise = {
    id: parsed['id'] as string,
    title: parsed['title'] as string,
    difficulty: (parsed['difficulty'] as number) || 1,
    tags: (parsed['tags'] as string[]) || [],
    description: parsed['description'] as string,
    starterCode: (parsed['starter_code'] as string) || '',
    testCases: (parsed['test_cases'] as TestCase[]) || [],
    hints: (parsed['hints'] as string[]) || [],
    solution: (parsed['solution'] as string) || '',
    metadata: {
      version: ((parsed['metadata'] as Record<string, unknown>)?.['version'] as string) || '1.0.0',
      contentVersion: ((parsed['metadata'] as Record<string, unknown>)?.['content_version'] as number) || 1,
      module: ((parsed['metadata'] as Record<string, unknown>)?.['module'] as string) || '',
      language: ((parsed['metadata'] as Record<string, unknown>)?.['language'] as string) || '',
      category: ((parsed['metadata'] as Record<string, unknown>)?.['category'] as string) || '',
    },
  }
  exerciseCache.set(relativePath, ex)
  return ex
}

export function listExercises(module: string, language?: string): string[] {
  const contentDir = getContentDir()
  let base: string
  if (language) {
    base = join(contentDir, module, language, 'exercises')
  } else {
    base = join(contentDir, module)
  }

  const results: string[] = []

  function walk(dir: string, prefix: string): void {
    try {
      const entries = readdirSync(dir)
      for (const entry of entries.sort()) {
        const fullPath = join(dir, entry)
        const rel = prefix ? `${prefix}/${entry}` : entry
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          walk(fullPath, rel)
        } else if (entry.endsWith('.yaml') && entry !== '.gitkeep') {
          results.push(`${module}/${rel}`)
        }
      }
    } catch {
      // directory doesn't exist — return empty
    }
  }

  walk(base, language ? '' : '')
  return results
}

export function listExerciseMeta(module: string, language?: string): ExerciseSummary[] {
  const paths = listExercises(module, language)
  const summaries: ExerciseSummary[] = []
  for (const path of paths) {
    try {
      const ex = loadExercise(path)
      summaries.push({
        id: path,
        title: ex.title,
        difficulty: ex.difficulty,
        category: ex.metadata.category,
      })
    } catch {
      // skip unreadable exercises
    }
  }
  return summaries
}

export function loadVersion(): ContentVersion {
  const versionPath = join(getContentDir(), 'version.json')
  const raw = readFileSync(versionPath, 'utf-8')
  return JSON.parse(raw) as ContentVersion
}

export function readRawFile(relativePath: string): string {
  return readFileSync(join(getContentDir(), relativePath), 'utf-8')
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerContentHandlers(): void {
  ipcMain.handle('content:version', () => {
    return loadVersion()
  })
}
