import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  FileText, Search, Calendar, TrendingUp, Plus, BarChart2,
  Clock, CheckCircle, AlertCircle, Zap, Bell, User, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { SkeletonCard } from '../components/ui/Skeleton'
import { getAEOScoreBadgeClass } from '../lib/aeo'
import { authFetch } from '../lib/auth'
import { useAuth } from '../App'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  trend?: { value: number; direction: 'up' | 'down' }
  color: string
}

function StatCard({ icon, label, value, sub, trend, color }: StatCardProps) {
  return (
    <div className="card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium
            ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.direction === 'up'
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />
            }
            {trend.value}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

interface Activity {
  id: string
  type: string
  text: string
  time: string
  status: string
  aeoScore?: number
}

interface TopKeyword {
  keyword: string
  aeoScore: number
  trend: 'up' | 'down' | 'same'
  volume: number
}

interface PendingItem {
  id: string
  keyword: string
  word_count: number
  aeo_score: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<{ day: string; count: number; aeo: number }[]>([])
  const [stats, setStats] = useState({
    totalArticles: 0,
    trackedKeywords: 0,
    avgAEO: 0,
    weekPublished: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [topKeywords, setTopKeywords] = useState<TopKeyword[]>([])
  const [pending, setPending] = useState<PendingItem[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        // 모든 API 병렬 호출
        const [statsRes, chartRes, activitiesRes, keywordsRes, pendingRes] = await Promise.allSettled([
          authFetch('/api/dashboard/stats').then(r => r.json()),
          authFetch('/api/dashboard/chart').then(r => r.json()),
          authFetch('/api/dashboard/recent-activities').then(r => r.json()),
          authFetch('/api/dashboard/top-keywords').then(r => r.json()),
          authFetch('/api/dashboard/pending').then(r => r.json()),
        ])

        if (statsRes.status === 'fulfilled') {
          const d = statsRes.value as typeof stats
          setStats(d)
        }
        if (chartRes.status === 'fulfilled') {
          const d = chartRes.value as { data: typeof chartData }
          // DB 데이터가 없으면 오늘 기준 빈 차트
          if (d.data && d.data.length > 0) {
            setChartData(d.data)
          } else {
            // 빈 차트 (7일치 0값)
            const days = ['월', '화', '수', '목', '금', '토', '일']
            setChartData(days.map(day => ({ day, count: 0, aeo: 0 })))
          }
        }
        if (activitiesRes.status === 'fulfilled') {
          const d = activitiesRes.value as { activities: Activity[] }
          setActivities(d.activities || [])
        }
        if (keywordsRes.status === 'fulfilled') {
          const d = keywordsRes.value as { keywords: TopKeyword[] }
          setTopKeywords(d.keywords || [])
        }
        if (pendingRes.status === 'fulfilled') {
          const d = pendingRes.value as { pending: PendingItem[] }
          setPending(d.pending || [])
        }
      } catch {
        // 오류 시 빈 상태 유지
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const activityIcons: Record<string, React.ReactNode> = {
    generate: <FileText className="w-4 h-4" />,
    keyword: <Search className="w-4 h-4" />,
    schedule: <Calendar className="w-4 h-4" />,
    indexing: <Zap className="w-4 h-4" />,
    running: <Clock className="w-4 h-4" />,
  }

  const activityStatusIcon = (status: string) => {
    if (status === 'success' || status === 'published') return <CheckCircle className="w-4 h-4 text-emerald-400" />
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />
    if (status === 'running') return <Clock className="w-4 h-4 text-blue-400 animate-spin" />
    return <Clock className="w-4 h-4 text-amber-400" />
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-400" />
            <span className="gradient-text">N-Side Pro</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            {user && <span className="ml-2 text-indigo-400">· {user.name}님 안녕하세요</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: '1px solid #2d2d4a' }}>
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="총 생성된 글"
            value={stats.totalArticles.toLocaleString()}
            sub={stats.totalArticles === 0 ? '아직 생성된 글 없음' : '실제 DB 데이터'}
            color="#4F46E5"
          />
          <StatCard
            icon={<Search className="w-5 h-5" />}
            label="추적 중인 키워드"
            value={stats.trackedKeywords.toLocaleString()}
            sub={stats.trackedKeywords === 0 ? '키워드를 저장해보세요' : '저장된 키워드'}
            color="#06B6D4"
          />
          <StatCard
            icon={<BarChart2 className="w-5 h-5" />}
            label="평균 AEO 점수"
            value={stats.avgAEO > 0 ? `${stats.avgAEO}점` : '-'}
            sub={stats.avgAEO === 0 ? '글을 생성하면 측정됩니다' : 'AEO 최적화 점수'}
            color="#10b981"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="이번 주 발행"
            value={stats.weekPublished}
            sub="최근 7일 발행 글"
            color="#f59e0b"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">빠른 작업</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/generate')}
            className="btn-primary flex items-center justify-center gap-2 py-4 rounded-xl text-base"
          >
            <Plus className="w-5 h-5" />
            새 글 생성
          </button>
          <button
            onClick={() => navigate('/keywords')}
            className="flex items-center justify-center gap-2 py-4 rounded-xl text-base font-semibold transition-all duration-200"
            style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <BarChart2 className="w-5 h-5" />
            키워드 분석
          </button>
          <button
            onClick={() => navigate('/schedule')}
            className="flex items-center justify-center gap-2 py-4 rounded-xl text-base font-semibold transition-all duration-200"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <Calendar className="w-5 h-5" />
            발행 예약
          </button>
        </div>
      </div>

      {/* DB 데이터 없을 때 안내 배너 */}
      {!loading && stats.totalArticles === 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)' }}>
          <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-300 font-medium">아직 생성된 글이 없습니다</p>
            <p className="text-xs text-slate-500 mt-0.5">
              글 생성 페이지에서 첫 번째 글을 만들어보세요. 설정에서 Gemini API 키를 먼저 입력하세요.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart + Keywords - left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">주간 생성 현황</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-indigo-400 inline-block rounded" />
                  생성 수
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block rounded" />
                  평균 AEO
                </span>
              </div>
            </div>
            {loading ? (
              <div className="h-[200px] flex items-center justify-center text-slate-600">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e1e30', border: '1px solid #2d2d4a', borderRadius: '8px', color: '#e2e8f0' }}
                    cursor={{ stroke: '#4F46E5', strokeWidth: 1 }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={{ fill: '#4F46E5', r: 3 }} name="생성 수" />
                  <Line type="monotone" dataKey="aeo" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4', r: 3 }} name="AEO 점수" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Keywords (실제 DB에서) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">상위 키워드 AEO 점수</h2>
              <button onClick={() => navigate('/keywords')} className="text-xs text-indigo-400 hover:text-indigo-300">
                전체 보기 →
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : topKeywords.length > 0 ? (
              <div className="space-y-3">
                {topKeywords.map((item, i) => (
                  <div key={item.keyword} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300 truncate">{item.keyword}</span>
                        <div className="flex items-center gap-2 ml-2">
                          {item.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />}
                          {item.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-400 shrink-0" />}
                          <span className={`shrink-0 ${getAEOScoreBadgeClass(item.aeoScore)}`}>{item.aeoScore}점</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${item.aeoScore}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600 text-sm">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>아직 생성된 글이 없습니다</p>
                <p className="text-xs mt-1">글을 생성하면 여기서 AEO 점수를 확인할 수 있습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity + Pending - right col */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">최근 활동</h2>
              <span className="text-xs text-slate-600">실제 DB</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-2.5">
                {activities.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: '#2d2d4a' }}>
                      <span className="text-slate-400">
                        {activityIcons[activity.type] || <FileText className="w-4 h-4" />}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs leading-relaxed truncate">{activity.text}</p>
                      <p className="text-slate-600 text-xs">{activity.time}</p>
                    </div>
                    {activityStatusIcon(activity.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-600 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>아직 활동이 없습니다</p>
              </div>
            )}
          </div>

          {/* Pending Tasks (초안 글) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">검토 대기 (초안)</h2>
              {pending.length > 0 && (
                <span className="badge-yellow">{pending.length}개</span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : pending.length > 0 ? (
              <>
                <div className="space-y-2">
                  {pending.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg transition-all hover:bg-white/5 cursor-pointer"
                      style={{ border: '1px solid #2d2d4a' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300 font-medium truncate">{item.keyword}</span>
                        <span className={`ml-2 shrink-0 ${getAEOScoreBadgeClass(item.aeo_score)}`}>{item.aeo_score}점</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-600">{item.word_count.toLocaleString()}자</span>
                        <button
                          onClick={() => navigate('/history')}
                          className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto"
                        >
                          검토하기 →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/history')}
                  className="w-full mt-3 text-xs text-center text-slate-500 hover:text-slate-300 py-2 rounded-lg hover:bg-white/5 transition-all"
                >
                  전체 보기
                </button>
              </>
            ) : (
              <div className="text-center py-6 text-slate-600 text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>검토 대기 글 없음</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
