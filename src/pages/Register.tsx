import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap, Mail, Lock, User, MessageSquare, Loader2,
  AlertCircle, CheckCircle, ArrowLeft
} from 'lucide-react'
import { register } from '../lib/auth'

type Step = 'form' | 'success' | 'admin'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validations, setValidations] = useState({
    length: false,
    match: false,
  })

  const updateForm = (field: keyof typeof form, value: string) => {
    const next = { ...form, [field]: value }
    setForm(next)
    setValidations({
      length: next.password.length >= 8,
      match: next.password === next.passwordConfirm && next.password.length > 0,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validations.match) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (!validations.length) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await register({
      email: form.email,
      password: form.password,
      name: form.name,
      message: form.message,
    })

    setLoading(false)

    if (result.success) {
      setStep(result.status === 'admin' ? 'admin' : 'success')
    } else {
      setError(result.error || '가입 신청 실패')
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
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
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

        <div className="card p-8">
          {/* ─── Success: Pending ──────────────────────────────── */}
          {step === 'success' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(79,70,229,0.15)', border: '2px solid rgba(79,70,229,0.3)' }}>
                <CheckCircle className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">가입 신청 완료!</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <strong className="text-slate-200">{form.name}</strong>님의 가입 신청이 접수되었습니다.
                </p>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  관리자가 신청을 검토한 후 승인하면<br />
                  이메일로 알림을 드립니다.
                </p>
              </div>
              <div className="p-4 rounded-xl text-sm text-left space-y-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  승인 대기 중
                </div>
                <p className="text-slate-400 text-xs">
                  승인 전에는 로그인할 수 없습니다. 잠시 기다려 주세요.
                </p>
              </div>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                로그인 페이지로 돌아가기
              </Link>
            </div>
          )}

          {/* ─── Success: Admin (첫 번째 가입자) ─────────────────── */}
          {step === 'admin' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">관리자 계정 생성 완료!</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  첫 번째 가입자로 <strong className="text-emerald-400">관리자</strong> 권한이 부여되었습니다.
                </p>
              </div>
              <Link
                to="/login"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                지금 로그인하기
              </Link>
            </div>
          )}

          {/* ─── Form ──────────────────────────────────────────── */}
          {step === 'form' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">가입 신청</h2>
                <p className="text-slate-500 text-sm mt-1">관리자 승인 후 서비스를 이용할 수 있습니다</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-3 rounded-lg text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-300">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">이름</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => updateForm('name', e.target.value)}
                      placeholder="홍길동"
                      className="input-field pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => updateForm('email', e.target.value)}
                      placeholder="example@email.com"
                      className="input-field pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => updateForm('password', e.target.value)}
                      placeholder="••••••••"
                      className="input-field pl-10"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`w-2 h-2 rounded-full ${validations.length ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    <span className={`text-xs ${validations.length ? 'text-emerald-400' : 'text-slate-600'}`}>
                      8자 이상
                    </span>
                  </div>
                </div>

                {/* Password Confirm */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={form.passwordConfirm}
                      onChange={e => updateForm('passwordConfirm', e.target.value)}
                      placeholder="••••••••"
                      className="input-field pl-10"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  {form.passwordConfirm && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${validations.match ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <span className={`text-xs ${validations.match ? 'text-emerald-400' : 'text-red-400'}`}>
                        {validations.match ? '비밀번호 일치' : '비밀번호 불일치'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Request Message */}
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    신청 메시지 <span className="text-slate-600 text-xs">(선택사항)</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <textarea
                      value={form.message}
                      onChange={e => updateForm('message', e.target.value)}
                      placeholder="가입 신청 이유 또는 간단한 소개를 남겨주세요..."
                      className="input-field pl-10 resize-none"
                      rows={3}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !form.email || !form.password || !form.name || !validations.match}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      신청 중...
                    </>
                  ) : '가입 신청하기'}
                </button>
              </form>

              <div className="divider" />

              <p className="text-center text-sm text-slate-500">
                이미 계정이 있으신가요?{' '}
                <Link to="/login" className="font-medium" style={{ color: '#818cf8' }}>
                  로그인
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
