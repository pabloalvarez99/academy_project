import { ipcMain } from 'electron'
import { join } from 'path'
import { readdirSync, readFileSync, statSync } from 'fs'
import { marked } from 'marked'
import { getContentDir } from './content'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  title: string
  count: number
}

interface Article {
  id: string
  title: string
  category: string
  tags: string[]
  body: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

function extractTags(markdown: string): string[] {
  const match = markdown.match(/^tags:\s*\[(.+)\]/m)
  if (!match) return []
  return match[1].split(',').map((t) => t.trim().replace(/['"]/g, ''))
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerKnowledgeHandlers(): void {
  ipcMain.handle('knowledge:categories', (): Category[] => {
    const knowledgeDir = join(getContentDir(), 'knowledge')
    try {
      return readdirSync(knowledgeDir)
        .filter((entry) => {
          try { return statSync(join(knowledgeDir, entry)).isDirectory() } catch { return false }
        })
        .map((dir) => {
          const catDir = join(knowledgeDir, dir)
          let count = 0
          try {
            count = readdirSync(catDir).filter((f) => f.endsWith('.md')).length
          } catch { /* ignore */ }
          return { id: dir, title: toTitle(dir), count }
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('knowledge:articles', (_event, category: string): string[] => {
    const catDir = join(getContentDir(), 'knowledge', category)
    try {
      return readdirSync(catDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
    } catch {
      return []
    }
  })

  ipcMain.handle('knowledge:article', (_event, category: string, id: string): Article => {
    const filePath = join(getContentDir(), 'knowledge', category, `${id}.md`)
    const raw = readFileSync(filePath, 'utf-8')
    const body = marked(raw) as string
    return {
      id,
      title: extractTitle(raw),
      category,
      tags: extractTags(raw),
      body,
    }
  })
}
