import { useEffect, useState } from 'react'
import { CheckRuntimes, GetContentVersion, ResetProgress } from '../../lib/ipc'
import type { ContentVersion } from '../../lib/types'
import { useUserStore } from '../../stores/userStore'

const RUNTIME_LABELS: Record<string, string> = {
  go:         'Go',
  python:     'Python 3',
  node:       'Node.js (TypeScript)',
  rustc:      'Rust (rustc)',
  java:       'Java (javac)',
  gcc:        'C (gcc)',
  'g++':      'C++ (g++)',
}

export function SettingsModule() {
  const { currentUser } = useUserStore()
  const [runtimes, setRuntimes] = useState<Record<string, boolean>>({})
  const [version, setVersion] = useState<ContentVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetState, setResetState] = useState<'idle' | 'confirm' | 'done'>('idle')

  async function handleReset() {
    if (resetState === 'idle') { setResetState('confirm'); return }
    if (resetState === 'confirm') {
      await ResetProgress().catch(() => {})
      setResetState('done')
      setTimeout(() => setResetState('idle'), 3000)
    }
  }

  useEffect(() => {
    Promise.all([
      CheckRuntimes().catch(() => ({})),
      GetContentVersion().catch(() => null),
    ]).then(([r, v]) => {
      setRuntimes(r as Record<string, boolean>)
      setVersion(v)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-gray-500 text-sm">Loading...</div>

  const available = Object.values(runtimes).filter(Boolean).length
  const total = Object.keys(runtimes).length

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">System information and runtime status</p>
      </div>

      {/* User profile */}
      <section>
        <h2 className="section-header">Profile</h2>
        <div className="card space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{currentUser?.avatar || '👤'}</span>
            <div>
              <p className="text-gray-100 font-medium">{currentUser?.displayName}</p>
              <p className="text-gray-500 text-sm">@{currentUser?.username}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Runtime availability */}
      <section>
        <h2 className="section-header">
          Language Runtimes
          <span className="ml-2 text-xs font-normal normal-case text-gray-500">
            {available}/{total} available
          </span>
        </h2>
        <div className="card divide-y divide-surface-700">
          {Object.entries(RUNTIME_LABELS).map(([key, label]) => {
            const ok = runtimes[key] ?? false
            return (
              <div key={key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <span className="text-sm text-gray-200">{label}</span>
                  <span className="ml-2 text-xs text-gray-600 font-mono">{key}</span>
                </div>
                {ok ? (
                  <span className="badge-green text-xs">✓ Available</span>
                ) : (
                  <span className="text-xs text-gray-600 bg-surface-700 px-2 py-0.5 rounded">✗ Not found</span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Install missing runtimes and restart EKS to enable those languages.
        </p>
      </section>

      {/* Content library */}
      {version && (
        <section>
          <h2 className="section-header">Content Library</h2>
          <div className="card space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Application version</span>
              <span className="text-gray-300 font-mono">{version.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Content build</span>
              <span className="text-gray-300 font-mono">#{version.build}</span>
            </div>
            <div className="border-t border-surface-700 mt-2 pt-2 space-y-1.5">
              {version.modules && Object.entries(version.modules).map(([mod, info]: [string, any]) => (
                <div key={mod} className="flex justify-between text-xs">
                  <span className="text-gray-500 capitalize">{mod}</span>
                  <span className="text-gray-400">
                    {info.exercise_count != null
                      ? `${info.exercise_count} exercises · v${info.version}`
                      : `${info.article_count} articles · v${info.version}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section>
        <h2 className="section-header text-red-400">Danger Zone</h2>
        <div className="card border-red-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-200">Reset All Progress</p>
              <p className="text-xs text-gray-500 mt-0.5">Delete all attempts, streaks, and achievements for your profile</p>
            </div>
            <button
              onClick={handleReset}
              className={`btn text-xs shrink-0 ml-4 ${
                resetState === 'done'
                  ? 'bg-green-900/40 text-green-400 border border-green-800 cursor-default'
                  : resetState === 'confirm'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-surface-700 text-red-400 hover:bg-red-900/40 border border-red-900/50'
              }`}
            >
              {resetState === 'done' ? '✓ Reset' : resetState === 'confirm' ? '⚠ Confirm?' : 'Reset'}
            </button>
          </div>
          {resetState === 'confirm' && (
            <p className="text-xs text-red-400 border-t border-red-900/30 pt-2">
              Click "Confirm?" again to permanently delete all your progress. This cannot be undone.
            </p>
          )}
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="section-header">About</h2>
        <div className="card space-y-2 text-xs text-gray-500">
          <p><span className="text-gray-400 font-medium">EKS</span> — Engineering Knowledge System</p>
          <p>Offline desktop application for professional technical learning.</p>
          <p>Built with Electron · React · Monaco Editor · SQLite</p>
          <p className="text-gray-600 pt-1">All data is stored locally. No internet connection required.</p>
        </div>
      </section>
    </div>
  )
}
