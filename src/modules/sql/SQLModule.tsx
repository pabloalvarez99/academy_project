import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { ExecuteSQLExercise, RunFreeSQL, RecordAttempt, GetSQLExercise } from '../../lib/ipc'
import type { EvaluationResult, QueryResult } from '../../lib/types'
import { CheckCircle, Circle, Lock, ChevronRight, RotateCcw, BookOpen, Terminal } from 'lucide-react'

// ── Curriculum ────────────────────────────────────────────────────────────────

interface SQLExerciseRef {
  id: string
  title: string
  difficulty: number
}

interface SQLConcept {
  id: string
  name: string
  description: string
  exercises: SQLExerciseRef[]
}

interface SQLLevel {
  level: number
  name: string
  description: string
  concepts: SQLConcept[]
}

const SQL_CURRICULUM: SQLLevel[] = [
  {
    level: 1,
    name: 'SELECT Basics',
    description: 'Retrieve and filter data from a single table.',
    concepts: [
      {
        id: 'fetching',
        name: 'Fetching Data',
        description: 'SELECT retrieves rows from a table.\n\nSELECT * FROM table — returns all columns.\nSELECT col1, col2 FROM table — returns specific columns.\n\nAlways prefer specifying columns in production code instead of * for clarity and performance.',
        exercises: [
          { id: 'sql/exercises/select/001-all-customers.yaml', title: 'SELECT All Customers', difficulty: 1 },
          { id: 'sql/exercises/select/002-specific-columns.yaml', title: 'Specific Columns', difficulty: 1 },
        ],
      },
      {
        id: 'filtering',
        name: 'Filtering & Sorting',
        description: 'WHERE filters which rows are returned.\nORDER BY sorts results ascending (ASC) or descending (DESC).\nLIMIT caps the number of rows.\n\nExample:\n  SELECT name, city FROM customers\n  WHERE country = \'UK\'\n  ORDER BY name ASC\n  LIMIT 5;',
        exercises: [
          { id: 'sql/exercises/select/003-where-filter.yaml', title: 'WHERE Filter', difficulty: 1 },
          { id: 'sql/exercises/select/005-order-limit.yaml', title: 'ORDER BY & LIMIT', difficulty: 1 },
          { id: 'sql/exercises/select/006-like-filter.yaml', title: 'LIKE Pattern Match', difficulty: 2 },
          { id: 'sql/exercises/select/007-distinct.yaml', title: 'DISTINCT Values', difficulty: 1 },
        ],
      },
    ],
  },
  {
    level: 2,
    name: 'Aggregation',
    description: 'Summarize data with aggregate functions.',
    concepts: [
      {
        id: 'aggregate-basics',
        name: 'Count & Sum',
        description: 'Aggregate functions collapse many rows into a single value:\n\n  COUNT(*) — total rows\n  SUM(col)  — total of a numeric column\n  AVG(col)  — average value\n  MIN/MAX   — extremes\n\nExample:\n  SELECT COUNT(*) AS total, SUM(amount) AS revenue\n  FROM orders;',
        exercises: [
          { id: 'sql/exercises/aggregate/001-count-customers.yaml', title: 'Count Customers', difficulty: 1 },
          { id: 'sql/exercises/aggregate/002-total-revenue.yaml', title: 'Total Revenue', difficulty: 1 },
          { id: 'sql/exercises/aggregate/003-avg-order.yaml', title: 'Average Order Value', difficulty: 2 },
        ],
      },
      {
        id: 'grouping',
        name: 'GROUP BY & HAVING',
        description: 'GROUP BY splits rows into buckets before applying aggregates.\nHAVING filters those buckets (like WHERE but on aggregate results).\n\nExample:\n  SELECT country, COUNT(*) AS total\n  FROM customers\n  GROUP BY country\n  HAVING COUNT(*) > 1\n  ORDER BY total DESC;',
        exercises: [
          { id: 'sql/exercises/aggregate/004-group-by-country.yaml', title: 'Group by Country', difficulty: 2 },
          { id: 'sql/exercises/aggregate/005-having-filter.yaml', title: 'HAVING Filter', difficulty: 2 },
          { id: 'sql/exercises/aggregate/006-min-max-per-group.yaml', title: 'Min/Max per Group', difficulty: 2 },
          { id: 'sql/exercises/aggregate/007-percentile-ntile.yaml', title: 'Percentile & NTILE', difficulty: 3 },
        ],
      },
    ],
  },
  {
    level: 3,
    name: 'Joins',
    description: 'Combine rows from multiple tables.',
    concepts: [
      {
        id: 'basic-joins',
        name: 'INNER & LEFT Joins',
        description: 'JOIN combines rows from two tables on a matching column.\n\n  INNER JOIN — only matching rows from both tables.\n  LEFT JOIN  — all rows from left; NULL where no match.\n\nExample:\n  SELECT c.name, o.amount\n  FROM customers c\n  INNER JOIN orders o ON c.id = o.customer_id;',
        exercises: [
          { id: 'sql/exercises/join/001-customer-orders.yaml', title: 'Customer Orders', difficulty: 1 },
          { id: 'sql/exercises/select/004-join.yaml', title: 'Join in SELECT', difficulty: 2 },
          { id: 'sql/exercises/join/004-left-join-nulls.yaml', title: 'LEFT JOIN & NULLs', difficulty: 2 },
          { id: 'sql/exercises/join/003-three-table-join.yaml', title: 'Three-Table Join', difficulty: 2 },
        ],
      },
      {
        id: 'advanced-joins',
        name: 'Complex Joins',
        description: 'Advanced join patterns:\n\n  Self-join: join a table to itself (e.g. hierarchy queries).\n  Aggregated join: combine JOIN + GROUP BY to rank results.\n\nExample (self-join):\n  SELECT e.name, m.name AS manager\n  FROM employees e\n  LEFT JOIN employees m ON e.manager_id = m.id;',
        exercises: [
          { id: 'sql/exercises/join/002-top-spenders.yaml', title: 'Top Spenders', difficulty: 2 },
          { id: 'sql/exercises/join/005-self-join.yaml', title: 'Self Join', difficulty: 3 },
        ],
      },
    ],
  },
  {
    level: 4,
    name: 'Advanced SQL',
    description: 'Subqueries, window functions, and CTEs.',
    concepts: [
      {
        id: 'subqueries',
        name: 'Subqueries',
        description: 'A subquery is a SELECT nested inside another query.\n\n  Scalar: returns one value → used in WHERE or SELECT.\n  IN / NOT IN: match against a result set.\n  EXISTS: check whether any row matches.\n  Correlated: references the outer query.\n\nExample:\n  SELECT name FROM products\n  WHERE price > (SELECT AVG(price) FROM products);',
        exercises: [
          { id: 'sql/exercises/subquery/001-above-average.yaml', title: 'Above Average Price', difficulty: 2 },
          { id: 'sql/exercises/subquery/002-customers-no-orders.yaml', title: 'Customers Without Orders', difficulty: 2 },
          { id: 'sql/exercises/subquery/003-product-above-category-avg.yaml', title: 'Product Above Category Avg', difficulty: 3 },
          { id: 'sql/exercises/subquery/004-dense-rank-top.yaml', title: 'Dense Rank Top', difficulty: 3 },
        ],
      },
      {
        id: 'window-cte',
        name: 'Window Functions & CTEs',
        description: 'Window functions compute over a "window" of related rows without collapsing them:\n  ROW_NUMBER(), RANK(), DENSE_RANK()\n  SUM() OVER (PARTITION BY ...)\n\nCTE (Common Table Expression) names a subquery for reuse:\n  WITH recent AS (\n    SELECT * FROM orders WHERE order_date > \'2024-01-01\'\n  )\n  SELECT * FROM recent;',
        exercises: [
          { id: 'sql/exercises/select/008-window-rank.yaml', title: 'Window RANK', difficulty: 3 },
          { id: 'sql/exercises/select/009-cte-running-total.yaml', title: 'CTE Running Total', difficulty: 3 },
          { id: 'sql/exercises/select/010-recursive-cte.yaml', title: 'Recursive CTE', difficulty: 3 },
        ],
      },
    ],
  },
]

