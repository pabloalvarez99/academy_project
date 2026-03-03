import { useEffect, useState } from 'react'
import { GetUserStats, GetContentVersion } from '../../lib/ipc'
import type { UserStats, ContentVersion } from '../../lib/types'
import { useUserStore } from '../../stores/userStore'

function getLocalProgress(key: string, total: number): { done: number; total: number } {
  try {
    const p = JSON.parse(localStorage.getItem(key) || '{"passed":{}}')
    const done = Object.values(p.passed as Record<string, boolean>).filter(Boolean).length
    return { done, total }
  } catch { return { done: 0, total } }
}

export function Dashboard() {
  const { currentUser } = useUserStore()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [version, setVersion] = useState<ContentVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const grammarProgress = getLocalProgress('grammar-progress-v1', 39)
  const sqlProgress = getLocalProgress('sql-progress-v1', 26)
  const sysDesignKnown = (() => {
    try { return JSON.parse(localStorage.getItem('system-design-known-v1') || '[]').length } catch { return 0 }
  })()

  useEffect(() => {
    Promise.all([
      GetUserStats().catch(() => null),
      GetContentVersion().catch(() => null),
    ]).then(([s, v]) => {
      setStats(s)
      setVersion(v)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-gray-500 text-sm">Loading...</div>

  const earnedAchievements = stats?.achievements?.filter(a => a.earned) ?? []
  const allAchievements = stats?.achievements ?? []

  return (
    <div className="p-6 max-w-4xl">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">
          Welcome back, {currentUser?.displayName?.split(' ')[0] ?? 'engineer'} {currentUser?.avatar}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Engineering Knowledge System</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Attempts" value={stats?.totalAttempts ?? 0} icon="🎯" />
        <StatCard label="Passed" value={stats?.totalPassed ?? 0} icon="✅" />
        <StatCard label="Pass Rate" value={`${stats?.passRate ?? 0}%`} icon="📈" />
        <StatCard label="Achievements" value={`${earnedAchievements.length}/${allAchievements.length}`} icon="🏆" />
      </div>

      {/* Skill tree progress bars */}
      {(grammarProgress.done > 0 || sqlProgress.done > 0 || sysDesignKnown > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {grammarProgress.done > 0 && (
            <ProgressCard icon="✍️" label="Grammar" progress={grammarProgress} />
          )}
          {sqlProgress.done > 0 && (
            <ProgressCard icon="⛃" label="SQL" progress={sqlProgress} />
          )}
          {sysDesignKnown > 0 && (
            <ProgressCard icon="⬡" label="System Design" progress={{ done: sysDesignKnown, total: 30 }} />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Module progress */}
          {stats?.moduleProgress && stats.moduleProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Progress</h2>
              <div className="space-y-2">
                {stats.moduleProgress.map((mp, i) => (
                  <div key={i} className="card py-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-gray-300 capitalize font-medium">
                        {mp.module} · {mp.category}
                      </span>
                      <span className="text-xs text-gray-600">{mp.passed}/{mp.total}</span>
                    </div>
                    <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          mp.percent >= 80 ? 'bg-green-500' : mp.percent >= 40 ? 'bg-accent' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.round(mp.percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Content version */}
          {version && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Content Library</h2>
              <div className="card space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Version</span>
                  <span className="text-gray-300">{version.version} (build {version.build})</span>
                </div>
                {version.modules && Object.entries(version.modules).map(([mod, info]: [string, any]) => (
                  <div key={mod} className="flex justify-between text-xs">
                    <span className="text-gray-500 capitalize">{mod}</span>
                    <span className="text-gray-400">
                      {info.exercise_count != null
                        ? `${info.exercise_count} exercises`
                        : `${info.article_count} articles`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column — achievements */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Achievements {earnedAchievements.length > 0 && <span className="text-accent normal-case font-normal">({earnedAchievements.length} earned)</span>}
          </h2>
          {allAchievements.length === 0 ? (
            <div className="card text-center py-8 text-gray-600">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-xs">Complete exercises to earn achievements</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allAchievements.map((a) => (
                <div
                  key={a.id}
                  className={`card flex items-center gap-3 py-2.5 transition-opacity ${a.earned ? 'opacity-100' : 'opacity-35'}`}
                >
                  <span className="text-2xl shrink-0">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-200">{a.title}</p>
                    <p className="text-xs text-gray-600 truncate">{a.description}</p>
                  </div>
                  {a.earned && <span className="badge-green shrink-0">✓</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {(!stats || stats.totalAttempts === 0) && (
        <div className="mt-8 text-center py-10 text-gray-600 border border-dashed border-surface-600 rounded-lg">
          <p className="text-4xl mb-3">🚀</p>
          <p className="text-sm">Head to Programming, SQL, or Grammar to start your first exercise!</p>
        </div>
      )}
    </div>
  )
}

function ProgressCard({ icon, label, progress }: { icon: string; label: string; progress: { done: number; total: number } }) {
  const pct = Math.round((progress.done / progress.total) * 100)
  return (
    <div className="card flex items-center gap-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-300 truncate">{label}</span>
          <span className="text-xs text-gray-500 shrink-0 ml-1">{progress.done}/{progress.total}</span>
        </div>
        <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-xs text-accent font-medium shrink-0">{pct}%</span>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="card text-center py-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
