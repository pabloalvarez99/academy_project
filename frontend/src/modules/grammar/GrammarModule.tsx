import { useEffect, useState } from 'react'
import {
  ValidateGrammar,
  ListGrammarExercises,
  GetGrammarExercise,
} from '../../../wailsjs/go/main/App'
import { grammarmodel, content } from '../../../wailsjs/go/models'

export function GrammarModule() {
  const [mode, setMode] = useState<'free' | 'exercise'>('free')
  const [text, setText] = useState('')
  const [result, setResult] = useState<grammarmodel.ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  // exercise mode
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedEx, setSelectedEx] = useState<content.Exercise | null>(null)

  useEffect(() => {
    ListGrammarExercises().then(setExercises).catch(() => setExercises([]))
  }, [])

  async function handleValidate() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const r = await ValidateGrammar(text)
      setResult(r)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadExercise(id: string) {
    try {
      const ex = await GetGrammarExercise(id)
      setSelectedEx(ex)
      setText(ex.starterCode || '')
      setResult(null)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — exercise list */}
      <div className="w-52 min-w-[13rem] bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="p-3 border-b border-surface-600">
          <div className="flex gap-1">
            <button
              onClick={() => { setMode('free'); setSelectedEx(null); setText(''); setResult(null) }}
              className={`flex-1 py-1 text-xs rounded ${mode === 'free' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-100'}`}
            >
              Free Text
            </button>
            <button
              onClick={() => setMode('exercise')}
              className={`flex-1 py-1 text-xs rounded ${mode === 'exercise' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-100'}`}
            >
              Exercises
            </button>
          </div>
        </div>

        {mode === 'exercise' && (
          <div className="flex-1 overflow-y-auto py-2">
            {exercises.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-600 text-center">No exercises</p>
            ) : (
              exercises.map((id) => {
                const shortId = id.split('/').pop()?.replace('.yaml', '') || id
                return (
                  <button
                    key={id}
                    onClick={() => loadExercise(id.replace('grammar/exercises/', '').replace('.yaml', ''))}
                    className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                      selectedEx?.id.includes(shortId)
                        ? 'bg-accent/20 text-accent'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
                    }`}
                  >
                    {shortId}
                  </button>
                )
              })
            )}
          </div>
        )}

        {mode === 'free' && (
          <div className="flex-1 p-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Rules checked:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>• a / an articles</li>
              <li>• Duplicate words</li>
              <li>• Capitalization</li>
              <li>• Contractions</li>
            </ul>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        {mode === 'exercise' && selectedEx && (
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-100">{selectedEx.title}</h2>
              <DifficultyBadge level={selectedEx.difficulty} />
            </div>
            <div className="bg-surface-800 border border-surface-600 rounded p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-3">
              {selectedEx.description}
            </div>
            {selectedEx.hints && selectedEx.hints.length > 0 && (
              <details className="mb-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Show hints</summary>
                <ul className="mt-1 text-xs text-gray-500 list-disc list-inside space-y-0.5 pl-2">
                  {selectedEx.hints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        {mode === 'free' && (
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-100 mb-1">Grammar Validator</h1>
            <p className="text-gray-500 text-sm">Type or paste English text to validate grammar rules.</p>
          </div>
        )}

        <div className="card mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === 'exercise' && selectedEx
                ? 'Type your corrected version here...'
                : 'Type a sentence or paragraph here...'
            }
            rows={6}
            className="w-full bg-transparent text-gray-100 text-sm resize-none focus:outline-none placeholder-gray-600"
          />
        </div>

        <button
          onClick={handleValidate}
          disabled={loading || !text.trim()}
          className="btn-primary mb-6 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Validate Grammar'}
        </button>

        {result && (
          <div className="space-y-4">
            <div className="card flex items-center gap-4">
              <div className={`text-4xl font-bold ${
                result.score >= 80 ? 'text-green-400' : result.score >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {result.score}
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">Grammar Score</p>
                <p className="text-xs text-gray-500">
                  {result.isValid ? '✅ No errors found' : `${result.errors?.length ?? 0} error(s) detected`}
                </p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Errors Found</h2>
                <div className="space-y-3">
                  {result.errors.map((err, i) => (
                    <div key={i} className="border border-red-900/50 bg-red-950/30 rounded p-3">
                      <span className="badge-red mb-1">{err.rule}</span>
                      <p className="text-sm text-gray-300 mt-1">{err.message}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-red-400">
                          Found: <code className="bg-surface-700 px-1 rounded">{err.original}</code>
                        </span>
                        {err.suggest && (
                          <span className="text-green-400">
                            Suggest: <code className="bg-surface-700 px-1 rounded">{err.suggest}</code>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.isValid && (
              <div className="card border-green-800 bg-green-950/30 text-center py-6">
                <p className="text-green-400 text-lg font-semibold">Perfect! No grammar errors found.</p>
                {mode === 'exercise' && selectedEx && (
                  <p className="text-green-600 text-xs mt-1">
                    Solution: {selectedEx.solution}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'exercise' && !selectedEx && (
          <div className="flex items-center justify-center h-48 text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">✎</p>
              <p className="text-sm">Select an exercise from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DifficultyBadge({ level }: { level: number }) {
  if (level <= 1) return <span className="badge-green">Easy</span>
  if (level <= 2) return <span className="badge-yellow">Medium</span>
  return <span className="badge-red">Hard</span>
}
