import React, { useState, useEffect, useCallback } from 'react'
import {
  Users, CheckCircle, XCircle, Clock, Trash2,
  RefreshCw, Shield, ShieldOff, Loader2, User,
  Mail, Calendar, MessageSquare, Crown
} from 'lucide-react'
import { useToastContext } from '../App'
import { authFetch, getLocalUser } from '../lib/auth'

interface UserRow {
  id: string
  email: string
  name: string
  role: 'pending' | 'approved' | 'admin' | 'rejected'
  request_message: string | null
  created_at: string
  approved_at: string | null
  last_login: string | null
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  pending:  { label: '승인 대기', className: 'badge-yellow' },
  approved: { label: '승인됨',   className: 'badge-green' },
  admin:    { label: '관리자',   className: 'badge-blue' },
  rejected: { label: '거절됨',   className: 'badge-red' },
}

export default function AdminUsersPage() {
  const toast = useToastContext()
  const currentUser = getLocalUser()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'admin' | 'rejected'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/admin/users')
      if (!res.ok) { toast.error('회원 목록 로드 실패'); return }
      const data = await res.json() as { users: UserRow[] }
      setUsers(data.users)
    } catch {
      toast.error('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleApprove = async (userId: string, action: 'approve' | 'reject') => {
    setProcessing(userId)
    try {
      const res = await authFetch('/api/auth/admin/approve', {
        method: 'POST',
        body: JSON.stringify({ userId, action }),
      })
      if (!res.ok) { toast.error('처리 실패'); return }
      toast.success(action === 'approve' ? '승인되었습니다.' : '거절되었습니다.')
      await fetchUsers()
    } catch {
      toast.error('오류 발생')
    } finally {
      setProcessing(null)
    }
  }

  const handleChangeRole = async (userId: string, role: string) => {
    setProcessing(userId)
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      if (!res.ok) { toast.error('역할 변경 실패'); return }
      toast.success('역할이 변경되었습니다.')
      await fetchUsers()
    } catch {
      toast.error('오류 발생')
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`"${name}" 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    setProcessing(userId)
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('삭제 실패'); return }
      toast.success('계정이 삭제되었습니다.')
      await fetchUsers()
    } catch {
      toast.error('오류 발생')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter)
  const pendingCount = users.filter(u => u.role === 'pending').length

  const formatDate = (dt: string | null) =>
    dt ? new Date(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            회원 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">가입 신청 승인 및 회원 권한 관리</p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary flex items-center gap-2 text-sm py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '전체', count: users.length, color: '#818cf8', filter: 'all' as const },
          { label: '승인 대기', count: users.filter(u => u.role === 'pending').length, color: '#fbbf24', filter: 'pending' as const },
          { label: '승인됨', count: users.filter(u => u.role === 'approved').length, color: '#34d399', filter: 'approved' as const },
          { label: '관리자', count: users.filter(u => u.role === 'admin').length, color: '#60a5fa', filter: 'admin' as const },
        ].map(item => (
          <button
            key={item.filter}
            onClick={() => setFilter(item.filter)}
            className="card-hover p-4 text-left transition-all"
            style={{ borderColor: filter === item.filter ? item.color + '60' : undefined }}
          >
            <div className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</div>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <span className="text-amber-300 font-medium">
              {pendingCount}명의 신규 가입 신청이 대기 중입니다.
            </span>
            <span className="text-amber-500 text-xs ml-2">검토 후 승인 또는 거절해 주세요.</span>
          </div>
          <button onClick={() => setFilter('pending')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium shrink-0">
            보기 →
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>회원이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b" style={{ borderColor: '#2d2d4a' }}>
                  <th className="text-left px-5 py-3">회원 정보</th>
                  <th className="text-left px-3 py-3 hidden sm:table-cell">가입일</th>
                  <th className="text-left px-3 py-3">상태</th>
                  <th className="text-left px-3 py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <React.Fragment key={user.id}>
                    <tr
                      className="border-b hover:bg-white/3 transition-colors cursor-pointer"
                      style={{ borderColor: '#2d2d4a' }}
                      onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                    >
                      {/* 회원 정보 */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                            style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', color: 'white' }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-200 truncate">{user.name}</span>
                              {user.id === currentUser?.userId && (
                                <span className="text-xs text-indigo-400">(나)</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* 가입일 */}
                      <td className="px-3 py-3 text-xs text-slate-500 hidden sm:table-cell whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>

                      {/* 상태 */}
                      <td className="px-3 py-3">
                        <span className={ROLE_BADGE[user.role]?.className || 'badge-gray'}>
                          {ROLE_BADGE[user.role]?.label || user.role}
                        </span>
                      </td>

                      {/* 액션 */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        {processing === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* 승인 대기 → 승인/거절 버튼 */}
                            {user.role === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(user.id, 'approve')}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> 승인
                                </button>
                                <button
                                  onClick={() => handleApprove(user.id, 'reject')}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> 거절
                                </button>
                              </>
                            )}

                            {/* 승인됨 → 관리자 승격 / 거절로 변경 */}
                            {user.role === 'approved' && user.id !== currentUser?.userId && (
                              <>
                                <button
                                  onClick={() => handleChangeRole(user.id, 'admin')}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                                  title="관리자로 승격"
                                >
                                  <Shield className="w-3.5 h-3.5" /> 관리자
                                </button>
                                <button
                                  onClick={() => handleChangeRole(user.id, 'rejected')}
                                  className="text-xs px-2.5 py-1.5 rounded-lg btn-secondary"
                                  title="접근 차단"
                                >
                                  <ShieldOff className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* 관리자 → 일반으로 강등 */}
                            {user.role === 'admin' && user.id !== currentUser?.userId && (
                              <button
                                onClick={() => handleChangeRole(user.id, 'approved')}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
                                title="일반 회원으로 강등"
                              >
                                <ShieldOff className="w-3.5 h-3.5" /> 강등
                              </button>
                            )}

                            {/* 거절됨 → 재승인 */}
                            {user.role === 'rejected' && (
                              <button
                                onClick={() => handleChangeRole(user.id, 'approved')}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> 재승인
                              </button>
                            )}

                            {/* 삭제 (자기 자신 제외) */}
                            {user.id !== currentUser?.userId && (
                              <button
                                onClick={() => handleDelete(user.id, user.name)}
                                className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                                title="계정 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* 확장 행: 상세 정보 */}
                    {expandedId === user.id && (
                      <tr style={{ borderBottom: '1px solid #2d2d4a' }}>
                        <td colSpan={4} className="px-5 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-2">
                              <Mail className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">이메일</div>
                                <div className="text-slate-300">{user.email}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">마지막 로그인</div>
                                <div className="text-slate-400">{formatDate(user.last_login)}</div>
                              </div>
                            </div>
                            {user.request_message && (
                              <div className="flex items-start gap-2 sm:col-span-1">
                                <MessageSquare className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-xs text-slate-500 mb-0.5">신청 메시지</div>
                                  <div className="text-slate-300 text-xs leading-relaxed italic">
                                    "{user.request_message}"
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
