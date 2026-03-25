import React, { useState, useEffect } from 'react'
import {
  Calendar, Clock, Plus, Trash2, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, LayoutGrid, List, Zap, Info
} from 'lucide-react'
import { useToastContext } from '../App'

interface ScheduleItem {
  id: string
  keyword: string
  platform: string
  scheduledAt: string
  status: 'pending' | 'published' | 'failed'
}

const MOCK_SCHEDULES: ScheduleItem[] = [
  { id: '1', keyword: '다이어트 식단 완전정복', platform: '네이버 블로그', scheduledAt: '2026-03-26T09:00:00', status: 'pending' },
  { id: '2', keyword: '헬스 운동 루틴 초보자용', platform: '티스토리', scheduledAt: '2026-03-27T09:00:00', status: 'pending' },
  { id: '3', keyword: '단백질 보충제 비교 리뷰', platform: '네이버 블로그', scheduledAt: '2026-03-28T14:00:00', status: 'pending' },
  { id: '4', keyword: '오메가3 효능과 부작용', platform: '워드프레스', scheduledAt: '2026-03-25T09:00:00', status: 'published' },
  { id: '5', keyword: '채식 레시피 모음', platform: '티스토리', scheduledAt: '2026-03-24T09:00:00', status: 'published' },
  { id: '6', keyword: '저탄고지 식단 시작하기', platform: '네이버 블로그', scheduledAt: '2026-03-29T09:00:00', status: 'failed' },
  { id: '7', keyword: '마그네슘 결핍 증상', platform: '네이버 블로그', scheduledAt: '2026-03-30T09:00:00', status: 'pending' },
  { id: '8', keyword: '비타민D 보충 방법', platform: '티스토리', scheduledAt: '2026-03-31T09:00:00', status: 'pending' },
]

