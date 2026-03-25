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

// Mock data for demo
const generateChartData = () => {
  const days = ['월', '화', '수', '목', '금', '토', '일']
  return days.map(day => ({
    day,
    count: Math.floor(Math.random() * 15) + 2,
    aeo: Math.floor(Math.random() * 30) + 60,
  }))
}

const mockActivities = [
  { id: '1', type: 'generate', text: '"다이어트 식단" 글 생성 완료', time: '5분 전', status: 'success' },
  { id: '2', type: 'keyword', text: '"헬스 운동" 키워드 분석', time: '12분 전', status: 'success' },
  { id: '3', type: 'schedule', text: '"건강 보조제 비교" 발행 예약', time: '1시간 전', status: 'pending' },
  { id: '4', type: 'generate', text: '"오메가3 효능" 글 생성 완료', time: '2시간 전', status: 'success' },
  { id: '5', type: 'indexing', text: '3개 URL IndexNow 제출', time: '3시간 전', status: 'success' },
  { id: '6', type: 'generate', text: '"저탄고지 식단" 배치 생성 시작', time: '4시간 전', status: 'running' },
  { id: '7', type: 'keyword', text: '"HIIT 운동" 키워드 저장', time: '5시간 전', status: 'success' },
  { id: '8', type: 'generate', text: '"단백질 파우더 추천" 생성 오류', time: '6시간 전', status: 'error' },
  { id: '9', type: 'schedule', text: '"채식 레시피" 발행 완료', time: '8시간 전', status: 'success' },
  { id: '10', type: 'generate', text: '"간헐적 단식 방법" 글 생성', time: '10시간 전', status: 'success' },
]

const mockTopKeywords = [
  { keyword: '다이어트 식단', aeoScore: 89, trend: 'up', volume: 45000 },
  { keyword: '헬스 운동 루틴', aeoScore: 76, trend: 'up', volume: 32000 },
  { keyword: '오메가3 효능', aeoScore: 72, trend: 'down', volume: 18000 },
  { keyword: '단백질 보충제', aeoScore: 68, trend: 'up', volume: 28000 },
  { keyword: '저탄고지 식단', aeoScore: 61, trend: 'same', volume: 15000 },
]

const mockPending = [
  { id: '1', keyword: '코르티솔 감소 방법', wordCount: 2100, aeoScore: 74 },
  { id: '2', keyword: '마그네슘 효능', wordCount: 1850, aeoScore: 81 },
  { id: '3', keyword: '비타민D 결핍 증상', wordCount: 2300, aeoScore: 65 },
]

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

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState(generateChartData())
  const [stats, setStats] = useState({
    totalArticles: 0,
    trackedKeywords: 0,
    avgAEO: 0,
    weekPublished: 0,
  })

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setStats({
        totalArticles: 247,
        trackedKeywords: 89,
        avgAEO: 74,
        weekPublished: 12,
      })
      setLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const activityIcons: Record<string, React.ReactNode> = {
    generate: <FileText className="w-4 h-4" />,
    keyword: <Search className="w-4 h-4" />,
    schedule: <Calendar className="w-4 h-4" />,
    indexing: <Zap className="w-4 h-4" />,
    running: <Clock className="w-4 h-4" />,
  }

  const activityStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-emerald-400" />
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
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: '1px solid #2d2d4a' }}>
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
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
            sub="이번 달 +34"
            trend={{ value: 12, direction: 'up' }}
            color="#4F46E5"
          />
          <StatCard
            icon={<Search className="w-5 h-5" />}
            label="추적 중인 키워드"
            value={stats.trackedKeywords.toLocaleString()}
            sub="5개 목록"
            trend={{ value: 8, direction: 'up' }}
            color="#06B6D4"
          />
          <StatCard
            icon={<BarChart2 className="w-5 h-5" />}
            label="평균 AEO 점수"
            value={`${stats.avgAEO}점`}
            sub="지난 주 대비 +3"
            trend={{ value: 4, direction: 'up' }}
            color="#10b981"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="이번 주 발행"
            value={stats.weekPublished}
            sub="목표: 15개"
            trend={{ value: 5, direction: 'down' }}
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
          </div>

          {/* Top Keywords */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">상위 키워드 AEO 점수</h2>
              <button onClick={() => navigate('/keywords')} className="text-xs text-indigo-400 hover:text-indigo-300">
                전체 보기 →
              </button>
            </div>
            <div className="space-y-3">
              {mockTopKeywords.map((item, i) => (
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
          </div>
        </div>

        {/* Activity + Pending - right col */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">최근 활동</h2>
              <span className="text-xs text-slate-600">오늘</span>
            </div>
            <div className="space-y-2.5">
              {mockActivities.slice(0, 6).map((activity) => (
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
          </div>

          {/* Pending Tasks */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">검토 대기</h2>
              <span className="badge-yellow">{mockPending.length}개</span>
            </div>
            <div className="space-y-2">
              {mockPending.map((item) => (
                <div key={item.id} className="p-3 rounded-lg transition-all hover:bg-white/5 cursor-pointer"
                  style={{ border: '1px solid #2d2d4a' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 font-medium truncate">{item.keyword}</span>
                    <span className={`ml-2 shrink-0 ${getAEOScoreBadgeClass(item.aeoScore)}`}>{item.aeoScore}점</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-600">{item.wordCount.toLocaleString()}자</span>
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
          </div>
        </div>
      </div>
    </div>
  )
}
