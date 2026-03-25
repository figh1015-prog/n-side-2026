import React, { useState, useCallback } from 'react'
import {
  Search, TrendingUp, TrendingDown, Minus, BarChart2, Plus,
  Send, Download, Loader2, Trash2, Star, Target, Layers
} from 'lucide-react'
import { useToastContext } from '../App'
import { storage } from '../lib/storage'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface KeywordAnalysis {
  keyword: string
  monthlyVolume: number
  competition: number
  saturationScore: number
  difficulty: string
  trend: number[]
  related: string[]
  recommendedContentType: string
  isMock?: boolean
}

interface KeywordListItem {
  keyword: string
  analysis?: KeywordAnalysis
}

const DIFFICULTY_COLORS: Record<string, string> = {
  '쉬움': 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
  '보통': 'text-amber-400 bg-amber-500/15 border-amber-500/25',
  '어려움': 'text-orange-400 bg-orange-500/15 border-orange-500/25',
  '매우어려움': 'text-red-400 bg-red-500/15 border-red-500/25',
}

function Sparkline({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke="#4F46E5" strokeWidth={1.5} dot={false} />
        <Tooltip contentStyle={{ display: 'none' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function KeywordsPage() {
  const toast = useToastContext()
  const [searchInput, setSearchInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null)
  const [lists, setLists] = useState<Record<string, KeywordListItem[]>>(() => {
    const stored = storage.getKeywordLists()
    return Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, v.map((kw: string) => ({ keyword: kw }))]))
  })
  const [activeList, setActiveList] = useState<string>('')
  const [newListName, setNewListName] = useState('')
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [clusterSeed, setClusterSeed] = useState('')
  const [cluster, setCluster] = useState<{ center: string; nodes: { keyword: string; written: boolean }[] } | null>(null)

  const apiKeys = storage.getApiKeys()

  const analyzeKeyword = useCallback(async (kw?: string) => {
    const target = kw || searchInput.trim()
    if (!target) return

    setAnalyzing(true)
    try {
      const res = await fetch('/api/keyword/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: target, apiKeys }),
      })
      const data = await res.json() as KeywordAnalysis
      setAnalysis(data)
      if (data.isMock) toast.info('API 키 없음 - 샘플 데이터 표시 중')
    } catch {
      toast.error('분석 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }, [searchInput, apiKeys, toast])

  const saveToList = (listName: string, keyword: string, kAnalysis?: KeywordAnalysis) => {
    setLists(prev => {
      const existing = prev[listName] || []
      if (existing.find(i => i.keyword === keyword)) return prev
      const updated = { ...prev, [listName]: [...existing, { keyword, analysis: kAnalysis }] }
      storage.setKeywordLists(Object.fromEntries(Object.entries(updated).map(([k, v]) => [k, v.map(i => i.keyword)])))
      return updated
    })
    toast.success(`"${keyword}" → "${listName}" 저장됨`)
  }

  const createList = () => {
    if (!newListName.trim()) return
    setLists(prev => ({ ...prev, [newListName]: [] }))
    setActiveList(newListName)
    setNewListName('')
    setShowNewListInput(false)
    toast.success(`"${newListName}" 목록 생성됨`)
  }

  const removeFromList = (listName: string, keyword: string) => {
    setLists(prev => {
      const updated = { ...prev, [listName]: prev[listName].filter(i => i.keyword !== keyword) }
      storage.setKeywordLists(Object.fromEntries(Object.entries(updated).map(([k, v]) => [k, v.map(i => i.keyword)])))
      return updated
    })
  }

  const generateCluster = async () => {
    if (!clusterSeed.trim()) return
    const relatedKeywords = [
      `${clusterSeed} 방법`, `${clusterSeed} 효과`, `${clusterSeed} 추천`,
      `${clusterSeed} 종류`, `${clusterSeed} 주의사항`, `${clusterSeed} 비교`,
      `${clusterSeed} 초보자`, `${clusterSeed} 전문가`, `${clusterSeed} 가격`,
      `${clusterSeed} 리뷰`, `${clusterSeed} 사례`, `${clusterSeed} 최신`,
    ]
    setCluster({
      center: clusterSeed,
      nodes: relatedKeywords.map(kw => ({ keyword: kw, written: Math.random() > 0.6 }))
    })
  }

  const exportList = (listName: string) => {
    const content = lists[listName]?.map(i => i.keyword).join('\n') || ''
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keywords_${listName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Search className="w-5 h-5 text-indigo-400" />
        키워드 분석 센터
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keyword Analyzer */}
        <div className="space-y-4">
          <div className="card">
            <div className="section-label">키워드 분석기</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyzeKeyword()}
                placeholder="분석할 키워드 입력..."
                className="input-field text-sm flex-1"
              />
              <button onClick={() => analyzeKeyword()}
                disabled={analyzing || !searchInput.trim()}
                className="btn-primary flex items-center gap-2 px-4 shrink-0">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                분석
              </button>
            </div>
          </div>

          {analyzing && (
            <div className="card flex items-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="text-sm">키워드 분석 중...</span>
            </div>
          )}

          {analysis && (
            <div className="card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{analysis.keyword}</h2>
                  {analysis.isMock && <span className="badge-gray text-xs mt-1">샘플 데이터</span>}
                </div>
                <span className={`badge border ${DIFFICULTY_COLORS[analysis.difficulty] || 'text-slate-400 bg-slate-500/15'}`}>
                  {analysis.difficulty}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)' }}>
                  <div className="text-xl font-bold text-indigo-400">{analysis.monthlyVolume.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">월간 검색량</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <div className="text-xl font-bold text-cyan-400">{analysis.competition.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">경쟁 문서수</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="text-xl font-bold text-amber-400">{analysis.saturationScore}%</div>
                  <div className="text-xs text-slate-500 mt-1">포화도</div>
                </div>
              </div>

              {/* Trend Sparkline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">12개월 트렌드</span>
                  <span className={`text-xs ${analysis.trend[11] > analysis.trend[0] ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.trend[11] > analysis.trend[0] ? '↑ 상승' : '↓ 하락'}
                  </span>
                </div>
                <Sparkline data={analysis.trend} />
              </div>

              {/* Recommended Type */}
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-slate-400">추천 콘텐츠 유형:</span>
                <span className="badge-blue">{analysis.recommendedContentType}</span>
              </div>

              {/* Related Keywords */}
              <div>
                <div className="section-label mb-2">연관 키워드</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.related.map(rk => (
                    <button
                      key={rk}
                      onClick={() => { setSearchInput(rk); analyzeKeyword(rk) }}
                      className="text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-90"
                      style={{ background: 'rgba(79,70,229,0.12)', color: '#a5b4fc', border: '1px solid rgba(79,70,229,0.25)' }}
                    >
                      {rk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save to List */}
              {Object.keys(lists).length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">목록에 저장:</span>
                  {Object.keys(lists).map(ln => (
                    <button key={ln} onClick={() => saveToList(ln, analysis.keyword, analysis)}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all btn-secondary">
                      + {ln}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyword Lists */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="section-label">키워드 목록 관리</div>
              <button onClick={() => setShowNewListInput(!showNewListInput)}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" />
                새 목록
              </button>
            </div>

            {showNewListInput && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createList()}
                  placeholder="목록 이름..."
                  className="input-field text-sm flex-1"
                />
                <button onClick={createList} className="btn-primary px-4 py-2 text-sm">생성</button>
              </div>
            )}

            {Object.keys(lists).length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">키워드 목록을 만들어 관리하세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.keys(lists).map(listName => (
                  <div key={listName}
                    className={`rounded-lg p-3 cursor-pointer transition-all ${activeList === listName ? 'border-indigo-500/40 bg-indigo-500/5' : 'hover:bg-white/3'}`}
                    style={{ border: `1px solid ${activeList === listName ? 'rgba(99,102,241,0.4)' : '#2d2d4a'}` }}
                    onClick={() => setActiveList(activeList === listName ? '' : listName)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">{listName}</span>
                      <div className="flex items-center gap-2">
                        <span className="badge-gray text-xs">{lists[listName]?.length || 0}개</span>
                        <button onClick={(e) => { e.stopPropagation(); exportList(listName) }}
                          className="text-slate-500 hover:text-slate-300 p-1">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {activeList === listName && lists[listName]?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {lists[listName].map(item => (
                          <div key={item.keyword} className="flex items-center justify-between py-1 border-t" style={{ borderColor: '#2d2d4a' }}>
                            <span className="text-xs text-slate-400">{item.keyword}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setSearchInput(item.keyword); analyzeKeyword(item.keyword) }}
                                className="text-indigo-400 hover:text-indigo-300 text-xs">분석</button>
                              <button onClick={() => removeFromList(listName, item.keyword)}
                                className="text-slate-600 hover:text-red-400 p-0.5">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topic Cluster Visualizer */}
      <div className="card">
        <div className="section-label mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          토픽 클러스터 시각화
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={clusterSeed}
            onChange={e => setClusterSeed(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateCluster()}
            placeholder="시드 키워드 입력 (예: 다이어트)"
            className="input-field text-sm flex-1 max-w-sm"
          />
          <button onClick={generateCluster}
            disabled={!clusterSeed.trim()}
            className="btn-primary flex items-center gap-2 text-sm px-4">
            <BarChart2 className="w-4 h-4" />
            클러스터 생성
          </button>
        </div>

        {cluster && (
          <div className="relative">
            {/* Center node */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="px-5 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #06B6D4)' }}>
                {cluster.center}
              </div>
              <span className="text-slate-600 text-sm">→</span>
              <div className="flex flex-wrap gap-2">
                {cluster.nodes.map(node => (
                  <button
                    key={node.keyword}
                    onClick={() => { setSearchInput(node.keyword); analyzeKeyword(node.keyword) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 ${node.written
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    }`}
                  >
                    {node.keyword}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50 inline-block" />
                글 작성됨 ({cluster.nodes.filter(n => n.written).length}개)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-700/50 border border-slate-600/50 inline-block" />
                미작성 ({cluster.nodes.filter(n => !n.written).length}개)
              </span>
              <button
                onClick={() => {
                  toast.info('배치 생성으로 전송됨')
                }}
                className="ml-auto flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300">
                <Send className="w-3.5 h-3.5" />
                클러스터 전체 발행
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
