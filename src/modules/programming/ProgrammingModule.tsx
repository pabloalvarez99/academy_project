import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  ListProgrammingExerciseMeta,
  GetProgrammingExercise,
  SubmitCode,
  CheckRuntimes,
} from '../../lib/ipc'
import type { ExerciseSummary, Exercise, SubmitResult } from '../../lib/types'

const LANGUAGES = ['go', 'python', 'typescript', 'java', 'rust', 'c', 'cpp']

const LANG_MONACO: Record<string, string> = {
  go: 'go', python: 'python', typescript: 'typescript',
  java: 'java', rust: 'rust', c: 'c', cpp: 'cpp',
}

type DiffFilter = 'all' | 'easy' | 'medium' | 'hard'

function matchesDiff(difficulty: number, filter: DiffFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'easy') return difficulty <= 1
  if (filter === 'medium') return difficulty === 2
  return difficulty >= 3
}

export function ProgrammingModule() {
  const [lang, setLang] = useState('go')
  const [exercises, setExercises] = useState<ExerciseSummary[]>([])
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [runtimes, setRuntimes] = useState<Record<string, boolean>>({})

  // Load runtime availability once on mount
  useEffect(() => {
    CheckRuntimes().then(setRuntimes).catch(() => setRuntimes({}))
  }, [])

  useEffect(() => {
    setExercises([])
    setSelectedId(null)
    setExercise(null)
    setResult(null)
    setDiffFilter('all')
    ListProgrammingExerciseMeta(lang).then(setExercises).catch(() => setExercises([]))
  }, [lang])

  useEffect(() => {
    if (!selectedId) return
    setExercise(null)
    setResult(null)
    GetProgrammingExercise(lang, selectedId)
      .then((ex) => { setExercise(ex); setCode(ex.starterCode || '') })
      .catch(() => {})
  }, [selectedId, lang])

  async function handleSubmit() {
    if (!exercise || !code.trim()) return
    setSubmitting(true)
    setResult(null)
    try {
      const req = new programming.SubmitRequest()
      req.exerciseId = exercise.id
      req.language = lang
      req.code = code
      const r = await SubmitCode(req)
      setResult(r)
    } catch (e: any) {
      setResult({ passed: false, score: 0, testResults: [], error: e?.toString() } as any)
    } finally {
      setSubmitting(false)
    }
  }

  const runtimeAvailable = runtimes[lang] !== false
  const exerciseLabel = (ex: content.ExerciseSummary) =>
    ex.title || ex.id.split('/').pop()?.replace('.yaml', '') || ex.id

  const filtered = exercises.filter((ex) => matchesDiff(ex.difficulty, diffFilter))

  const DIFF_BUTTONS: { key: DiffFilter; label: string; active: string; count: number }[] = [
    { key: 'all',    label: 'All',    active: 'bg-surface-600 text-gray-100', count: exercises.length },
    { key: 'easy',   label: 'Easy',   active: 'bg-green-800/60 text-green-300', count: exercises.filter(e => e.difficulty <= 1).length },
    { key: 'medium', label: 'Med',    active: 'bg-yellow-800/60 text-yellow-300', count: exercises.filter(e => e.difficulty === 2).length },
    { key: 'hard',   label: 'Hard',   active: 'bg-red-800/60 text-red-300', count: exercises.filter(e => e.difficulty >= 3).length },
  ]

  return (
    <div className="flex h-full">
      {/* Left panel — sidebar */}
      <div className="w-56 min-w-[14rem] bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="p-3 border-b border-surface-600">
          <label className="block text-xs text-gray-500 mb-1">Language</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l} {runtimes[l] === false ? '✗' : runtimes[l] === true ? '✓' : ''}
              </option>
            ))}
          </select>
          {runtimes[lang] === false && (
            <p className="text-xs text-yellow-500 mt-1.5 leading-tight">
              ⚠ Runtime not found on PATH. Install {lang} to run exercises.
            </p>
          )}

          {/* Difficulty filter */}
          {exercises.length > 0 && (
            <div className="mt-2 flex gap-1">
              {DIFF_BUTTONS.map(({ key, label, active, count }) => (
                <button
                  key={key}
                  onClick={() => setDiffFilter(key)}
                  className={`flex-1 text-xs rounded px-1 py-1 transition-colors ${
                    diffFilter === key
                      ? active
                      : 'text-gray-600 hover:text-gray-400 hover:bg-surface-700'
                  }`}
                >
                  {label}
                  <span className="block text-[10px] leading-none mt-0.5 opacity-70">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">
              {exercises.length === 0 ? `No exercises for ${lang}` : 'No exercises match filter'}
            </p>
          ) : (
            filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedId(ex.id)}
                className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                  selectedId === ex.id
                    ? 'bg-accent/20 text-accent'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
                }`}
              >
                {exerciseLabel(ex)}
              </button>
            ))
          )}
        </div>

        {/* Runtime legend */}
        <div className="p-3 border-t border-surface-600 text-xs text-gray-700 space-y-0.5">
          <p className="text-gray-600 font-medium mb-1">Runtimes</p>
          {LANGUAGES.map((l) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className={runtimes[l] === true ? 'text-green-500' : runtimes[l] === false ? 'text-red-500' : 'text-gray-600'}>
                {runtimes[l] === true ? '✓' : runtimes[l] === false ? '✗' : '?'}
              </span>
              <span className={runtimes[l] === true ? 'text-gray-400' : 'text-gray-600'}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!exercise ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">⌨</p>
              <p>Select an exercise</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-surface-600">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-gray-100">{exercise.title}</h2>
                <DifficultyBadge level={exercise.difficulty} />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{exercise.description}</p>
              {exercise.hints && exercise.hints.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Hints ({exercise.hints.length})</summary>
                  <ul className="mt-1 text-xs text-gray-500 list-disc list-inside space-y-0.5">
                    {exercise.hints.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </details>
              )}
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <Editor
                language={LANG_MONACO[lang] || 'plaintext'}
                value={code}
                onChange={(v) => setCode(v || '')}
                theme="vs-dark"
                options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2 }}
              />
            </div>

            {/* Submit bar */}
            <div className="border-t border-surface-600 px-4 py-2 flex items-center gap-3 bg-surface-800 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={submitting || !runtimeAvailable}
                className="btn-primary disabled:opacity-50"
                title={!runtimeAvailable ? `${lang} runtime not found` : undefined}
              >
                {submitting ? 'Running...' : '▶ Run Tests'}
              </button>

              {result && (
                <>
                  <span className={result.passed ? 'badge-green' : 'badge-red'}>
                    {result.passed ? '✓ All passed' : '✗ Failed'}
                  </span>
                  <span className="text-xs text-gray-500">Score: {result.score}/100</span>
                </>
              )}
              {result?.error && (
                <span className="text-xs text-red-400 truncate max-w-xs">{result.error}</span>
              )}
            </div>

            {/* Test results panel */}
            {result && result.testResults && result.testResults.length > 0 && (
              <div className="border-t border-surface-600 max-h-48 overflow-y-auto bg-surface-800 flex-shrink-0">
                {result.testResults.map((tr, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2 border-b border-surface-700 text-xs ${tr.passed ? 'bg-green-950/20' : 'bg-red-950/20'}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={tr.passed ? 'text-green-400' : 'text-red-400'}>{tr.passed ? '✓' : '✗'}</span>
                      <span className="text-gray-400">Test #{tr.testIndex + 1}</span>
                      <span className="text-gray-600">{tr.timeMs}ms</span>
                      {tr.timedOut && <span className="badge-yellow">timeout</span>}
                    </div>
                    {!tr.passed && (
                      <div className="grid grid-cols-2 gap-2 mt-1 font-mono">
                        <div>
                          <span className="text-gray-600">Expected: </span>
                          <code className="text-green-400 whitespace-pre-wrap">{tr.expectedOutput}</code>
                        </div>
                        <div>
                          <span className="text-gray-600">Got: </span>
                          <code className="text-red-400 whitespace-pre-wrap">{tr.actualOutput}</code>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
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
