import { useEffect, useState } from 'react'
import {
  ListKnowledgeCategories,
  ListKnowledgeArticles,
  GetArticle,
} from '../../../wailsjs/go/main/App'
import { knowledge } from '../../../wailsjs/go/models'

export function KnowledgeModule() {
  const [categories, setCategories] = useState<knowledge.Category[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [articles, setArticles] = useState<string[]>([])
  const [selectedArticle, setSelectedArticle] = useState<knowledge.Article | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ListKnowledgeCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!selectedCat) return
    setArticles([])
    setSelectedArticle(null)
    ListKnowledgeArticles(selectedCat).then(setArticles).catch(() => setArticles([]))
  }, [selectedCat])

  async function loadArticle(articleId: string) {
    if (!selectedCat) return
    setLoading(true)
    try {
      const a = await GetArticle(selectedCat, articleId)
      setSelectedArticle(a)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Category sidebar */}
      <div className="w-44 bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="px-3 py-3 border-b border-surface-600">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`w-full text-left px-3 py-2 transition-colors ${
                selectedCat === cat.id ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
              }`}
            >
              <p className="text-sm capitalize">{cat.title}</p>
              <p className="text-xs text-gray-600">{cat.count} articles</p>
            </button>
          ))}
        </div>
      </div>

      {/* Article list */}
      <div className="w-52 bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="px-3 py-3 border-b border-surface-600">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {selectedCat ? `${selectedCat}` : 'Articles'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {!selectedCat ? (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">Select a category</p>
          ) : articles.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">No articles</p>
          ) : (
            articles.map((id) => (
              <button
                key={id}
                onClick={() => loadArticle(id)}
                className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                  selectedArticle?.id === id ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
                }`}
              >
                {id.replace(/-/g, ' ')}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Article content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : selectedArticle ? (
          <article className="max-w-3xl">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-100 mb-2">{selectedArticle.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-blue">{selectedArticle.category}</span>
                {selectedArticle.tags?.map((tag) => (
                  <span key={tag} className="badge-gray">{tag}</span>
                ))}
              </div>
            </header>
            <div
              className="prose-dark"
              dangerouslySetInnerHTML={{ __html: selectedArticle.body }}
            />
          </article>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-sm">Select a category and article to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
