import { NavLink } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { Logout } from '../../wailsjs/go/main/App'

const nav = [
  { to: '/',           label: 'Dashboard',   icon: '⌂' },
  { to: '/grammar',    label: 'Grammar',      icon: '✎' },
  { to: '/programming',label: 'Programming',  icon: '⌨' },
  { to: '/sql',        label: 'SQL Lab',      icon: '⛃' },
  { to: '/knowledge',  label: 'Knowledge',    icon: '📖' },
  { to: '/search',     label: 'Search',       icon: '⌕' },
]

export function Sidebar() {
  const { currentUser, setUser } = useUserStore()

  async function handleLogout() {
    await Logout()
    setUser(null)
  }

  return (
    <aside className="flex flex-col w-52 min-w-[13rem] bg-surface-800 border-r border-surface-600 h-full">
      <div className="px-4 py-5 border-b border-surface-600">
        <span className="text-accent font-bold text-lg tracking-widest">EKS</span>
        <p className="text-gray-500 text-xs mt-0.5">Engineering Knowledge</p>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent border-r-2 border-accent'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-surface-700'
              }`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-surface-600 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{currentUser?.avatar || '👤'}</span>
          <div className="min-w-0">
            <p className="text-sm text-gray-200 truncate">{currentUser?.displayName}</p>
            <p className="text-xs text-gray-500 truncate">@{currentUser?.username}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn-ghost text-xs py-1.5">
          Logout
        </button>
      </div>
    </aside>
  )
}