const PLATFORM_COLORS: Record<string, string> = {
  '네이버 블로그': '#03c75a',
  '티스토리': '#ff5722',
  '워드프레스': '#21759b',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#4F46E5',
  published: '#10b981',
  failed: '#ef4444',
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export default function SchedulePage() {
  const toast = useToastContext()
  const [schedules, setSchedules] = useState<ScheduleItem[]>(MOCK_SCHEDULES)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)) // March 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    keyword: '',
    platform: '네이버 블로그',
    date: '',
    hour: '09',
    minute: '00',
  })
  const [optimalTimes, setOptimalTimes] = useState<{ hour: number; minute: number; score: number; reason: string }[]>([])
  const [showOptimal, setShowOptimal] = useState(false)

  useEffect(() => {
    fetch('/api/schedule/optimal-times')
      .then(r => r.json())
      .then((data: { suggestions?: typeof optimalTimes }) => setOptimalTimes(data.suggestions || []))
      .catch(() => {})
  }, [])

  // Calendar calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const getSchedulesForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return schedules.filter(s => s.scheduledAt.startsWith(dateStr))
  }

  const handleAddSchedule = async () => {
    if (!newSchedule.keyword || !newSchedule.date) {
      toast.error('키워드와 날짜를 입력하세요.')
      return
    }
    const scheduledAt = `${newSchedule.date}T${newSchedule.hour}:${newSchedule.minute}:00`

    // Check conflict
    const conflict = schedules.find(s =>
      s.scheduledAt.startsWith(newSchedule.date) &&
      s.platform === newSchedule.platform &&
      s.status === 'pending'
    )

    if (conflict) {
      const next = new Date(scheduledAt)
      next.setDate(next.getDate() + 1)
      toast.warning(`충돌 감지! ${conflict.keyword}이(가) 같은 날 예약됨. 다음 날(${next.toLocaleDateString('ko-KR')})로 이동할까요?`)
    }

    const item: ScheduleItem = {
      id: crypto.randomUUID(),
      keyword: newSchedule.keyword,
      platform: newSchedule.platform,
      scheduledAt,
      status: 'pending',
    }
    setSchedules(prev => [...prev, item])
    setShowAddModal(false)
    setNewSchedule({ keyword: '', platform: '네이버 블로그', date: '', hour: '09', minute: '00' })
    toast.success('예약 추가됨')
  }

  const handleDelete = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id))
    toast.success('예약이 삭제되었습니다.')
  }

  const renderCalendarCell = (day: number) => {
    const items = getSchedulesForDate(day)
    const today = new Date()
    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isSelected = selectedDate === dateStr

    return (
      <div
        key={day}
        className={`min-h-[90px] p-1.5 rounded-lg cursor-pointer transition-all
          ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:bg-white/3'}
          ${isToday ? 'bg-indigo-900/20' : ''}`}
        style={{ border: isSelected ? '1px solid #4F46E5' : '1px solid transparent' }}
        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
      >
        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1
          ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
          {day}
        </div>
        <div className="space-y-0.5">
          {items.slice(0, 2).map(item => (
            <div key={item.id}
              className="text-xs px-1.5 py-0.5 rounded truncate"
              style={{ background: `${STATUS_COLORS[item.status]}20`, color: STATUS_COLORS[item.status] }}>
              {item.keyword.substring(0, 12)}...
            </div>
          ))}
          {items.length > 2 && (
            <div className="text-xs text-slate-600 px-1">+{items.length - 2}개</div>
          )}
        </div>
      </div>
    )
  }

  const sortedSchedules = [...schedules].sort((a, b) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )

  const selectedDayItems = selectedDate ? schedules.filter(s => s.scheduledAt.startsWith(selectedDate)) : []

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          발행 스케줄
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowOptimal(!showOptimal)}
            className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Zap className="w-4 h-4 text-amber-400" />
            최적 시간 추천
          </button>
          <div className="tab-bar">
            <button className={`tab-item flex items-center gap-1 ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}>
              <LayoutGrid className="w-3.5 h-3.5" /> 월
            </button>
            <button className={`tab-item flex items-center gap-1 ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}>
              <List className="w-3.5 h-3.5" /> 목록
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus className="w-4 h-4" />
            예약 추가
          </button>
        </div>
      </div>

      {/* Optimal Times Panel */}
      {showOptimal && optimalTimes.length > 0 && (
        <div className="card">
          <div className="section-label mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            최적 발행 시간 추천
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {optimalTimes.map((t, i) => (
              <div key={i} className="rounded-xl p-3"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 font-bold">
                    {String(t.hour).padStart(2, '0')}:{String(t.minute).padStart(2, '0')}
                  </span>
                  <span className="badge text-xs bg-amber-500/20 text-amber-400">{t.score}점</span>
                </div>
                <p className="text-xs text-slate-500">{t.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '전체 예약', value: schedules.length, color: '#4F46E5' },
          { label: '대기중', value: schedules.filter(s => s.status === 'pending').length, color: '#4F46E5' },
          { label: '발행됨', value: schedules.filter(s => s.status === 'published').length, color: '#10b981' },
          { label: '오류', value: schedules.filter(s => s.status === 'failed').length, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="card py-4 text-center">
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar View */}
      {viewMode === 'month' && (
        <div className="card">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="btn-secondary p-2">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-white">
              {year}년 {MONTHS[month]}
            </h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="btn-secondary p-2">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className={`text-xs text-center py-1.5 font-medium
                ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-slate-500'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px]" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => renderCalendarCell(i + 1))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t flex-wrap" style={{ borderColor: '#2d2d4a' }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-sm" style={{ background: `${color}30`, border: `1px solid ${color}60` }} />
                {status === 'pending' ? '예약됨' : status === 'published' ? '발행됨' : '오류'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Date Detail */}
      {selectedDate && selectedDayItems.length > 0 && viewMode === 'month' && (
        <div className="card">
          <h3 className="font-medium text-white mb-3">
            {new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 예약
          </h3>
          <div className="space-y-2">
            {selectedDayItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: '#13131f', border: '1px solid #2d2d4a' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[item.status] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 font-medium truncate">{item.keyword}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.scheduledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${PLATFORM_COLORS[item.platform]}20`, color: PLATFORM_COLORS[item.platform] }}>
                      {item.platform}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-slate-600 hover:text-red-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b" style={{ borderColor: '#2d2d4a' }}>
                  <th className="text-left pb-2">키워드</th>
                  <th className="text-left pb-2">플랫폼</th>
                  <th className="text-left pb-2">예약 일시</th>
                  <th className="text-left pb-2">상태</th>
                  <th className="text-left pb-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {sortedSchedules.map(item => (
                  <tr key={item.id} className="border-b hover:bg-white/3 transition-colors"
                    style={{ borderColor: '#2d2d4a' }}>
                    <td className="py-3 font-medium text-slate-300">{item.keyword}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-1 rounded"
                        style={{ background: `${PLATFORM_COLORS[item.platform]}20`, color: PLATFORM_COLORS[item.platform] }}>
                        {item.platform}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 text-xs">
                      {new Date(item.scheduledAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-3">
                      {item.status === 'pending' && <span className="badge-blue">예약됨</span>}
                      {item.status === 'published' && <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> 발행됨</span>}
                      {item.status === 'failed' && <span className="badge-red flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> 오류</span>}
                    </td>
                    <td className="py-3">
                      <button onClick={() => handleDelete(item.id)} className="text-slate-600 hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setShowAddModal(false)}>
          <div className="card max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                예약 추가
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">키워드/글 제목</label>
                <input type="text" value={newSchedule.keyword}
                  onChange={e => setNewSchedule(p => ({ ...p, keyword: e.target.value }))}
                  className="input-field text-sm" placeholder="예: 다이어트 식단 완전정복" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">플랫폼</label>
                <select value={newSchedule.platform}
                  onChange={e => setNewSchedule(p => ({ ...p, platform: e.target.value }))}
                  className="input-field text-sm">
                  {['네이버 블로그', '티스토리', '워드프레스'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1.5">날짜</label>
                  <input type="date" value={newSchedule.date}
                    onChange={e => setNewSchedule(p => ({ ...p, date: e.target.value }))}
                    className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1.5">시간</label>
                  <select value={newSchedule.hour}
                    onChange={e => setNewSchedule(p => ({ ...p, hour: e.target.value }))}
                    className="input-field text-sm">
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}시</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-2.5">취소</button>
              <button onClick={handleAddSchedule} className="btn-primary flex-1 py-2.5">예약 추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
