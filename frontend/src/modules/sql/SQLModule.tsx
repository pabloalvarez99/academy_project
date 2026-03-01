import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  ListSQLExercises,
  ExecuteSQLExercise,
  RunFreeSQL,
} from '../../../wailsjs/go/main/App'
import { sqllab } from '../../../wailsjs/go/models'

export function SQLModule() {
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('SELECT * FROM customers LIMIT 10;')
  const [queryResult, setQueryResult] = useState<sqllab.QueryResult | null>(null)
  const [evalResult, setEvalResult] = useState<sqllab.EvaluationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'free' | 'exercise'>('free')

  useEffect(() => {
    ListSQLExercises().then(setExercises).catch(() => setExercises([]))
  }, [])

  async function handleRun() {
    setRunning(true)
    setQueryResult(null)
    setEvalResult(null)
    try {
      if (mode === 'free' || !selectedId) {
        const r = await RunFreeSQL('', query)
        setQueryResult(r)
      } else {
        const r = await ExecuteSQLExercise(selectedId, query)
        setEvalResult(r)
        setQueryResult(r.userResult)
      }
    } catch (e: any) {
      setQueryResult({ columns: [], rows: [], rowsAffected: 0, timeMs: 0, error: e?.toString() } as any)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 min-w-[13rem] bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="p-3 border-b border-surface-600">
          <div className="flex gap-1">
            <button
              onClick={() => setMode('free')}
              className={`flex-1 py-1 text-xs rounded ${mode === 'free' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-100'}`}
            >
              Free Query
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
              exercises.map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                    selectedId === id ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
                  }`}
                >
                  {id}
                </button>
              ))
            )}
          </div>
        )}

        {mode === 'free' && (
          <div className="flex-1 p-3">
            <p className="text-xs text-gray-500 mb-2">Northwind schema:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>📋 customers</p>
              <p>📋 orders</p>
              <p>📋 products</p>
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor */}
        <div className="h-48 border-b border-surface-600">
          <Editor
            language="sql"
            value={query}
            onChange={(v) => setQuery(v || '')}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
            }}
          />
        </div>

        {/* Run bar */}
        <div className="px-4 py-2 border-b border-surface-600 bg-surface-800 flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={running}
            className="btn-primary disabled:opacity-50"
          >
            {running ? 'Running...' : '▶ Run'}
          </button>

          {evalResult && (
            <div className="flex items-center gap-3">
              <span className={evalResult.passed ? 'badge-green' : 'badge-red'}>
                {evalResult.passed ? '✓ Correct' : '✗ Incorrect'}
              </span>
              <span className="text-xs text-gray-500">{evalResult.message}</span>
            </div>
          )}

          {queryResult && (
            <span className="text-xs text-gray-500 ml-auto">
              {queryResult.rows?.length ?? 0} rows • {queryResult.timeMs}ms
            </span>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {queryResult?.error ? (
            <div className="bg-red-950/30 border border-red-900/50 rounded p-3 text-sm text-red-400 font-mono">
              {queryResult.error}
            </div>
          ) : queryResult && queryResult.columns && queryResult.columns.length > 0 ? (
            <div className="overflow-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr>
                    {queryResult.columns.map((col, i) => (
                      <th key={i} className="bg-surface-700 text-gray-300 px-3 py-2 text-left border border-surface-600 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows?.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-surface-800' : 'bg-surface-900'}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 border border-surface-700 text-gray-400 max-w-xs truncate">
                          {String(cell ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center">
                <p className="text-4xl mb-3">⛃</p>
                <p className="text-sm">Run a query to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
