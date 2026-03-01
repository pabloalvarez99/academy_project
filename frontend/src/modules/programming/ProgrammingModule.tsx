import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  ListProgrammingExercises,
  GetProgrammingExercise,
  SubmitCode,
} from '../../../wailsjs/go/main/App'
import { content, programming } from '../../../wailsjs/go/models'

const LANGUAGES = ['go', 'python', 'typescript', 'java', 'rust', 'c', 'cpp']

const LANG_MONACO: Record<string, string> = {
  go: 'go',
  python: 'python',
  typescript: 'typescript',
  java: 'java',
  rust: 'rust',
  c: 'c',
  cpp: 'cpp',
}

export function ProgrammingModule() {
  const [lang, setLang] = useState('go')
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exercise, setExercise] = useState<content.Exercise | null>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<programming.SubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setExercises([])
    setSelectedId(null)
    setExercise(null)
    setResult(null)
    ListProgrammingExercises(lang).then(setExercises).catch(() => setExercises([]))
  }, [lang])

  useEffect(() => {
    if (!selectedId) return
    setExercise(null)
    setResult(null)
    GetProgrammingExercise(lang, selectedId)
      .then((ex) => {
        setExercise(ex)
        setCode(ex.starterCode || '')
      })
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

  return (
    <div className="flex h-full">
      {/* Left panel — exercise list */}
      <div className="w-56 min-w-[14rem] bg-surface-800 border-r border-surface-600 flex flex-col">
        <div className="p-3 border-b border-surface-600">
          <label className="block text-xs text-gray-500 mb-1">Language</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {exercises.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-600 text-center">No exercises for {lang}</p>
          ) : (
            exercises.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedId(id)}
                className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                  selectedId === id
                    ? 'bg-accent/20 text-accent'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
                }`}
              >
                {id}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!exercise ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">⌨</p>
              <p>Select an exercise from the list</p>
            </div>
          </div>
        ) : (
          <>
            {/* Exercise header */}
            <div className="px-5 pt-5 pb-3 border-b border-surface-600">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-100">{exercise.title}</h2>
                <DifficultyBadge level={exercise.difficulty} />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{exercise.description}</p>
              {exercise.hints && exercise.hints.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Show hints</summary>
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
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                }}
              />
            </div>

            {/* Submit bar */}
            <div className="border-t border-surface-600 px-4 py-2 flex items-center gap-3 bg-surface-800">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? 'Running...' : '▶ Run Tests'}
              </button>

              {result && (
                <div className="flex items-center gap-3">
                  <span className={result.passed ? 'badge-green' : 'badge-red'}>
                    {result.passed ? '✓ All passed' : '✗ Failed'}
                  </span>
                  <span className="text-xs text-gray-500">Score: {result.score}/100</span>
                </div>
              )}
              {result?.error && (
                <span className="text-xs text-red-400 truncate max-w-xs">{result.error}</span>
              )}
            </div>

            {/* Test results */}
            {result && result.testResults && result.testResults.length > 0 && (
              <div className="border-t border-surface-600 max-h-48 overflow-y-auto bg-surface-800">
                {result.testResults.map((tr, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2 border-b border-surface-700 text-xs ${
                      tr.passed ? 'bg-green-950/20' : 'bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{tr.passed ? '✓' : '✗'}</span>
                      <span className="text-gray-400">Test #{tr.testIndex + 1}</span>
                      <span className="text-gray-600">{tr.timeMs}ms</span>
                      {tr.timedOut && <span className="badge-yellow">timeout</span>}
                    </div>
                    {!tr.passed && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <span className="text-gray-600">Expected: </span>
                          <code className="text-green-400">{tr.expectedOutput}</code>
                        </div>
                        <div>
                          <span className="text-gray-600">Got: </span>
                          <code className="text-red-400">{tr.actualOutput}</code>
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
