import { ipcMain } from 'electron'
import { execFileSync, execFile } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, tmpdir } from 'path'
import { randomUUID } from 'crypto'
import { loadExercise, listExercises, listExerciseMeta } from './content'

// ── Language configs ──────────────────────────────────────────────────────────

interface LangConfig {
  sourceFile: string
  compiler?: string[]       // command + args for compile step
  runner: string[]          // command + args to run (use '{bin}' placeholder)
  timeLimitMs: number
}

const LANG_CONFIGS: Record<string, LangConfig> = {
  go: {
    sourceFile: 'main.go',
    compiler: ['go', 'build', '-o', 'main', 'main.go'],
    runner: ['{bin}/main'],
    timeLimitMs: 10_000,
  },
  rust: {
    sourceFile: 'main.rs',
    compiler: ['rustc', '-o', 'main', 'main.rs'],
    runner: ['{bin}/main'],
    timeLimitMs: 30_000,
  },
  python: {
    sourceFile: 'main.py',
    runner: ['python3', 'main.py'],
    timeLimitMs: 10_000,
  },
  typescript: {
    sourceFile: 'main.ts',
    runner: ['deno', 'run', '--no-prompt', 'main.ts'],
    timeLimitMs: 10_000,
  },
  java: {
    sourceFile: 'Main.java',
    compiler: ['javac', 'Main.java'],
    runner: ['java', 'Main'],
    timeLimitMs: 15_000,
  },
  c: {
    sourceFile: 'main.c',
    compiler: ['gcc', '-o', 'main', 'main.c'],
    runner: ['{bin}/main'],
    timeLimitMs: 10_000,
  },
  cpp: {
    sourceFile: 'main.cpp',
    compiler: ['g++', '-o', 'main', 'main.cpp'],
    runner: ['{bin}/main'],
    timeLimitMs: 10_000,
  },
}

// ── Sandbox execution ─────────────────────────────────────────────────────────

interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
  timeMs: number
  compiled: boolean
  timedOut: boolean
  error: string
}

function runInSandbox(lang: string, code: string, input: string, timeLimitMs?: number): RunResult {
  const cfg = LANG_CONFIGS[lang]
  if (!cfg) return { stdout: '', stderr: '', exitCode: 1, timeMs: 0, compiled: false, timedOut: false, error: `Unsupported language: ${lang}` }

  const sandboxDir = join(tmpdir(), `eks-sandbox-${randomUUID()}`)
  mkdirSync(sandboxDir, { recursive: true })

  const result: RunResult = { stdout: '', stderr: '', exitCode: 0, timeMs: 0, compiled: false, timedOut: false, error: '' }
  const timeout = timeLimitMs || cfg.timeLimitMs

  try {
    // Write source file
    writeFileSync(join(sandboxDir, cfg.sourceFile), code, 'utf-8')

    // Compile step (if needed)
    if (cfg.compiler) {
      try {
        execFileSync(cfg.compiler[0], cfg.compiler.slice(1), {
          cwd: sandboxDir,
          timeout: 30_000,
          stdio: 'pipe',
        })
        result.compiled = true
      } catch (err: unknown) {
        const e = err as { stderr?: Buffer; message?: string }
        result.stderr = e.stderr?.toString() || e.message || 'Compilation failed'
        result.exitCode = 1
        return result
      }
    } else {
      result.compiled = true
    }

    // Run step
    const runCmd = cfg.runner.map((s) => s.replace('{bin}', sandboxDir))
    const startTime = Date.now()

    try {
      const stdout = execFileSync(runCmd[0], runCmd.slice(1), {
        cwd: sandboxDir,
        timeout,
        input,
        stdio: 'pipe',
        maxBuffer: 1024 * 1024, // 1 MB
      })
      result.timeMs = Date.now() - startTime
      result.stdout = stdout.toString()
    } catch (err: unknown) {
      const e = err as { stdout?: Buffer; stderr?: Buffer; signal?: string; status?: number; message?: string }
      result.timeMs = Date.now() - startTime
      result.stdout = e.stdout?.toString() || ''
      result.stderr = e.stderr?.toString() || e.message || ''
      result.timedOut = e.signal === 'SIGTERM' || e.signal === 'SIGKILL'
      result.exitCode = e.status ?? 1
    }
  } finally {
    try { rmSync(sandboxDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  return result
}

// ── Test case evaluation ──────────────────────────────────────────────────────

interface TestResult {
  testIndex: number
  passed: boolean
  expectedOutput: string
  actualOutput: string
  timeMs: number
  timedOut: boolean
}

interface SubmitRequest {
  exerciseId: string
  language: string
  code: string
}

interface SubmitResult {
  passed: boolean
  score: number
  testResults: TestResult[]
  error?: string
}

function normalizeOutput(s: string): string {
  return s.trim().replace(/\r\n/g, '\n')
}

// ── Runtime detection ─────────────────────────────────────────────────────────

function commandExists(cmd: string): boolean {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which'
    execFileSync(which, [cmd], { stdio: 'pipe', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerProgrammingHandlers(): void {
  ipcMain.handle('prog:list', (_event, lang: string) => {
    return listExercises('programming', lang)
  })

  ipcMain.handle('prog:meta', (_event, lang: string) => {
    return listExerciseMeta('programming', lang)
  })

  ipcMain.handle('prog:get', (_event, lang: string, id: string) => {
    // id can be full path or just the exercise filename without .yaml
    if (id.startsWith('programming/')) return loadExercise(id)
    return loadExercise(`programming/${lang}/exercises/${id}.yaml`)
  })

  ipcMain.handle('prog:submit', (_event, req: SubmitRequest): SubmitResult => {
    try {
      const exercise = loadExercise(
        req.exerciseId.startsWith('programming/')
          ? req.exerciseId
          : `programming/${req.language}/exercises/${req.exerciseId}.yaml`
      )

      if (!exercise.testCases || exercise.testCases.length === 0) {
        return { passed: false, score: 0, testResults: [], error: 'No test cases defined' }
      }

      const testResults: TestResult[] = []
      let passedCount = 0

      for (let i = 0; i < exercise.testCases.length; i++) {
        const tc = exercise.testCases[i]
        const timeLimitMs = tc.timeLimitMs || 10_000
        const runResult = runInSandbox(req.language, req.code, tc.input, timeLimitMs)

        const actualOutput = normalizeOutput(runResult.stdout)
        const expectedOutput = normalizeOutput(tc.expectedOutput)
        const passed = !runResult.timedOut && runResult.exitCode === 0 && actualOutput === expectedOutput

        if (passed) passedCount++
        testResults.push({
          testIndex: i,
          passed,
          expectedOutput: tc.expectedOutput,
          actualOutput: runResult.stdout,
          timeMs: runResult.timeMs,
          timedOut: runResult.timedOut,
        })
      }

      const score = Math.round((passedCount / exercise.testCases.length) * 100)
      return { passed: passedCount === exercise.testCases.length, score, testResults }
    } catch (err: unknown) {
      return { passed: false, score: 0, testResults: [], error: String(err) }
    }
  })

  ipcMain.handle('prog:runtimes', (): Record<string, boolean> => {
    return {
      go: commandExists('go'),
      rust: commandExists('rustc'),
      python: commandExists('python3') || commandExists('python'),
      typescript: commandExists('deno'),
      java: commandExists('java'),
      c: commandExists('gcc') || commandExists('tcc'),
      cpp: commandExists('g++'),
    }
  })
}
