import React, { useState } from 'react'
import {
  BarChart2, Plus, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Loader2, Clock, ExternalLink
} from 'lucide-react'
import { useToastContext } from '../App'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RankItem {
  id: string
  keyword: string
  naverRank: number | null
  googleRank: number | null
  prevNaverRank: number | null
  prevGoogleRank: number | null
  lastChecked: string
  history: { date: string; naver: number; google: number }[]
}

const MOCK_RANKS: RankItem[] = [
  {
    id: '1', keyword: '다이어트 식단', naverRank: 3, googleRank: 7, prevNaverRank: 8, prevGoogleRank: 12,
    lastChecked: '2026-03-25T10:30:00',
    history: [
      { date: '03/01', naver: 15, google: 25 }, { date: '03/08', naver: 10, google: 18 },
      { date: '03/15', naver: 8, google: 12 }, { date: '03/22', naver: 3, google: 7 },
    ],
  },
  {
    id: '2', keyword: '헬스 운동 루틴', naverRank: 5, googleRank: 14, prevNaverRank: 5, prevGoogleRank: 11,
    lastChecked: '2026-03-25T10:30:00',
    history: [
      { date: '03/01', naver: 20, google: 30 }, { date: '03/08', naver: 12, google: 20 },
      { date: '03/15', naver: 7, google: 15 }, { date: '03/22', naver: 5, google: 14 },
    ],
  },
  {
    id: '3', keyword: '단백질 보충제 추천', naverRank: 12, googleRank: 25, prevNaverRank: 9, prevGoogleRank: 20,
    lastChecked: '2026-03-25T10:30:00',
    history: [
      { date: '03/01', naver: 8, google: 15 }, { date: '03/08', naver: 9, google: 18 },
      { date: '03/15', naver: 10, google: 22 }, { date: '03/22', naver: 12, google: 25 },
    ],
  },
]

const MOCK_DECAY = [
  { id: '1', keyword: '오메가3 효능', url: '/omega3-benefits', traffic8w: 1200, trafficNow: 450, decayScore: 62.5 },
  { id: '2', keyword: '저탄고지 다이어트', url: '/ketogenic-diet', traffic8w: 800, trafficNow: 650, decayScore: 18.75 },
  { id: '3', keyword: '비타민D 결핍', url: '/vitamin-d-deficiency', traffic8w: 2000, trafficNow: 700, decayScore: 65.0 },
  { id: '4', keyword: '아침 운동 효과', url: '/morning-exercise', traffic8w: 500, trafficNow: 420, decayScore: 16.0 },
]

function RankChange({ current, prev }: { current: number | null; prev: number | null }) {
  if (current === null) return <span className="text-slate-600">-</span>
  if (prev === null) return <span className="font-medium text-white">{current}</span>
  const diff = prev - current // positive = rank improved (went down in number)
  return (
    <div className="flex items-center gap-1">
      <span className="font-medium text-white">{current}</span>
      {diff > 0 && <span className="text-xs text-emerald-400 flex items-center"><TrendingUp className="w-3 h-3" />+{diff}</span>}
      {diff < 0 && <span className="text-xs text-red-400 flex items-center"><TrendingDown className="w-3 h-3" />{diff}</span>}
      {diff === 0 && <span className="text-xs text-slate-600"><Minus className="w-3 h-3" /></span>}
    </div>
  )
}

