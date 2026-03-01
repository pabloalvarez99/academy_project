import { useState } from 'react'
import { ValidateGrammar } from '../../../wailsjs/go/main/App'
import { grammarmodel } from '../../../wailsjs/go/models'

export function GrammarModule() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<grammarmodel.ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Grammar Training</h1>
      <p className="text-gray-500 text-sm mb-6">Type or paste English text to validate grammar rules.</p>

      <div className="card mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a sentence or paragraph here..."
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
          {/* Score */}
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

          {/* Annotated text */}
          {result.errors && result.errors.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Errors Found</h2>
              <div className="space-y-3">
                {result.errors.map((err, i) => (
                  <div key={i} className="border border-red-900/50 bg-red-950/30 rounded p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
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
                      <span className="text-xs text-gray-600 shrink-0">pos {err.position}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.isValid && (
            <div className="card border-green-800 bg-green-950/30 text-center py-6">
              <p className="text-green-400 text-lg font-semibold">Perfect! No grammar errors found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
