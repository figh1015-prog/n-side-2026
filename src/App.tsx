import React, { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { ToastContainer } from './components/ui/Toast'
import { useToast } from './hooks/useToast'
import { storage } from './lib/storage'
import { getLocalUser, authStorage } from './lib/auth'
import type { AuthUser } from './lib/auth'

// Pages
import DashboardPage from './pages/Dashboard'
import GeneratePage from './pages/Generate'
import BatchPage from './pages/Batch'
import KeywordsPage from './pages/Keywords'
import SchedulePage from './pages/Schedule'
import MonitorPage from './pages/Monitor'
import IndexingPage from './pages/Indexing'
import HistoryPage from './pages/History'
import SettingsPage from './pages/Settings'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import AdminUsersPage from './pages/AdminUsers'

// ─── Toast context ────────────────────────────────────────────────────────────

interface ToastContextType {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
  info: (msg: string) => void
}

export const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
})

export const useToastContext = () => useContext(ToastContext)

// ─── Auth context ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

// ─── Protected Route ──────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

// ─── Public-only route (already logged in → redirect to dashboard) ────────────

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => storage.getTheme())
  const [user, setUser] = useState<AuthUser | null>(() => getLocalUser())
  const { toasts, removeToast, success, error, warning, info } = useToast()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
    if (theme === 'light') {
      document.body.style.background = '#f1f5f9'
      document.body.style.color = '#0f172a'
    } else {
      document.body.style.background = '#0f0f0f'
      document.body.style.color = '#e2e8f0'
    }
    storage.setTheme(theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  const handleLogout = () => {
    authStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      <AuthContext.Provider value={{ user, setUser, logout: handleLogout }}>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><RegisterPage /></PublicRoute>
          } />

          {/* ── Protected routes (with Sidebar layout) ── */}
          <Route path="/*" element={
            <RequireAuth>
              <div className="flex min-h-screen" style={{ background: theme === 'dark' ? '#0f0f0f' : '#f1f5f9' }}>
                <Sidebar theme={theme} onToggleTheme={toggleTheme} user={user} onLogout={handleLogout} />
                <main className="flex-1 min-w-0 overflow-auto">
                  <div className="pb-16 md:pb-0">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/generate" element={<GeneratePage />} />
                      <Route path="/batch" element={<BatchPage />} />
                      <Route path="/keywords" element={<KeywordsPage />} />
                      <Route path="/schedule" element={<SchedulePage />} />
                      <Route path="/monitor" element={<MonitorPage />} />
                      <Route path="/indexing" element={<IndexingPage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/admin/users" element={
                        <RequireAdmin><AdminUsersPage /></RequireAdmin>
                      } />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </RequireAuth>
          } />
        </Routes>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </AuthContext.Provider>
    </ToastContext.Provider>
  )
}
