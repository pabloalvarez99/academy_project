import { ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import initSqlJs, { type SqlJsStatic, type Database } from 'sql.js'
import { is } from '@electron-toolkit/utils'
import { loadExercise, listExercises, getContentDir } from './content'

// ── Types ────────────────────────────────────────────────────────────────────

interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowsAffected: number
  timeMs: number
  error?: string
}

interface EvaluationResult {
  passed: boolean
  userResult: QueryResult
  score: number
  message: string
  queryPlan?: string
}

// ── sql.js loader ─────────────────────────────────────────────────────────────

let _SQL: SqlJsStatic | null = null

async function getSQL(): Promise<SqlJsStatic> {
  if (_SQL) return _SQL
  const wasmPath = is.dev
    ? join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    : join(process.resourcesPath, 'sql-js', 'sql-wasm.wasm')
  const wasmBinary = readFileSync(wasmPath)
  _SQL = await initSqlJs({ wasmBinary })
  return _SQL
}

// ── SQL execution ─────────────────────────────────────────────────────────────

async function runQuery(schema: string, query: string): Promise<QueryResult> {
  const SQL = await getSQL()
  const db: Database = new SQL.Database()
  const start = Date.now()
  try {
    if (schema) db.run(schema)
    const timeMs = Date.now() - start
    try {
      const results = db.exec(query.trim())
      if (results.length === 0) {
        return { columns: [], rows: [], rowsAffected: 0, timeMs }
      }
      const { columns, values } = results[0]
      return { columns, rows: values as unknown[][], rowsAffected: 0, timeMs }
    } catch (err: unknown) {
      return { columns: [], rows: [], rowsAffected: 0, timeMs: Date.now() - start, error: String(err) }
    }
  } finally {
    db.close()
  }
}

async function getQueryPlan(schema: string, query: string): Promise<string> {
  const SQL = await getSQL()
  const db: Database = new SQL.Database()
  try {
    if (schema) db.run(schema)
    const results = db.exec(`EXPLAIN QUERY PLAN ${query}`)
    if (!results.length) return ''
    return results[0].values.map((r) => r[r.length - 1]).join('\n')
  } catch {
    return ''
  } finally {
    db.close()
  }
}

function compareResults(a: QueryResult, b: QueryResult): boolean {
  if (a.error || b.error) return false
  if (a.columns.length !== b.columns.length) return false
  if (a.rows.length !== b.rows.length) return false
  const colsA = a.columns.map((c) => c.toLowerCase()).sort()
  const colsB = b.columns.map((c) => c.toLowerCase()).sort()
  if (JSON.stringify(colsA) !== JSON.stringify(colsB)) return false
  return JSON.stringify(a.rows.map((r) => (r as unknown[]).map(String).join('|')).sort()) ===
         JSON.stringify(b.rows.map((r) => (r as unknown[]).map(String).join('|')).sort())
}

// ── Northwind schema cache ────────────────────────────────────────────────────

let _northwindSchema: string | null = null

function getNorthwindSchema(): string {
  if (_northwindSchema) return _northwindSchema
  const schemaPath = join(getContentDir(), 'sql', 'schemas', 'northwind-mini.sql')
  try {
    _northwindSchema = readFileSync(schemaPath, 'utf-8')
  } catch {
    _northwindSchema = ''
  }
  return _northwindSchema
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerSqlHandlers(): void {
  ipcMain.handle('sql:list', () => {
    return listExercises('sql')
  })

  ipcMain.handle('sql:get', (_event, id: string) => {
    const path = id.startsWith('sql/') ? id : `sql/exercises/${id}.yaml`
    return loadExercise(path)
  })

  ipcMain.handle('sql:exec', async (_event, id: string, userQuery: string): Promise<EvaluationResult> => {
    const path = id.startsWith('sql/') ? id : `sql/exercises/${id}.yaml`
    let ex
    try {
      ex = loadExercise(path)
    } catch {
      return { passed: false, userResult: { columns: [], rows: [], rowsAffected: 0, timeMs: 0, error: 'Exercise not found' }, score: 0, message: 'Exercise not found' }
    }

    const schema = getNorthwindSchema()
    const userResult = await runQuery(schema, userQuery)
    if (userResult.error) {
      return { passed: false, userResult, score: 0, message: `Query error: ${userResult.error}` }
    }

    const expectedResult = await runQuery(schema, ex.solution)
    const passed = compareResults(userResult, expectedResult)
    const queryPlan = await getQueryPlan(schema, userQuery)

    return {
      passed,
      userResult,
      score: passed ? 100 : 0,
      message: passed ? 'Correct! Your query produces the expected result.' : "Incorrect — your result doesn't match the expected output.",
      queryPlan,
    }
  })

  ipcMain.handle('sql:free', async (_event, schema: string, query: string): Promise<QueryResult> => {
    const baseSchema = schema || getNorthwindSchema()
    return runQuery(baseSchema, query)
  })
}
