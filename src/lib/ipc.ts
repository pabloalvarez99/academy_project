// IPC bridge — typed wrapper around window.api (Electron contextBridge)
// Replaces all imports from wailsjs/go/main/App and wailsjs/go/models

import type {
  ContentVersion,
  ValidationResult,
  Exercise,
  ExerciseSummary,
  CurriculumLevel,
  SubmitRequest,
  SubmitResult,
  QueryResult,
  EvaluationResult,
  KnowledgeCategory,
  KnowledgeArticle,
  User,
  CreateUserRequest,
  UserStats,
  Achievement,
  SearchResult,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bridge = (window as unknown as { api: Record<string, (...args: unknown[]) => Promise<unknown>> }).api

function call<T>(method: string, ...args: unknown[]): Promise<T> {
  return bridge[method](...args) as Promise<T>
}

// ── Content ──────────────────────────────────────────────────────────────────

export const GetContentVersion = (): Promise<ContentVersion> =>
  call('getContentVersion')

// ── Grammar ───────────────────────────────────────────────────────────────────

export const ValidateGrammar = (text: string): Promise<ValidationResult> =>
  call('validateGrammar', text)

export const ListGrammarExercises = (): Promise<string[]> =>
  call('listGrammarExercises')

export const GetGrammarExercise = (id: string): Promise<Exercise> =>
  call('getGrammarExercise', id)

export const GetGrammarCurriculum = (): Promise<CurriculumLevel[]> =>
  call('getGrammarCurriculum')

// ── Programming ───────────────────────────────────────────────────────────────

export const ListProgrammingExercises = (lang: string): Promise<string[]> =>
  call('listProgrammingExercises', lang)

export const ListProgrammingExerciseMeta = (lang: string): Promise<ExerciseSummary[]> =>
  call('listProgrammingExerciseMeta', lang)

export const GetProgrammingExercise = (lang: string, id: string): Promise<Exercise> =>
  call('getProgrammingExercise', lang, id)

export const SubmitCode = (req: SubmitRequest): Promise<SubmitResult> =>
  call('submitCode', req)

export const CheckRuntimes = (): Promise<Record<string, boolean>> =>
  call('checkRuntimes')

// ── SQL ───────────────────────────────────────────────────────────────────────

export const ExecuteSQLExercise = (id: string, query: string): Promise<EvaluationResult> =>
  call('executeSQLExercise', id, query)

export const RunFreeSQL = (schema: string, query: string): Promise<QueryResult> =>
  call('runFreeSQL', schema, query)

export const ListSQLExercises = (): Promise<string[]> =>
  call('listSQLExercises')

export const GetSQLExercise = (id: string): Promise<Exercise> =>
  call('getSQLExercise', id)

// ── Knowledge ────────────────────────────────────────────────────────────────

export const ListKnowledgeCategories = (): Promise<KnowledgeCategory[]> =>
  call('listKnowledgeCategories')

export const ListKnowledgeArticles = (category: string): Promise<string[]> =>
  call('listKnowledgeArticles', category)

export const GetArticle = (category: string, id: string): Promise<KnowledgeArticle> =>
  call('getArticle', category, id)

// ── User & Progress ───────────────────────────────────────────────────────────

export const ListUsers = (): Promise<User[]> =>
  call('listUsers')

export const CreateUser = (req: CreateUserRequest): Promise<User> =>
  call('createUser', req)

export const Login = (username: string, pin: string): Promise<User> =>
  call('login', username, pin)

export const Logout = (): Promise<void> =>
  call('logout')

export const GetUserStats = (): Promise<UserStats> =>
  call('getUserStats')

export const GetAchievements = (): Promise<Achievement[]> =>
  call('getAchievements')

export const ResetProgress = (): Promise<void> =>
  call('resetProgress')

export const RecordAttempt = (exerciseId: string, module: string, status: 'passed' | 'failed', score: number): Promise<void> =>
  call('recordAttempt', exerciseId, module, status, score)

// ── Search ────────────────────────────────────────────────────────────────────

export const SearchContent = (query: string): Promise<SearchResult[]> =>
  call('searchContent', query)
