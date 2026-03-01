import { useEffect, useState } from 'react'
import { ListUsers, Login, CreateUser } from '../../../wailsjs/go/main/App'
import { useUserStore } from '../../stores/userStore'
import { user } from '../../../wailsjs/go/models'

const AVATARS = ['🧑‍💻', '👩‍💻', '🤓', '🦊', '🐧', '🦁', '🐉', '🦄']

export function LoginPage() {
  const { setUser } = useUserStore()
  const [users, setUsers] = useState<user.User[]>([])
  const [selected, setSelected] = useState<user.User | null>(null)
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', displayName: '', pin: '', avatar: AVATARS[0] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ListUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  async function handleLogin() {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const u = await Login(selected.username, pin)
      setUser(u)
    } catch (e: any) {
      setError(e?.toString() || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newUser.username || !newUser.displayName || newUser.pin.length < 4) {
      setError('Username, display name, and 4+ digit PIN are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const u = await CreateUser(newUser)
      setUser(u)
    } catch (e: any) {
      setError(e?.toString() || 'Create failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-surface-900">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">EKS</h1>
          <p className="text-gray-500 text-sm mt-1">Engineering Knowledge System</p>
        </div>

        {!creating ? (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              {users.length > 0 ? 'Select Profile' : 'No profiles yet'}
            </h2>

            {users.length > 0 && (
              <div className="space-y-2 mb-4">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelected(u); setPin(''); setError('') }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                      selected?.id === u.id
                        ? 'border-accent bg-accent/10 text-gray-100'
                        : 'border-surface-600 hover:border-surface-500 text-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{u.avatar || '👤'}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium">{u.displayName}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter PIN"
                  className="w-full bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>
            )}

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              {selected && (
                <button onClick={handleLogin} disabled={loading} className="flex-1 btn-primary">
                  {loading ? '...' : 'Login'}
                </button>
              )}
              <button onClick={() => { setCreating(true); setError('') }} className="flex-1 btn-ghost border border-surface-600">
                New Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Create Profile</h2>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Avatar</label>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setNewUser({ ...newUser, avatar: a })}
                    className={`text-2xl p-1.5 rounded border transition-colors ${
                      newUser.avatar === a ? 'border-accent bg-accent/10' : 'border-surface-600 hover:border-surface-500'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'Username', key: 'username', type: 'text', placeholder: 'e.g. pablo' },
              { label: 'Display Name', key: 'displayName', type: 'text', placeholder: 'e.g. Pablo García' },
              { label: 'PIN (4+ digits)', key: 'pin', type: 'password', placeholder: '••••' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  value={(newUser as any)[key]}
                  onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-accent"
                />
              </div>
            ))}

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={loading} className="flex-1 btn-primary">
                {loading ? '...' : 'Create & Login'}
              </button>
              <button onClick={() => { setCreating(false); setError('') }} className="flex-1 btn-ghost border border-surface-600">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
