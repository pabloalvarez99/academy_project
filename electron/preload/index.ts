import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Typed API surface — mirrors all 28 Go methods from app.go
const api = {
  // ── Content ─────────────────────────────────────────────────────────────────
  getContentVersion: (): Promise<unknown> =>
    ipcRenderer.invoke('content:version'),

  // ── Grammar ──────────────────────────────────────────────────────────────────
  validateGrammar: (text: string): Promise<unknown> =>
    ipcRenderer.invoke('grammar:validate', text),
  listGrammarExercises: (): Promise<string[]> =>
    ipcRenderer.invoke('grammar:list'),
  getGrammarExercise: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('grammar:get', id),
  getGrammarCurriculum: (): Promise<unknown> =>
    ipcRenderer.invoke('grammar:curriculum'),

  // ── Programming ──────────────────────────────────────────────────────────────
  listProgrammingExercises: (lang: string): Promise<string[]> =>
    ipcRenderer.invoke('prog:list', lang),
  listProgrammingExerciseMeta: (lang: string): Promise<unknown[]> =>
    ipcRenderer.invoke('prog:meta', lang),
  getProgrammingExercise: (lang: string, id: string): Promise<unknown> =>
    ipcRenderer.invoke('prog:get', lang, id),
  submitCode: (req: unknown): Promise<unknown> =>
    ipcRenderer.invoke('prog:submit', req),
  checkRuntimes: (): Promise<Record<string, boolean>> =>
    ipcRenderer.invoke('prog:runtimes'),

  // ── SQL Lab ───────────────────────────────────────────────────────────────────
  executeSQLExercise: (id: string, query: string): Promise<unknown> =>
    ipcRenderer.invoke('sql:exec', id, query),
  runFreeSQL: (schema: string, query: string): Promise<unknown> =>
    ipcRenderer.invoke('sql:free', schema, query),
  listSQLExercises: (): Promise<string[]> =>
    ipcRenderer.invoke('sql:list'),
  getSQLExercise: (id: string): Promise<unknown> =>
    ipcRenderer.invoke('sql:get', id),

  // ── Knowledge ─────────────────────────────────────────────────────────────────
  listKnowledgeCategories: (): Promise<unknown[]> =>
    ipcRenderer.invoke('knowledge:categories'),
  listKnowledgeArticles: (category: string): Promise<string[]> =>
    ipcRenderer.invoke('knowledge:articles', category),
  getArticle: (category: string, id: string): Promise<unknown> =>
    ipcRenderer.invoke('knowledge:article', category, id),

  // ── User & Progress ───────────────────────────────────────────────────────────
  listUsers: (): Promise<unknown[]> =>
    ipcRenderer.invoke('user:list'),
  createUser: (req: unknown): Promise<unknown> =>
    ipcRenderer.invoke('user:create', req),
  login: (username: string, pin: string): Promise<unknown> =>
    ipcRenderer.invoke('user:login', username, pin),
  logout: (): Promise<void> =>
    ipcRenderer.invoke('user:logout'),
  getUserStats: (): Promise<unknown> =>
    ipcRenderer.invoke('user:stats'),
  getAchievements: (): Promise<unknown[]> =>
    ipcRenderer.invoke('user:achievements'),
  resetProgress: (): Promise<void> =>
    ipcRenderer.invoke('user:reset'),
  recordAttempt: (exerciseId: string, module: string, status: 'passed' | 'failed', score: number): Promise<void> =>
    ipcRenderer.invoke('user:attempt', exerciseId, module, status, score),

  // ── Search ────────────────────────────────────────────────────────────────────
  searchContent: (query: string): Promise<unknown[]> =>
    ipcRenderer.invoke('search:query', query),
}

// Expose to renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in global for non-isolated renderers)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
