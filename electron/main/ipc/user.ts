import { ipcMain, app } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string
  username: string
  displayName: string
  pinHash: string
  avatar: string
  createdAt: number
  lastActive: number
  settings: string
}

interface Attempt {
  id: string
  userId: string
  exerciseId: string
  module: string
  language?: string
  startedAt: number
  completedAt?: number
  status: 'passed' | 'failed' | 'skipped'
  score?: number
}

interface EarnedAchievement {
  userId: string
  achievementId: string
  earnedAt: number
}

interface AppData {
  users: User[]
  attempts: Attempt[]
  earnedAchievements: EarnedAchievement[]
}

interface CreateUserRequest {
  username: string
  displayName: string
  pin: string
  avatar: string
}

interface UserStats {
  totalAttempts: number
  totalPassed: number
  passRate: number
  moduleProgress: ModuleProgress[]
  achievements: Achievement[]
}

interface ModuleProgress {
  module: string
  category: string
  total: number
  completed: number
  passed: number
  percent: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt?: number
  earned: boolean
}

// Static achievement definitions
const ACHIEVEMENT_DEFS: Omit<Achievement, 'earned' | 'earnedAt'>[] = [
  { id: 'first_exercise', title: 'First Steps', description: 'Complete your first exercise', icon: '🎯' },
  { id: 'grammar_master', title: 'Grammar Master', description: 'Pass 10 grammar exercises', icon: '✍️' },
  { id: 'code_warrior', title: 'Code Warrior', description: 'Submit 10 programming solutions', icon: '⚔️' },
  { id: 'sql_ninja', title: 'SQL Ninja', description: 'Solve 5 SQL exercises correctly', icon: '🥷' },
  { id: 'perfect_score', title: 'Perfect Score', description: 'Get 100% on any exercise', icon: '⭐' },
]

// ── JSON storage ──────────────────────────────────────────────────────────────

function getDataDir(): string {
  const dir = is.dev
    ? join(process.cwd(), '.eks-dev-data')
    : app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return dir
}

function getDataPath(): string {
  return join(getDataDir(), 'app-data.json')
}

function loadData(): AppData {
  const path = getDataPath()
  if (!existsSync(path)) return { users: [], attempts: [], earnedAchievements: [] }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as AppData
  } catch {
    return { users: [], attempts: [], earnedAchievements: [] }
  }
}

function saveData(data: AppData): void {
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

// ── Session state ─────────────────────────────────────────────────────────────

let currentUserId: string | null = null

// ── IPC handlers ─────────────────────────────────────────────────────────────

export function registerUserHandlers(): void {
  ipcMain.handle('user:list', () => {
    const data = loadData()
    return data.users
      .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
      .map(({ pinHash: _ph, ...u }) => u)
  })

  ipcMain.handle('user:create', (_event, req: CreateUserRequest) => {
    const data = loadData()
    if (data.users.find((u) => u.username === req.username)) {
      throw new Error('Username already taken')
    }
    const user: User = {
      id: uuidv4(),
      username: req.username,
      displayName: req.displayName,
      pinHash: req.pin ? bcrypt.hashSync(req.pin, 10) : '',
      avatar: req.avatar || 'default',
      createdAt: Date.now(),
      lastActive: Date.now(),
      settings: '{}',
    }
    data.users.push(user)
    saveData(data)
    const { pinHash: _ph, ...userOut } = user
    return userOut
  })

  ipcMain.handle('user:login', (_event, username: string, pin: string) => {
    const data = loadData()
    const user = data.users.find((u) => u.username === username)
    if (!user) throw new Error('User not found')
    if (user.pinHash && !bcrypt.compareSync(pin, user.pinHash)) throw new Error('Invalid PIN')

    user.lastActive = Date.now()
    saveData(data)
    currentUserId = user.id

    const { pinHash: _ph, ...userOut } = user
    return userOut
  })

  ipcMain.handle('user:logout', () => {
    currentUserId = null
  })

  ipcMain.handle('user:stats', (): UserStats => {
    if (!currentUserId) return { totalAttempts: 0, totalPassed: 0, passRate: 0, moduleProgress: [], achievements: [] }
    const data = loadData()
    const myAttempts = data.attempts.filter((a) => a.userId === currentUserId)
    const total = myAttempts.length
    const passed = myAttempts.filter((a) => a.status === 'passed').length

    // Group progress by module
    const moduleMap = new Map<string, { total: number; completed: number; passed: number }>()
    for (const a of myAttempts) {
      const key = a.module
      const entry = moduleMap.get(key) || { total: 0, completed: 0, passed: 0 }
      entry.total++
      if (a.status !== 'skipped') entry.completed++
      if (a.status === 'passed') entry.passed++
      moduleMap.set(key, entry)
    }

    const moduleProgress: ModuleProgress[] = Array.from(moduleMap.entries()).map(([module, s]) => ({
      module,
      category: module,
      ...s,
      percent: s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0,
    }))

    const myAchievements = data.earnedAchievements.filter((a) => a.userId === currentUserId)
    const earnedMap = new Map(myAchievements.map((a) => [a.achievementId, a.earnedAt]))

    const achievements: Achievement[] = ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      earned: earnedMap.has(def.id),
      earnedAt: earnedMap.get(def.id),
    }))

    return {
      totalAttempts: total,
      totalPassed: passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      moduleProgress,
      achievements,
    }
  })

  ipcMain.handle('user:achievements', (): Achievement[] => {
    if (!currentUserId) return ACHIEVEMENT_DEFS.map((d) => ({ ...d, earned: false }))
    const data = loadData()
    const myAchievements = data.earnedAchievements.filter((a) => a.userId === currentUserId)
    const earnedMap = new Map(myAchievements.map((a) => [a.achievementId, a.earnedAt]))
    return ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      earned: earnedMap.has(def.id),
      earnedAt: earnedMap.get(def.id),
    }))
  })

  ipcMain.handle('user:attempt', (_event, exerciseId: string, module: string, status: 'passed' | 'failed', score: number) => {
    if (!currentUserId) return
    const data = loadData()
    data.attempts.push({
      id: uuidv4(),
      userId: currentUserId,
      exerciseId,
      module,
      startedAt: Date.now(),
      completedAt: Date.now(),
      status,
      score,
    })
    // Check and award achievements
    const myAttempts = data.attempts.filter(a => a.userId === currentUserId)
    const passed = myAttempts.filter(a => a.status === 'passed')
    const grammarPassed = passed.filter(a => a.module === 'grammar').length
    const codePassed = passed.filter(a => a.module === 'programming').length
    const sqlPassed = passed.filter(a => a.module === 'sql').length
    const earned = new Set(data.earnedAchievements.filter(a => a.userId === currentUserId).map(a => a.achievementId))
    const award = (id: string) => {
      if (!earned.has(id)) {
        data.earnedAchievements.push({ userId: currentUserId!, achievementId: id, earnedAt: Date.now() })
        earned.add(id)
      }
    }
    if (passed.length >= 1) award('first_exercise')
    if (grammarPassed >= 10) award('grammar_master')
    if (codePassed >= 10) award('code_warrior')
    if (sqlPassed >= 5) award('sql_ninja')
    if (score === 100) award('perfect_score')
    saveData(data)
  })

  ipcMain.handle('user:reset', () => {
    if (!currentUserId) return
    const data = loadData()
    data.attempts = data.attempts.filter((a) => a.userId !== currentUserId)
    data.earnedAchievements = data.earnedAchievements.filter((a) => a.userId !== currentUserId)
    saveData(data)
  })
}