// ── Progress ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sql-progress-v1'
interface Progress { passed: Record<string, boolean> }

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"passed":{}}') }
  catch { return { passed: {} } }
}
function saveProgress(p: Progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

function conceptProgress(concept: SQLConcept, progress: Progress) {
  const total = concept.exercises.length
  const done = concept.exercises.filter(ex => progress.passed[ex.id]).length
  return { done, total }
}

function levelUnlocked(idx: number, progress: Progress): boolean {
  if (idx === 0) return true
  const prev = SQL_CURRICULUM[idx - 1]
  if (!prev) return false
  const total = prev.concepts.reduce((s, c) => s + c.exercises.length, 0)
  const done = prev.concepts.reduce((s, c) => s + c.exercises.filter(ex => progress.passed[ex.id]).length, 0)
  return done >= Math.ceil(total * 0.6)
}

function conceptUnlocked(idx: number, concepts: SQLConcept[], progress: Progress): boolean {
  if (idx === 0) return true
  const prev = concepts[idx - 1]
  const { done, total } = conceptProgress(prev, progress)
  return done >= Math.ceil(total * 0.5)
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function SQLModule() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [activeLevelIdx, setActiveLevelIdx] = useState(0)
  const [selectedConcept, setSelectedConcept] = useState<SQLConcept | null>(null)
  const [view, setView] = useState<'tree' | 'exercise' | 'free'>('tree')

  // Exercise state
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [exerciseTitle, setExerciseTitle] = useState('')
  const [exerciseDifficulty, setExerciseDifficulty] = useState(1)
  const [exerciseDescription, setExerciseDescription] = useState('')
  const [query, setQuery] = useState('')
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)

  // Free SQL state
  const [freeQuery, setFreeQuery] = useState('SELECT * FROM customers LIMIT 10;')
  const [freeResult, setFreeResult] = useState<QueryResult | null>(null)
  const [freeRunning, setFreeRunning] = useState(false)

  const markPassed = useCallback((exerciseId: string) => {
    setProgress(prev => {
      const next = { passed: { ...prev.passed, [exerciseId]: true } }
      saveProgress(next)
      return next
    })
  }, [])

  async function openExercise(id: string, title: string, difficulty: number) {
    setActiveExerciseId(id)
    setExerciseTitle(title)
    setExerciseDifficulty(difficulty)
    setExerciseDescription('')
    setQuery(`-- ${title}\n\n`)
    setEvalResult(null)
    setQueryResult(null)
    setView('exercise')
    try {
      const ex = await GetSQLExercise(id)
      if (ex.description) setExerciseDescription(ex.description)
      if (ex.starterCode) setQuery(ex.starterCode)
    } catch {}
  }

  async function handleRunExercise() {
    if (!activeExerciseId) return
    setRunning(true)
    setEvalResult(null)
    setQueryResult(null)
    try {
      const r = await ExecuteSQLExercise(activeExerciseId, query)
      setEvalResult(r)
      setQueryResult(r.userResult)
      RecordAttempt(activeExerciseId, 'sql', r.passed ? 'passed' : 'failed', r.score ?? 0).catch(() => {})
      if (r.passed) markPassed(activeExerciseId)
    } catch (e: unknown) {
      setQueryResult({ columns: [], rows: [], rowsAffected: 0, timeMs: 0, error: String(e) } as QueryResult)
    } finally {
      setRunning(false)
    }
  }

  async function handleFreeRun() {
    setFreeRunning(true)
    try {
      const r = await RunFreeSQL('', freeQuery)
      setFreeResult(r)
    } catch (e: unknown) {
      setFreeResult({ columns: [], rows: [], rowsAffected: 0, timeMs: 0, error: String(e) } as QueryResult)
    } finally {
      setFreeRunning(false)
    }
  }

  function resetProgress() {
    const empty = { passed: {} }
    saveProgress(empty)
    setProgress(empty)
    setSelectedConcept(null)
    setView('tree')
  }

  const activeLevel = SQL_CURRICULUM[activeLevelIdx]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Level sidebar */}
      <div className="w-44 bg-surface-800 border-r border-surface-600 flex flex-col py-4 gap-1 px-2 shrink-0">
        <p className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Levels</p>
        {SQL_CURRICULUM.map((lvl, idx) => {
          const unlocked = levelUnlocked(idx, progress)
          const totalEx = lvl.concepts.reduce((s, c) => s + c.exercises.length, 0)
          const doneEx = lvl.concepts.reduce((s, c) => s + c.exercises.filter(ex => progress.passed[ex.id]).length, 0)
          const pct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0
          return (
            <button key={lvl.level} disabled={!unlocked}
              onClick={() => { setActiveLevelIdx(idx); setView('tree'); setSelectedConcept(null) }}
              className={`text-left rounded px-3 py-2.5 transition-colors ${
                activeLevelIdx === idx && view === 'tree'
                  ? 'bg-accent text-white'
                  : unlocked ? 'text-gray-300 hover:bg-surface-700'
                  : 'text-gray-700 cursor-not-allowed'
              }`}>
              <div className="flex items-center gap-1.5">
                {!unlocked && <Lock size={10} className="shrink-0" />}
                <span className="text-xs font-medium">{lvl.name}</span>
              </div>
              {unlocked && (
                <div className="mt-1.5 h-1 bg-surface-600 rounded-full overflow-hidden">
                  <div className="h-full bg-accent/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          )
        })}

        <div className="mt-3 mx-2 border-t border-surface-600 pt-3">
          <button
            onClick={() => setView('free')}
            className={`w-full text-left rounded px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
              view === 'free' ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-surface-700'
            }`}>
            <Terminal size={11} />
            Free SQL
          </button>
        </div>

        <div className="mt-auto px-2">
          <button onClick={resetProgress}
            className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-500 transition-colors">
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {view === 'tree' && activeLevel && (
          <SQLSkillTree
            level={activeLevel}
            levelIndex={activeLevelIdx}
            progress={progress}
            selectedConcept={selectedConcept}
            onSelectConcept={setSelectedConcept}
            onOpenExercise={openExercise}
          />
        )}
        {view === 'exercise' && (
          <SQLExercisePanel
            exerciseId={activeExerciseId!}
            title={exerciseTitle}
            difficulty={exerciseDifficulty}
            description={exerciseDescription}
            query={query}
            setQuery={setQuery}
            evalResult={evalResult}
            queryResult={queryResult}
            running={running}
            passed={!!progress.passed[activeExerciseId!]}
            onRun={handleRunExercise}
            onBack={() => setView('tree')}
          />
        )}
        {view === 'free' && (
          <FreeSQLPanel
            query={freeQuery}
            setQuery={setFreeQuery}
            result={freeResult}
            running={freeRunning}
            onRun={handleFreeRun}
          />
        )}
      </div>
    </div>
  )
}

// ── Skill Tree ────────────────────────────────────────────────────────────────

function SQLSkillTree({ level, levelIndex, progress, selectedConcept, onSelectConcept, onOpenExercise }: {
  level: SQLLevel; levelIndex: number; progress: Progress
  selectedConcept: SQLConcept | null
  onSelectConcept: (c: SQLConcept) => void
  onOpenExercise: (id: string, title: string, difficulty: number) => void
}) {
  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-medium">
            Level {levelIndex + 1}
          </span>
          <h2 className="text-xl font-bold text-gray-100">{level.name}</h2>
        </div>
        <p className="text-sm text-gray-500">{level.description}</p>
      </div>

      {/* Horizontal concept flow */}
      <div className="flex items-start gap-2 overflow-x-auto pb-4">
        {level.concepts.map((concept, idx) => {
          const unlocked = conceptUnlocked(idx, level.concepts, progress)
          const { done, total } = conceptProgress(concept, progress)
          const completed = done === total && total > 0
          const isSelected = selectedConcept?.id === concept.id
          return (
            <div key={concept.id} className="flex items-center gap-2 shrink-0">
              {idx > 0 && (
                <div className={`w-6 h-0.5 shrink-0 mt-8 ${unlocked ? 'bg-accent/40' : 'bg-surface-600'}`} />
              )}
              <button disabled={!unlocked} onClick={() => unlocked && onSelectConcept(concept)}
                className={`w-40 rounded-lg border p-3 text-left transition-all ${
                  isSelected ? 'border-accent bg-accent/10'
                  : completed ? 'border-green-700 bg-green-950/30 hover:border-green-500'
                  : unlocked ? 'border-surface-600 bg-surface-800 hover:border-accent/50'
                  : 'border-surface-700 bg-surface-800/50 opacity-50 cursor-not-allowed'
                }`}>
                <div className="flex justify-between items-start mb-2">
                  {completed ? <CheckCircle size={14} className="text-green-400" />
                    : unlocked ? <Circle size={14} className="text-accent" />
                    : <Lock size={14} className="text-gray-700" />}
                  <span className="text-xs text-gray-600">{done}/{total}</span>
                </div>
                <p className="text-xs font-medium text-gray-100 leading-snug mb-2">{concept.name}</p>
                <div className="flex gap-0.5">
                  {concept.exercises.map(ex => (
                    <div key={ex.id}
                      className={`h-1 flex-1 rounded-full ${progress.passed[ex.id] ? 'bg-green-500' : 'bg-surface-600'}`}
                    />
                  ))}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Concept detail */}
      {selectedConcept && (
        <SQLConceptDetail
          concept={selectedConcept}
          progress={progress}
          onOpenExercise={onOpenExercise}
        />
      )}
    </div>
  )
}

// ── Concept Detail ────────────────────────────────────────────────────────────

function SQLConceptDetail({ concept, progress, onOpenExercise }: {
  concept: SQLConcept; progress: Progress
  onOpenExercise: (id: string, title: string, difficulty: number) => void
}) {
  return (
    <div className="mt-8 max-w-2xl">
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={13} className="text-accent" />
          <h3 className="text-base font-semibold text-gray-100">{concept.name}</h3>
        </div>
        <pre className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap font-sans">{concept.description}</pre>
      </div>
      <h4 className="text-xs text-gray-600 uppercase tracking-wider mb-3">Exercises</h4>
      <div className="flex flex-col gap-2">
        {concept.exercises.map((ex, idx) => {
          const passed = progress.passed[ex.id]
          const accessible = idx === 0 || !!progress.passed[concept.exercises[idx - 1].id]
          return (
            <button key={ex.id} disabled={!accessible && !passed}
              onClick={() => onOpenExercise(ex.id, ex.title, ex.difficulty)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                passed ? 'border-green-700 bg-green-950/20 hover:border-green-500'
                : accessible ? 'border-surface-600 bg-surface-800 hover:border-accent/50'
                : 'border-surface-700 bg-surface-800/40 opacity-50 cursor-not-allowed'
              }`}>
              {passed ? <CheckCircle size={15} className="text-green-400 shrink-0" />
                : accessible ? <Circle size={15} className="text-accent shrink-0" />
                : <Lock size={15} className="text-gray-700 shrink-0" />}
              <span className="text-sm text-gray-200">{ex.title}</span>
              <DifficultyBadge level={ex.difficulty} />
              {accessible && !passed && <ChevronRight size={13} className="text-gray-600 shrink-0 ml-auto" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Exercise Panel ────────────────────────────────────────────────────────────

function SQLExercisePanel({ exerciseId, title, difficulty, description, query, setQuery,
  evalResult, queryResult, running, passed, onRun, onBack }: {
  exerciseId: string; title: string; difficulty: number; description: string
  query: string; setQuery: (v: string) => void
  evalResult: EvaluationResult | null; queryResult: QueryResult | null
  running: boolean; passed: boolean
  onRun: () => void; onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-surface-600 flex items-center gap-3 shrink-0">
        <button onClick={onBack}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Skill Tree
        </button>
        <span className="text-gray-700">·</span>
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
        {passed && <CheckCircle size={14} className="text-green-400" />}
        <DifficultyBadge level={difficulty} />
      </div>

      {/* Description */}
      {description && (
        <div className="px-6 pt-3 pb-2 border-b border-surface-600 shrink-0">
          <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{description}</p>
        </div>
      )}

      {/* Editor */}
      <div className="h-44 border-b border-surface-600 shrink-0">
        <Editor
          language="sql"
          value={query}
          onChange={(v) => setQuery(v || '')}
          theme="vs-dark"
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on' }}
        />
      </div>

      {/* Run bar */}
      <div className="px-4 py-2 border-b border-surface-600 bg-surface-800 flex items-center gap-3 shrink-0">
        <button onClick={onRun} disabled={running} className="btn-primary disabled:opacity-50">
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
          <ResultTable queryResult={queryResult} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">⛃</p>
              <p className="text-sm">Write a query and click Run</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Free SQL Panel ────────────────────────────────────────────────────────────

function FreeSQLPanel({ query, setQuery, result, running, onRun }: {
  query: string; setQuery: (v: string) => void
  result: QueryResult | null; running: boolean; onRun: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-surface-600 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-gray-200">Free SQL</h2>
          <span className="text-xs text-gray-600">— Northwind schema</span>
        </div>
        <p className="text-xs text-gray-700 mt-1">
          customers(id, name, city, country) · orders(id, customer_id, order_date, amount) · products(id, name, price, stock)
        </p>
      </div>

      {/* Editor */}
      <div className="h-52 border-b border-surface-600 shrink-0">
        <Editor
          language="sql"
          value={query}
          onChange={(v) => setQuery(v || '')}
          theme="vs-dark"
          options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on' }}
        />
      </div>

      {/* Run bar */}
      <div className="px-4 py-2 border-b border-surface-600 bg-surface-800 flex items-center gap-3 shrink-0">
        <button onClick={onRun} disabled={running} className="btn-primary disabled:opacity-50">
          {running ? 'Running...' : '▶ Run'}
        </button>
        {result && !result.error && (
          <span className="text-xs text-gray-500 ml-auto shrink-0">
            {result.rows?.length ?? 0} rows · {result.timeMs}ms
          </span>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {result?.error ? (
          <div className="bg-red-950/30 border border-red-900/50 rounded p-3 text-sm text-red-400 font-mono whitespace-pre-wrap">
            {result.error}
          </div>
        ) : result && result.columns && result.columns.length > 0 ? (
          <ResultTable queryResult={result} />
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
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function ResultTable({ queryResult }: { queryResult: QueryResult }) {
  return (
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
              {(row as unknown[]).map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 border border-surface-700 text-gray-400 max-w-xs truncate">
                  {String(cell ?? 'NULL')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DifficultyBadge({ level }: { level: number }) {
  if (level <= 1) return <span className="badge-green">Easy</span>
  if (level <= 2) return <span className="badge-yellow">Medium</span>
  return <span className="badge-red">Hard</span>
}
