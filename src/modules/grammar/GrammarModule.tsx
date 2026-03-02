import { useEffect, useState, useCallback } from 'react'
import { ValidateGrammar, GetGrammarExercise, GetGrammarCurriculum } from '../../lib/ipc'
import type { ValidationResult, Exercise, CurriculumLevel, ConceptGroup } from '../../lib/types'
import { CheckCircle, Circle, Lock, ChevronRight, RotateCcw, BookOpen } from 'lucide-react'

// ── Progress ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'grammar-progress-v1'
interface Progress { passed: Record<string, boolean> }

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"passed":{}}') }
  catch { return { passed: {} } }
}
function saveProgress(p: Progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

function conceptProgress(concept: ConceptGroup, progress: Progress) {
  const total = concept.exercises.length
  const done = concept.exercises.filter(ex => progress.passed[ex.id]).length
  return { done, total }
}

function levelUnlocked(idx: number, levels: CurriculumLevel[], progress: Progress): boolean {
  if (idx === 0) return true
  const prev = levels[idx - 1]
  if (!prev) return false
  const total = prev.concepts.reduce((s, c) => s + c.exercises.length, 0)
  const done = prev.concepts.reduce((s, c) => s + c.exercises.filter(ex => progress.passed[ex.id]).length, 0)
  return done >= Math.ceil(total * 0.6)
}

function conceptUnlocked(idx: number, concepts: ConceptGroup[], progress: Progress): boolean {
  if (idx === 0) return true
  const prev = concepts[idx - 1]
  const { done, total } = conceptProgress(prev, progress)
  return done >= Math.ceil(total * 0.5)
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function GrammarModule() {
  const [levels, setLevels] = useState<CurriculumLevel[]>([])
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [activeLevelIdx, setActiveLevelIdx] = useState(0)
  const [selectedConcept, setSelectedConcept] = useState<ConceptGroup | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'tree' | 'exercise'>('tree')

  useEffect(() => {
    GetGrammarCurriculum().then(setLevels).catch(() => setLevels([]))
  }, [])

  const markPassed = useCallback((exerciseId: string) => {
    setProgress(prev => {
      const next = { passed: { ...prev.passed, [exerciseId]: true } }
      saveProgress(next)
      return next
    })
  }, [])

  async function openExercise(id: string) {
    setLoading(true)
    try {
      const ex = await GetGrammarExercise(id)
      setExercise(ex)
      setText(ex.starterCode || '')
      setResult(null)
      setActiveExerciseId(id)
      setView('exercise')
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleValidate() {
    if (!text.trim() || !exercise) return
    setLoading(true)
    try {
      const r = await ValidateGrammar(text)
      setResult(r)
      if (r.isValid && activeExerciseId) markPassed(activeExerciseId)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function resetProgress() {
    const empty = { passed: {} }
    saveProgress(empty)
    setProgress(empty)
    setSelectedConcept(null)
  }

  const activeLevel = levels[activeLevelIdx]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Level sidebar */}
      <div className="w-44 bg-surface-800 border-r border-surface-600 flex flex-col py-4 gap-1 px-2 shrink-0">
        <p className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Levels</p>
        {levels.map((lvl, idx) => {
          const unlocked = levelUnlocked(idx, levels, progress)
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
          <SkillTree level={activeLevel} levelIndex={activeLevelIdx} progress={progress}
            selectedConcept={selectedConcept} onSelectConcept={setSelectedConcept}
            onOpenExercise={openExercise} />
        )}
        {view === 'exercise' && exercise && (
          <ExercisePanel exercise={exercise} exerciseId={activeExerciseId!}
            text={text} setText={setText} result={result} loading={loading}
            passed={!!progress.passed[activeExerciseId!]}
            onValidate={handleValidate} onBack={() => setView('tree')} />
        )}
      </div>
    </div>
  )
}

// ── Skill Tree ────────────────────────────────────────────────────────────────

function SkillTree({ level, levelIndex, progress, selectedConcept, onSelectConcept, onOpenExercise }: {
  level: CurriculumLevel; levelIndex: number; progress: Progress
  selectedConcept: ConceptGroup | null
  onSelectConcept: (c: ConceptGroup) => void
  onOpenExercise: (id: string) => void
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
                    <div key={ex.id} className={`h-1 flex-1 rounded-full ${progress.passed[ex.id] ? 'bg-green-500' : 'bg-surface-600'}`} />
                  ))}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Concept detail */}
      {selectedConcept && (
        <ConceptDetail concept={selectedConcept} progress={progress} onOpenExercise={onOpenExercise} />
      )}
    </div>
  )
}

// ── Concept Detail ────────────────────────────────────────────────────────────

function ConceptDetail({ concept, progress, onOpenExercise }: {
  concept: ConceptGroup; progress: Progress; onOpenExercise: (id: string) => void
}) {
  return (
    <div className="mt-8 max-w-2xl">
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={13} className="text-accent" />
          <h3 className="text-base font-semibold text-gray-100">{concept.name}</h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{concept.description}</p>
      </div>
      <h4 className="text-xs text-gray-600 uppercase tracking-wider mb-3">Exercises</h4>
      <div className="flex flex-col gap-2">
        {concept.exercises.map((ex, idx) => {
          const passed = progress.passed[ex.id]
          const accessible = idx === 0 || !!progress.passed[concept.exercises[idx - 1].id]
          return (
            <button key={ex.id} disabled={!accessible && !passed}
              onClick={() => onOpenExercise(ex.id)}
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

function ExercisePanel({ exercise, exerciseId, text, setText, result, loading, passed, onValidate, onBack }: {
  exercise: Exercise; exerciseId: string; text: string; setText: (v: string) => void
  result: ValidationResult | null; loading: boolean; passed: boolean
  onValidate: () => void; onBack: () => void
}) {
  return (
    <div className="p-6 max-w-3xl">
      <button onClick={onBack}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-5 transition-colors">
        ← Back to skill tree
      </button>
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-lg font-semibold text-gray-100">{exercise.title}</h2>
        {passed && <CheckCircle size={16} className="text-green-400" />}
        <DifficultyBadge level={exercise.difficulty} />
        <span className="text-xs text-gray-700 ml-auto">{exerciseId}</span>
      </div>
      <div className="card mb-4">
        <pre className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{exercise.description}</pre>
      </div>
      {exercise.hints && exercise.hints.length > 0 && (
        <details className="mb-4">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 select-none">
            Show hints ({exercise.hints.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-gray-500 list-disc list-inside pl-2">
            {exercise.hints.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </details>
      )}
      <div className="card mb-4">
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Type your corrected version here..." rows={5}
          className="w-full bg-transparent text-gray-100 text-sm resize-none focus:outline-none placeholder-gray-600 font-mono" />
      </div>
      <button onClick={onValidate} disabled={loading || !text.trim()} className="btn-primary mb-6 disabled:opacity-50">
        {loading ? 'Checking...' : 'Validate Grammar'}
      </button>
      {result && (
        <div className="space-y-4">
          <div className="card flex items-center gap-4">
            <div className={`text-4xl font-bold tabular-nums ${
              result.score >= 80 ? 'text-green-400' : result.score >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>{result.score}</div>
            <div>
              <p className="text-sm text-gray-300 font-medium">Grammar Score</p>
              <p className="text-xs text-gray-500">
                {result.isValid ? 'No errors found' : `${result.errors?.length ?? 0} error(s) detected`}
              </p>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Errors Found</h3>
              <div className="space-y-3">
                {result.errors.map((err, i) => (
                  <div key={i} className="border border-red-900/50 bg-red-950/30 rounded p-3">
                    <span className="badge-red mb-1">{err.rule}</span>
                    <p className="text-sm text-gray-300 mt-1">{err.message}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-red-400">Found: <code className="bg-surface-700 px-1 rounded">{err.original}</code></span>
                      {err.suggest && (
                        <span className="text-green-400">Suggest: <code className="bg-surface-700 px-1 rounded">{err.suggest}</code></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.isValid && (
            <div className="card border-green-800 bg-green-950/30 text-center py-6">
              <p className="text-green-400 text-lg font-semibold">Perfect — no grammar errors!</p>
              <p className="text-green-600 text-xs mt-1">Exercise marked as complete.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DifficultyBadge({ level }: { level: number }) {
  if (level <= 1) return <span className="badge-green">Easy</span>
  if (level <= 2) return <span className="badge-yellow">Medium</span>
  return <span className="badge-red">Hard</span>
}
