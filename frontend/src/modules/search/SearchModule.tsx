import { useState, useRef } from 'react'
import { SearchContent } from '../../../wailsjs/go/main/App'
import { search } from '../../../wailsjs/go/models'

export function SearchModule() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<search.SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function doSearch(q: string) {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setSearching(true)
    try {
      const r = await SearchContent(q)
      setResults(r || [])
      setSearched(true)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(v), 400)
  }

  const MODULE_ICONS: Record<string, string> = {
    programming: '⌨',
    sql: '⛃',
    knowledge: '📖',
    grammar: '✎',
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Search</h1>
      <p className="text-gray-500 text-sm mb-6">Full-text search across all exercises and knowledge articles.</p>

      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search exercises, articles, concepts..."
          className="w-full bg-surface-800 border border-surface-600 rounded-lg px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-accent pr-10"
          autoFocus
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">...</span>
        )}
      </div>

      {searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-3xl mb-3">🔍</p>
          <p>No results for "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          {results.map((r) => (
            <div key={r.id} className="card hover:border-surface-500 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">
                  {MODULE_ICONS[r.module] || '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-medium text-gray-200">{r.title || r.id}</h3>
                    <span className="badge-blue">{r.module}</span>
                    {r.category && <span className="badge-gray">{r.category}</span>}
                  </div>
                  {r.excerpt && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{r.excerpt}</p>
                  )}
                  <p className="text-xs text-gray-700 mt-1">score: {r.score.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && !searching && (
        <div className="text-center py-16 text-gray-700">
          <p className="text-4xl mb-3">⌕</p>
          <p className="text-sm">Type to search across all content</p>
        </div>
      )}
    </div>
  )
}
