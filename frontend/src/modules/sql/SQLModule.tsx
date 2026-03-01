import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  ListSQLExercises,
  ExecuteSQLExercise,
  GetSQLExercise,
  RunFreeSQL,
} from '../../../wailsjs/go/main/App'
import { sqllab, content } from '../../../wailsjs/go/models'

export function SQLModule() {
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [exercise, setExercise] = useState<content.Exercise | null>(null)
  const [query, setQuery] = useState('SELECT * FROM customers LIMIT 10;')
  const [queryResult, setQueryResult] = useState<sqllab.QueryResult | null>(null)
  const [evalResult, setEvalResult] = useState<sqllab.EvaluationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'free' | 'exercise'>('free')

  useEffect(() => {
    ListSQLExercises().then(setExercises).catch(() => setExercises([]))
  }, [])

  useEffect(() => {
    if (!selectedPath) return
    setExercise(null)
    setQueryResult(null)
    setEvalResult(null)
    GetSQLExercise(selectedPath).then((ex) => {
      setExercise(ex)
      // Set a starter query hint
      setQuery('-- ' + ex.title + '\n\n')
    }).catch(() => {})
  }, [selectedPath])

  async function handleRun() {
    setRunning(true)
    setQueryResult(null)
    setEvalResult(null)
    try {
      if (mode === 'free' || !selectedPath) {
        const r = await RunFreeSQL('', query)
        setQueryResult(r)
      } else {
        const r = await ExecuteSQLExercise(selectedPath, query)
        setEvalResult(r)
        setQueryResult(r.userResult)
      }
    } catch (e: any) {
      setQueryResult({ columns: [], rows: [], rowsAffected: 0, timeMs: 0, error: e?.toString() } as any)
    } finally {
      setRunning(false)
    }
  }

  function labelFor(path: string) {
    // "sql/exercises/select/001-all-customers.yaml" → "select / 001-all-customers"
    return path
      .replace('sql/exercises/', '')
      .replace('.yaml', '')
      .replace('/', ' / ')
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 min-w-[13rem] bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="p-3 border-b border-surface-600">
          <div className="flex gap-1">
            <button
              onClick={() => { setMode('free'); setSelectedPath(null); setExercise(null); setQuery('SELECT * FROM customers LIMIT 10;'); setQueryResult(null); setEvalResult(null) }}
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
              exercises.map((path) => (
                <button
                  key={path}
                  onClick={() => setSelectedPath(path)}
                  className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                    selectedPath === path ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
                  }`}
                >
                  {labelFor(path)}
                </button>
              ))
            )}
          </div>
        )}

        {mode === 'free' && (
          <div className="flex-1 p-3">
            <p className="text-xs text-gray-500 mb-2">Northwind schema:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>📋 customers(id, name, city, country)</p>
              <p>📋 orders(id, customer_id, order_date, amount)</p>
              <p>📋 products(id, name, price, stock)</p>
            </div>
            <p className="text-xs text-gray-700 mt-3">5 customers, 5 orders, 5 products</p>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Exercise description */}
        {mode === 'exercise' && exercise && (
          <div className="px-4 pt-4 pb-2 border-b border-surface-600">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold text-gray-200">{exercise.title}</h2>
              <DifficultyBadge level={exercise.difficulty} />
            </div>
            <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed line-clamp-3">{exercise.description}</p>
            {exercise.hints && exercise.hints.length > 0 && (
              <details className="mt-1">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">Hints</summary>
                <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                  {exercise.hints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Editor */}
        <div className="h-44 border-b border-surface-600 flex-shrink-0">
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
        <div className="px-4 py-2 border-b border-surface-600 bg-surface-800 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleRun}
            disabled={running}
            className="btn-primary disabled:opacity-50"
          >
            {running ? 'Running...' : '▶ Run'}
          </button>

          {evalResult && (
            <div className="flex items-center gap-2 min-w-0">
              <span className={evalResult.passed ? 'badge-green' : 'badge-red'}>
                {evalResult.passed ? '✓ Correct' : '✗ Incorrect'}
              </span>
              <span className="text-xs text-gray-500 truncate">{evalResult.message}</span>
            </div>
          )}

          {queryResult && !queryResult.error && (
            <span className="text-xs text-gray-500 ml-auto shrink-0">
              {queryResult.rows?.length ?? 0} rows · {queryResult.timeMs}ms
            </span>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {queryResult?.error ? (
            <div className="bg-red-950/30 border border-red-900/50 rounded p-3 text-sm text-red-400 font-mono whitespace-pre-wrap">
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
                <p className="text-sm">
                  {mode === 'exercise' && !selectedPath
                    ? 'Select an exercise from the sidebar'
                    : 'Run a query to see results'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DifficultyBadge({ level }: { level: number }) {
  if (level <= 1) return <span className="badge-green">Easy</span>
  if (level <= 2) return <span className="badge-yellow">Medium</span>
  return <span className="badge-red">Hard</span>
}
