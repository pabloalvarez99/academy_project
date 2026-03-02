import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './stores/userStore'
import { Sidebar } from './components/Sidebar'
import { LoginPage } from './modules/auth/LoginPage'
import { Dashboard } from './modules/dashboard/Dashboard'
import { GrammarModule } from './modules/grammar/GrammarModule'
import { ProgrammingModule } from './modules/programming/ProgrammingModule'
import { SQLModule } from './modules/sql/SQLModule'
import { KnowledgeModule } from './modules/knowledge/KnowledgeModule'
import { SearchModule } from './modules/search/SearchModule'
import { SettingsModule } from './modules/settings/SettingsModule'

function AppShell() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-900">
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/grammar"     element={<GrammarModule />} />
          <Route path="/programming" element={<ProgrammingModule />} />
          <Route path="/sql"         element={<SQLModule />} />
          <Route path="/knowledge"   element={<KnowledgeModule />} />
          <Route path="/search"      element={<SearchModule />} />
          <Route path="/settings"    element={<SettingsModule />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { currentUser } = useUserStore()

  return (
    <div className="dark h-full">
      <HashRouter>
        {currentUser ? <AppShell /> : <LoginPage />}
      </HashRouter>
    </div>
  )
}
