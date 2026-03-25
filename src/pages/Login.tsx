import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { login } from '../lib/auth'
import { useToastContext } from '../App'

export default function LoginPage() {
  const navigate = useNavigate()
  const toast = useToastContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; status?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await login(email, password)
    setLoading(false)

    if (result.success && result.user) {
      toast.success(`환영합니다, ${result.user.name}님!`)
      navigate('/dashboard', { replace: true })
      // 페이지 새로고침으로 인증 상태 확실히 반영
      window.location.href = '/dashboard'
    } else {
      setError({ message: result.error || '로그인 실패', status: result.status })
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0f0f0f' }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #4F46E5, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">N-Side Pro</h1>
          <p className="text-slate-500 text-sm mt-1">한국어 블로그 SEO 자동화 플랫폼</p>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">로그인</h2>
            <p className="text-slate-500 text-sm mt-1">계정에 로그인하세요</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{
                background: error.status === 'pending'
                  ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                border: error.status === 'pending'
                  ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(239,68,68,0.3)',
              }}>
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${error.status === 'pending' ? 'text-amber-400' : 'text-red-400'}`} />
              <div>
                <p className={error.status === 'pending' ? 'text-amber-300' : 'text-red-300'}>
                  {error.message}
                </p>
                {error.status === 'pending' && (
                  <p className="text-amber-500 text-xs mt-1">
                    관리자가 가입 신청을 검토 중입니다.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                  required
                  autoComplete="current-password"
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  로그인 중...
                </>
              ) : '로그인'}
            </button>
          </form>

          {/* Divider */}
          <div className="divider" />

          <p className="text-center text-sm text-slate-500">
            계정이 없으신가요?{' '}
            <Link
              to="/register"
              className="font-medium"
              style={{ color: '#818cf8' }}
            >
              가입 신청하기
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          © 2026 N-Side Pro. All rights reserved.
        </p>
      </div>
    </div>
  )
}
