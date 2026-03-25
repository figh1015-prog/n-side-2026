import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, PenTool, Package, Search,
  Calendar, BarChart2, Link2, History, Settings,
  ChevronLeft, ChevronRight, Moon, Sun, ExternalLink
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  badge?: string
}

const navItems: NavItem[] = [
  { label: '대시보드', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard' },
  { label: '글 생성', icon: <PenTool className="w-5 h-5" />, path: '/generate' },
  { label: '배치 생성', icon: <Package className="w-5 h-5" />, path: '/batch' },
  { label: '키워드 분석', icon: <Search className="w-5 h-5" />, path: '/keywords' },
  { label: '발행 스케줄', icon: <Calendar className="w-5 h-5" />, path: '/schedule' },
  { label: 'SEO 모니터', icon: <BarChart2 className="w-5 h-5" />, path: '/monitor' },
  { label: '인덱싱 도구', icon: <Link2 className="w-5 h-5" />, path: '/indexing' },
  { label: '생성 히스토리', icon: <History className="w-5 h-5" />, path: '/history' },
  { label: '설정', icon: <Settings className="w-5 h-5" />, path: '/settings' },
]

const mobileNavItems = [
  { label: '대시보드', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard' },
  { label: '글 생성', icon: <PenTool className="w-5 h-5" />, path: '/generate' },
  { label: '배치', icon: <Package className="w-5 h-5" />, path: '/batch' },
  { label: '키워드', icon: <Search className="w-5 h-5" />, path: '/keywords' },
  { label: '설정', icon: <Settings className="w-5 h-5" />, path: '/settings' },
]

interface SidebarProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 z-30"
        style={{
          width: collapsed ? '72px' : '260px',
          background: '#1a1a2e',
          borderRight: '1px solid #2d2d4a',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-dark-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-sm leading-tight">N-Side Pro</div>
                <div className="text-xs text-slate-500">SEO 자동화 플랫폼</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
            style={{ marginLeft: collapsed ? 'auto' : '0', display: collapsed ? 'none' : 'flex' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center py-3 text-slate-500 hover:text-slate-300 border-b border-dark-border"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`sidebar-nav-item w-full ${isActive(item.path) ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto badge-cyan text-xs px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-dark-border space-y-2">
          <button
            onClick={onToggleTheme}
            className={`sidebar-nav-item w-full ${collapsed ? 'justify-center' : ''}`}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 shrink-0" />
              : <Moon className="w-4 h-4 shrink-0" />
            }
            {!collapsed && (
              <span className="text-xs">{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
            )}
          </button>

          {!collapsed && (
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-slate-600">v2.0</span>
              <a
                href="https://n-side.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-400 transition-colors"
              >
                N-Side <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: '#1a1a2e', borderTop: '1px solid #2d2d4a' }}>
        {mobileNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all duration-200
              ${isActive(item.path) ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
