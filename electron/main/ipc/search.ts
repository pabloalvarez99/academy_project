import { ipcMain } from 'electron'
import { join } from 'path'
import { readdirSync, readFileSync, statSync } from 'fs'
import MiniSearch from 'minisearch'
import { loadExercise, listExercises, getContentDir } from './content'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  title: string
  module: string
  category: string
  excerpt: string
  score: number
}

interface SearchDoc {
  id: string
  title: string
  module: string
  category: string
  body: string
}

// ── Index ─────────────────────────────────────────────────────────────────────

let _index: MiniSearch<SearchDoc> | null = null

function getIndex(): MiniSearch<SearchDoc> {
  if (_index) return _index

  _index = new MiniSearch<SearchDoc>({
    fields: ['title', 'body', 'category'],
    storeFields: ['title', 'module', 'category', 'body'],
    searchOptions: { boost: { title: 3 }, fuzzy: 0.2, prefix: true },
  })

  const docs: SearchDoc[] = []

  // Index all programming exercises
  const modules = ['programming', 'grammar', 'sql']
  for (const mod of modules) {
    const paths = listExercises(mod)
    for (const path of paths) {
      try {
        const ex = loadExercise(path)
        docs.push({
          id: path,
          title: ex.title,
          module: mod,
          category: ex.metadata.category || '',
          body: `${ex.description} ${(ex.tags || []).join(' ')}`,
        })
      } catch { /* skip */ }
    }
  }

  // Index knowledge articles
  const knowledgeDir = join(getContentDir(), 'knowledge')
  try {
    for (const catDir of readdirSync(knowledgeDir)) {
      const catPath = join(knowledgeDir, catDir)
      try {
        if (!statSync(catPath).isDirectory()) continue
        for (const file of readdirSync(catPath)) {
          if (!file.endsWith('.md')) continue
          const id = `knowledge/${catDir}/${file.replace(/\.md$/, '')}`
          const raw = readFileSync(join(catPath, file), 'utf-8')
          const titleMatch = raw.match(/^#\s+(.+)$/m)
          docs.push({
            id,
            title: titleMatch ? titleMatch[1].trim() : file,
            module: 'knowledge',
            category: catDir,
            body: raw.slice(0, 500),
          })
        }
      } catch { /* skip */ }
    }
  } catch { /* no knowledge dir */ }

  _index.addAll(docs)
  return _index
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerSearchHandlers(): void {
  ipcMain.handle('search:query', (_event, query: string): SearchResult[] => {
    if (!query.trim()) return []
    const index = getIndex()
    const hits = index.search(query, { limit: 25 })
    return hits.map((h) => ({
      id: h.id as string,
      title: (h as unknown as SearchDoc).title,
      module: (h as unknown as SearchDoc).module,
      category: (h as unknown as SearchDoc).category,
      excerpt: ((h as unknown as SearchDoc).body || '').slice(0, 150).replace(/\n/g, ' '),
      score: h.score,
    }))
  })
}
