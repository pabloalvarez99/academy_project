import { useEffect, useState } from 'react'
import { GetUserStats } from '../../../wailsjs/go/main/App'
import { progress } from '../../../wailsjs/go/models'

export function Dashboard() {
  const [stats, setStats] = useState<progress.UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    GetUserStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading stats...</div>

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Attempts" value={stats?.totalAttempts ?? 0} icon="🎯" />
        <StatCard label="Passed" value={stats?.totalPassed ?? 0} icon="✅" />
        <StatCard label="Pass Rate" value={`${Math.round((stats?.passRate ?? 0) * 100)}%`} icon="📊" />
      </div>

      {/* Module progress */}
      {stats && stats.moduleProgress && stats.moduleProgress.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Module Progress</h2>
          <div className="space-y-2">
            {stats.moduleProgress.map((mp, i) => (
              <div key={i} className="card py-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-gray-300 capitalize">
                    {mp.module} / {mp.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {mp.passed}/{mp.total} passed
                  </span>
                </div>
                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.round(mp.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {stats && stats.achievements && stats.achievements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Achievements</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.achievements.map((a) => (
              <div
                key={a.id}
                className={`card flex items-center gap-3 transition-opacity ${
                  a.earned ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-200">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.description}</p>
                  {a.earned && (
                    <span className="badge-green mt-1">Earned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(!stats || (stats.totalAttempts === 0)) && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-5xl mb-4">🚀</p>
          <p className="text-lg">Start an exercise to track your progress!</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="card text-center py-5">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