export default function MonitorPage() {
  const toast = useToastContext()
  const [activeTab, setActiveTab] = useState<'rank' | 'decay' | 'aeo'>('rank')
  const [rankItems, setRankItems] = useState(MOCK_RANKS)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedKeyword, setSelectedKeyword] = useState<RankItem | null>(MOCK_RANKS[0])
  const [checking, setChecking] = useState<string | null>(null)
  const [aeoUrl, setAeoUrl] = useState('')
  const [aeoKeyword, setAeoKeyword] = useState('')
  const [aeoCheckResult, setAeoCheckResult] = useState<{ found: boolean; score: number } | null>(null)

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    const item: RankItem = {
      id: crypto.randomUUID(),
      keyword: newKeyword,
      naverRank: null,
      googleRank: null,
      prevNaverRank: null,
      prevGoogleRank: null,
      lastChecked: '-',
      history: [],
    }
    setRankItems(prev => [...prev, item])
    setNewKeyword('')
    toast.success(`"${newKeyword}" 추적 추가됨`)
  }

  const checkRank = async (id: string) => {
    setChecking(id)
    await new Promise(r => setTimeout(r, 1500))
    setRankItems(prev => prev.map(item => item.id === id ? {
      ...item,
      prevNaverRank: item.naverRank,
      prevGoogleRank: item.googleRank,
      naverRank: Math.floor(Math.random() * 20) + 1,
      googleRank: Math.floor(Math.random() * 30) + 1,
      lastChecked: new Date().toISOString(),
    } : item))
    setChecking(null)
    toast.success('순위 업데이트됨')
  }

  const tabs = [
    { id: 'rank', label: '순위 추적' },
    { id: 'decay', label: '콘텐츠 노후화' },
    { id: 'aeo', label: 'AEO 모니터' },
  ]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-indigo-400" />
        SEO 모니터 대시보드
      </h1>

      <div className="tab-bar w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`tab-item ${activeTab === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Rank Tracker */}
      {activeTab === 'rank' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Add keyword */}
            <div className="card">
              <div className="flex gap-2">
                <input type="text" value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addKeyword()}
                  placeholder="추적할 키워드 입력..."
                  className="input-field text-sm flex-1" />
                <button onClick={addKeyword} className="btn-primary flex items-center gap-2 px-4">
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
            </div>

            {/* Rank Table */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b" style={{ borderColor: '#2d2d4a' }}>
                    <th className="text-left pb-2">키워드</th>
                    <th className="text-left pb-2">네이버 순위</th>
                    <th className="text-left pb-2">구글 순위</th>
                    <th className="text-left pb-2">마지막 체크</th>
                    <th className="text-left pb-2">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {rankItems.map(item => (
                    <tr key={item.id}
                      className={`border-b cursor-pointer transition-colors ${selectedKeyword?.id === item.id ? 'bg-indigo-500/5' : 'hover:bg-white/3'}`}
                      style={{ borderColor: '#2d2d4a' }}
                      onClick={() => setSelectedKeyword(item)}>
                      <td className="py-3 font-medium text-slate-300">{item.keyword}</td>
                      <td className="py-3">
                        <RankChange current={item.naverRank} prev={item.prevNaverRank} />
                      </td>
                      <td className="py-3">
                        <RankChange current={item.googleRank} prev={item.prevGoogleRank} />
                      </td>
                      <td className="py-3 text-slate-500 text-xs">
                        {item.lastChecked === '-' ? '-' : new Date(item.lastChecked).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); checkRank(item.id) }}
                          disabled={checking === item.id}
                          className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                          {checking === item.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RefreshCw className="w-3 h-3" />
                          }
                          지금 확인
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Panel */}
          {selectedKeyword && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">
                "{selectedKeyword.keyword}" 순위 히스토리
              </h3>
              {selectedKeyword.history.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={selectedKeyword.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis reversed tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e1e30', border: '1px solid #2d2d4a', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="naver" stroke="#03c75a" strokeWidth={2} dot={{ r: 3 }} name="네이버" />
                    <Line type="monotone" dataKey="google" stroke="#4285F4" strokeWidth={2} dot={{ r: 3 }} name="구글" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-slate-600 text-sm">순위 데이터 없음</div>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-3 h-0.5 bg-[#03c75a] inline-block rounded" /> 네이버</span>
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-3 h-0.5 bg-[#4285F4] inline-block rounded" /> 구글</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Content Decay */}
      {activeTab === 'decay' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">콘텐츠 노후화 감지</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Decay = (8주전 트래픽 - 현재 트래픽) / 8주전 트래픽 × 100
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b" style={{ borderColor: '#2d2d4a' }}>
                  <th className="text-left pb-2">키워드</th>
                  <th className="text-left pb-2">8주 전 트래픽</th>
                  <th className="text-left pb-2">현재 트래픽</th>
                  <th className="text-left pb-2">노후화 점수</th>
                  <th className="text-left pb-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DECAY.sort((a, b) => b.decayScore - a.decayScore).map(item => (
                  <tr key={item.id} className="border-b hover:bg-white/3" style={{ borderColor: '#2d2d4a' }}>
                    <td className="py-3">
                      <div className="font-medium text-slate-300">{item.keyword}</div>
                      <div className="text-xs text-slate-600">{item.url}</div>
                    </td>
                    <td className="py-3 text-slate-400">{item.traffic8w.toLocaleString()}</td>
                    <td className="py-3 text-slate-400">{item.trafficNow.toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-20">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, item.decayScore)}%`,
                              background: item.decayScore > 50 ? '#ef4444' : item.decayScore > 20 ? '#f59e0b' : '#10b981'
                            }} />
                        </div>
                        <span className={`text-xs font-bold ${item.decayScore > 50 ? 'text-red-400' : item.decayScore > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.decayScore.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      {item.decayScore > 20 && (
                        <button className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          리프레시
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: AEO Monitor */}
      {activeTab === 'aeo' && (
        <div className="space-y-4">
          <div className="card">
            <div className="section-label mb-3">AEO 인용 상태 확인</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="url" value={aeoUrl} onChange={e => setAeoUrl(e.target.value)}
                placeholder="확인할 URL..." className="input-field text-sm" />
              <input type="text" value={aeoKeyword} onChange={e => setAeoKeyword(e.target.value)}
                placeholder="대상 키워드..." className="input-field text-sm" />
            </div>
            <button
              onClick={async () => {
                if (!aeoUrl || !aeoKeyword) { toast.error('URL과 키워드를 입력하세요.'); return }
                await new Promise(r => setTimeout(r, 1200))
                setAeoCheckResult({ found: Math.random() > 0.5, score: Math.floor(Math.random() * 40) + 60 })
                toast.success('AEO 확인 완료')
              }}
              className="btn-primary mt-3 flex items-center gap-2 px-5">
              <BarChart2 className="w-4 h-4" />
              인용 상태 확인
            </button>

            {aeoCheckResult && (
              <div className={`mt-4 p-4 rounded-xl ${aeoCheckResult.found ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-slate-800/50 border border-slate-600/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {aeoCheckResult.found
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <AlertTriangle className="w-5 h-5 text-amber-400" />
                  }
                  <span className={`font-medium ${aeoCheckResult.found ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {aeoCheckResult.found ? 'AI 브리핑에 인용됨!' : 'AI 브리핑 미인용'}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  AEO 점수: <span className="font-bold text-white">{aeoCheckResult.score}점</span>
                  {!aeoCheckResult.found && (
                    <span className="ml-3 text-amber-400">→ AEO 최적화를 강화하세요</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
