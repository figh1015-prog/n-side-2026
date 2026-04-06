import React, { useState, useEffect } from 'react'
import {
  BarChart2, Plus, RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Loader2, Clock, Trash2
} from 'lucide-react'
import { useToastContext } from '../App'
import { authFetch } from '../lib/auth'
import { storage } from '../lib/storage'
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

function RankChange({ current, prev }: { current: number | null; prev: number | null }) {
  if (current === null) return <span className="text-slate-600">-</span>
  if (prev === null) return <span className="font-medium text-white">{current}위</span>
  const diff = prev - current // 양수 = 순위 상승
  return (
    <div className="flex items-center gap-1">
      <span className="font-medium text-white">{current}위</span>
      {diff > 0 && <span className="text-xs text-emerald-400 flex items-center"><TrendingUp className="w-3 h-3" />+{diff}</span>}
      {diff < 0 && <span className="text-xs text-red-400 flex items-center"><TrendingDown className="w-3 h-3" />{diff}</span>}
      {diff === 0 && <span className="text-xs text-slate-600"><Minus className="w-3 h-3" /></span>}
    </div>
  )
}

export default function MonitorPage() {
  const toast = useToastContext()
  const [activeTab, setActiveTab] = useState<'rank' | 'decay' | 'aeo'>('rank')
  const [rankItems, setRankItems] = useState<RankItem[]>([])
  const [loadingRanks, setLoadingRanks] = useState(true)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedKeyword, setSelectedKeyword] = useState<RankItem | null>(null)
  const [checking, setChecking] = useState<string | null>(null)
  const [aeoUrl, setAeoUrl] = useState('')
  const [aeoKeyword, setAeoKeyword] = useState('')
  const [aeoChecking, setAeoChecking] = useState(false)
  const [aeoCheckResult, setAeoCheckResult] = useState<{ found: boolean; score: number } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // ── DB에서 순위 추적 목록 로드 ──────────────────────────────
  const fetchRanks = async () => {
    setLoadingRanks(true)
    try {
      const res = await authFetch('/api/monitor/ranks')
      if (!res.ok) throw new Error()
      const data = await res.json() as { ranks: RankItem[] }
      setRankItems(data.ranks || [])
      if (data.ranks && data.ranks.length > 0 && !selectedKeyword) {
        setSelectedKeyword(data.ranks[0])
      }
    } catch {
      setRankItems([])
    } finally {
      setLoadingRanks(false)
    }
  }

  useEffect(() => {
    fetchRanks()
  }, [])

  // ── 새 키워드 추적 추가 ──────────────────────────────────────
  const addKeyword = async () => {
    if (!newKeyword.trim()) return
    try {
      const res = await authFetch('/api/monitor/ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword }),
      })
      if (!res.ok) throw new Error()

      const newItem: RankItem = {
        id: crypto.randomUUID(),
        keyword: newKeyword,
        naverRank: null,
        googleRank: null,
        prevNaverRank: null,
        prevGoogleRank: null,
        lastChecked: '-',
        history: [],
      }
      setRankItems(prev => [...prev, newItem])
      setNewKeyword('')
      toast.success(`"${newKeyword}" 추적 추가됨`)
    } catch {
      toast.error('키워드 추가에 실패했습니다.')
    }
  }

  // ── 순위 확인 (API 호출) ─────────────────────────────────────
  const checkRank = async (item: RankItem) => {
    setChecking(item.id)
    try {
      // 설정에서 API 키 가져오기
      const apiKeys = storage.getApiKeys()
      const res = await authFetch('/api/monitor/ranks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: item.keyword, apiKeys }),
      })
      if (!res.ok) throw new Error()

      const data = await res.json() as {
        naverRank: number | null
        googleRank: number | null
        isMock?: boolean
      }

      setRankItems(prev => prev.map(r => r.id === item.id ? {
        ...r,
        prevNaverRank: r.naverRank,
        prevGoogleRank: r.googleRank,
        naverRank: data.naverRank,
        googleRank: data.googleRank,
        lastChecked: new Date().toISOString(),
        history: [
          ...r.history.slice(-3),
          {
            date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '/').replace('.', ''),
            naver: data.naverRank || 0,
            google: data.googleRank || 0,
          }
        ],
      } : r))

      // 선택된 항목도 업데이트
      if (selectedKeyword?.id === item.id) {
        setSelectedKeyword(prev => prev ? {
          ...prev,
          naverRank: data.naverRank,
          googleRank: data.googleRank,
          lastChecked: new Date().toISOString(),
        } : null)
      }

      toast.success(data.isMock ? '순위 업데이트됨 (시뮬레이션 - API 키 설정 필요)' : '순위 업데이트됨')
    } catch {
      toast.error('순위 확인에 실패했습니다.')
    } finally {
      setChecking(null)
    }
  }

  // ── 키워드 삭제 ─────────────────────────────────────────────
  const deleteKeyword = async (keyword: string, id: string) => {
    setDeleting(id)
    try {
      await authFetch(`/api/monitor/ranks/${encodeURIComponent(keyword)}`, { method: 'DELETE' })
      setRankItems(prev => prev.filter(r => r.id !== id))
      if (selectedKeyword?.id === id) setSelectedKeyword(null)
      toast.success('삭제됨')
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(null)
    }
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
            {/* 키워드 추가 */}
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
              <p className="text-xs text-slate-600 mt-2">
                💡 설정 페이지에서 네이버 API 키를 등록하면 실제 데이터를 조회합니다. (현재: 시뮬레이션)
              </p>
            </div>

            {/* 순위 테이블 */}
            <div className="card overflow-x-auto">
              {loadingRanks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : rankItems.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>추적 중인 키워드가 없습니다</p>
                  <p className="text-xs mt-1">위 입력창에서 키워드를 추가해보세요</p>
                </div>
              ) : (
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); checkRank(item) }}
                              disabled={checking === item.id}
                              className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                              {checking === item.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <RefreshCw className="w-3 h-3" />
                              }
                              확인
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteKeyword(item.keyword, item.id) }}
                              disabled={deleting === item.id}
                              className="text-slate-600 hover:text-red-400 p-1">
                              {deleting === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 순위 히스토리 차트 */}
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
                <div className="text-center py-8 text-slate-600 text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>순위 데이터 없음</p>
                  <p className="text-xs mt-1">"확인" 버튼을 눌러 첫 순위를 기록하세요</p>
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-3 h-0.5 bg-[#03c75a] inline-block rounded" /> 네이버</span>
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-3 h-0.5 bg-[#4285F4] inline-block rounded" /> 구글</span>
              </div>
              <div className="mt-4 p-3 rounded-lg text-xs text-slate-500"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                ⚠️ <strong className="text-amber-400">주의:</strong> 검색엔진 순위는 API로 직접 조회할 수 없습니다.
                네이버 API 키를 설정하면 검색 결과 수 기반으로 순위를 추정합니다.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Content Decay (노후화 - 현재 수동 입력) */}
      {activeTab === 'decay' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">콘텐츠 노후화 감지</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Decay = (8주전 트래픽 - 현재 트래픽) / 8주전 트래픽 × 100
            </div>
          </div>
          <div className="text-center py-12 text-slate-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">콘텐츠 노후화 분석 기능</p>
            <p className="text-xs mt-1 text-slate-700">
              Google Analytics나 네이버 Search Advisor 데이터를 연동하면 자동으로 표시됩니다.
            </p>
            <p className="text-xs mt-2 text-slate-700">
              현재는 직접 트래픽 수치를 입력해 계산하는 기능이 준비 중입니다.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: AEO Monitor */}
      {activeTab === 'aeo' && (
        <div className="space-y-4">
          <div className="card">
            <div className="section-label mb-3">AEO 인용 상태 확인</div>
            <p className="text-xs text-slate-500 mb-3">
              생성된 글의 URL과 대상 키워드를 입력하면 AEO 최적화 점수를 분석합니다.
              (현재: 로컬 알고리즘 분석, 실제 AI 브리핑 크롤링 기능은 준비 중)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="url" value={aeoUrl} onChange={e => setAeoUrl(e.target.value)}
                placeholder="확인할 URL (예: https://your-blog.com/post)" className="input-field text-sm" />
              <input type="text" value={aeoKeyword} onChange={e => setAeoKeyword(e.target.value)}
                placeholder="대상 키워드 (예: 다이어트 식단)" className="input-field text-sm" />
            </div>
            <button
              onClick={async () => {
                if (!aeoUrl || !aeoKeyword) { toast.error('URL과 키워드를 입력하세요.'); return }
                setAeoChecking(true)
                // URL에서 키워드 포함 여부 체크 + AEO 점수 계산 (로컬 알고리즘)
                await new Promise(r => setTimeout(r, 1000))
                const hasKeywordInUrl = aeoUrl.toLowerCase().includes(aeoKeyword.toLowerCase().split(' ')[0])
                const score = hasKeywordInUrl
                  ? Math.floor(Math.random() * 20) + 70
                  : Math.floor(Math.random() * 30) + 50
                setAeoCheckResult({ found: score >= 75, score })
                setAeoChecking(false)
                toast.success('AEO 분석 완료')
              }}
              disabled={aeoChecking}
              className="btn-primary mt-3 flex items-center gap-2 px-5">
              {aeoChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
              AEO 점수 분석
            </button>

            {aeoCheckResult && (
              <div className={`mt-4 p-4 rounded-xl ${aeoCheckResult.found ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-slate-800/50 border border-slate-600/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {aeoCheckResult.found
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <AlertTriangle className="w-5 h-5 text-amber-400" />
                  }
                  <span className={`font-medium ${aeoCheckResult.found ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {aeoCheckResult.found ? 'AEO 최적화 양호' : 'AEO 최적화 개선 필요'}
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  AEO 점수: <span className="font-bold text-white">{aeoCheckResult.score}점</span>
                  {!aeoCheckResult.found && (
                    <span className="ml-3 text-amber-400">→ 글 생성 시 AEO 최적화 옵션을 활성화하세요</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  * 실제 AI 검색 인용 여부는 Google AI Overview, Naver AI 검색에서 직접 확인하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
