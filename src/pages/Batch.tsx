import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Play, Pause, X, CheckCircle, AlertCircle, Loader2,
  Clock, Download, Calendar, ChevronDown, ChevronUp, Package,
  RotateCcw, Send, FileText
} from 'lucide-react'
import { useToastContext } from '../App'
import { storage } from '../lib/storage'
import { calculateAEOScore, getAEOScoreBadgeClass } from '../lib/aeo'

interface BatchItem {
  id: string
  keyword: string
  status: 'pending' | 'running' | 'done' | 'error'
  aeoScore?: number
  wordCount?: number
  content?: string
  error?: string
  articleId?: string
}

export default function BatchPage() {
  const toast = useToastContext()
  const navigate = useNavigate()
  const [keywords, setKeywords] = useState('')
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [batchId, setBatchId] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({
    startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    hour: 9,
    minute: 0,
    platform: '네이버 블로그',
    intervalDays: 1,
  })

  const pauseRef = useRef(false)
  const cancelRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const apiKeys = storage.getApiKeys()
  const settings = storage.getSettings()

  const completedItems = batchItems.filter(i => i.status === 'done')
  const errorItems = batchItems.filter(i => i.status === 'error')
  const pendingItems = batchItems.filter(i => i.status === 'pending')

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const kws = lines.map(l => l.split(',')[0].replace(/"/g, '').trim()).filter(Boolean)
      setKeywords(kws.join('\n'))
      toast.success(`CSV에서 ${kws.length}개 키워드 로드됨`)
    }
    reader.readAsText(file)
  }

  const handleStart = async () => {
    const kws = keywords.split('\n').map(k => k.trim()).filter(Boolean).slice(0, 100)
    if (kws.length === 0) {
      toast.error('키워드를 입력해주세요.')
      return
    }
    if (!apiKeys.gemini) {
      toast.error('Gemini API 키를 먼저 설정해주세요.')
      return
    }

    const items: BatchItem[] = kws.map(k => ({ id: crypto.randomUUID(), keyword: k, status: 'pending' }))
    setBatchItems(items)
    setIsRunning(true)
    setIsPaused(false)
    cancelRef.current = false
    pauseRef.current = false

    // Start batch via API
    try {
      const res = await fetch('/api/batch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kws, settings }),
      })
      const data = await res.json() as { batchId?: string }
      if (data.batchId) setBatchId(data.batchId)
    } catch {}

    // Process sequentially
    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break

      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 500))
        if (cancelRef.current) break
      }
      if (cancelRef.current) break

      setCurrentIndex(i)
      const item = items[i]

      // Mark as running
      setBatchItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'running' } : p))

      try {
        let content = ''
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: item.keyword, settings, apiKeys }),
        })

        if (!response.ok) throw new Error('API 오류')

        const reader = response.body?.getReader()
        if (!reader) throw new Error('스트림 실패')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.text) content += parsed.text
                if (parsed.aeoScore !== undefined) {
                  setBatchItems(prev => prev.map(p => p.id === item.id ? {
                    ...p, status: 'done', aeoScore: parsed.aeoScore,
                    wordCount: parsed.wordCount, content, articleId: parsed.articleId
                  } : p))
                }
              } catch {}
            }
          }
        }

        if (!content) throw new Error('생성 결과 없음')

        const { score } = calculateAEOScore(content)
        setBatchItems(prev => prev.map(p => p.id === item.id && p.status !== 'done' ? {
          ...p, status: 'done', aeoScore: score, wordCount: content.length, content
        } : p))

      } catch (err) {
        setBatchItems(prev => prev.map(p => p.id === item.id ? {
          ...p, status: 'error', error: err instanceof Error ? err.message : '오류'
        } : p))
      }

      // Rate limit: wait 15s between requests
      if (i < items.length - 1 && !cancelRef.current) {
        await new Promise(r => setTimeout(r, 15000))
      }
    }

    setIsRunning(false)
    toast.success(`배치 완료: ${completedItems.length + 1}개 성공`)
  }

  const handlePauseResume = () => {
    if (isPaused) {
      pauseRef.current = false
      setIsPaused(false)
      toast.info('배치 재개됨')
    } else {
      pauseRef.current = true
      setIsPaused(true)
      toast.info('배치 일시정지됨')
    }
  }

  const handleCancel = () => {
    cancelRef.current = true
    pauseRef.current = false
    setIsRunning(false)
    setIsPaused(false)
    toast.warning('배치 작업이 취소되었습니다.')
  }

  const handleAutoSchedule = async () => {
    const doneIds = completedItems.map(i => i.articleId).filter(Boolean) as string[]
    if (doneIds.length === 0) {
      toast.error('완료된 글이 없습니다.')
      return
    }
    try {
      const res = await fetch('/api/schedule/batch-distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: doneIds,
          startDate: scheduleConfig.startDate,
          hour: scheduleConfig.hour,
          minute: scheduleConfig.minute,
          platform: scheduleConfig.platform,
          intervalDays: scheduleConfig.intervalDays,
        }),
      })
      const data = await res.json() as { success?: boolean; schedules?: unknown[] }
      if (data.success) {
        toast.success(`${doneIds.length}개 글이 자동 배분되었습니다.`)
        setShowScheduleModal(false)
        navigate('/schedule')
      }
    } catch (err) {
      toast.error('스케줄 배분 실패')
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exportZip = () => {
    const content = completedItems.map(item =>
      `=== ${item.keyword} ===\n\n${item.content || ''}\n\n`
    ).join('\n' + '='.repeat(50) + '\n\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch_articles_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('내보내기 완료')
  }

  const progress = batchItems.length > 0
    ? Math.round(((completedItems.length + errorItems.length) / batchItems.length) * 100)
    : 0

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-400" />
          배치 생성
        </h1>
        {completedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={exportZip}
              className="btn-secondary flex items-center gap-2 text-sm py-2">
              <Download className="w-4 h-4" />
              전체 내보내기
            </button>
            <button onClick={() => setShowScheduleModal(true)}
              className="btn-primary flex items-center gap-2 text-sm py-2">
              <Calendar className="w-4 h-4" />
              전체 일정 자동배분
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* CSV Upload */}
          <div className="card">
            <div className="section-label">CSV 업로드</div>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-indigo-500/50"
              style={{ borderColor: '#2d2d4a' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">CSV 파일 드래그 또는 클릭</p>
              <p className="text-xs text-slate-600 mt-1">첫 번째 열에 키워드</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </div>

          {/* Manual Input */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="section-label">수동 입력</span>
              <span className="text-xs text-slate-600">
                {keywords.split('\n').filter(Boolean).length}/100
              </span>
            </div>
            <textarea
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder={'키워드를 한 줄에 하나씩 입력하세요\n다이어트 식단\n헬스 운동 루틴\n단백질 보충제 추천'}
              className="input-field text-sm resize-none h-40 font-mono"
            />
            <p className="text-xs text-slate-600 mt-1">최대 100개</p>
          </div>

          {/* Settings Summary */}
          <div className="card">
            <div className="section-label">배치 설정</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">플랫폼</span>
                <span className="text-slate-300">{settings.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">글자수</span>
                <span className="text-slate-300">{settings.wordCount.toLocaleString()}자</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">인간화</span>
                <span className="text-slate-300">{
                  settings.humanizationLevel === 'basic' ? '기본' :
                  settings.humanizationLevel === 'enhanced' ? '강화' : '최대'
                }</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">요청 간격</span>
                <span className="text-slate-300">15초</span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="space-y-2">
            {!isRunning ? (
              <button onClick={handleStart}
                disabled={!keywords.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                <Play className="w-4 h-4" />
                전체 생성 시작
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handlePauseResume}
                  className="btn-secondary flex items-center justify-center gap-2 py-2.5">
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {isPaused ? '재개' : '일시정지'}
                </button>
                <button onClick={handleCancel}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <X className="w-4 h-4" />
                  취소
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Queue Table */}
        <div className="lg:col-span-2">
          {batchItems.length > 0 ? (
            <div className="card">
              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">
                    {completedItems.length + errorItems.length} / {batchItems.length} 완료
                  </span>
                  <span className="text-sm font-medium text-indigo-400">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> {completedItems.length} 완료
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" /> {errorItems.length} 오류
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" /> {pendingItems.length} 대기
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b" style={{ borderColor: '#2d2d4a' }}>
                      <th className="text-left pb-2 w-8">#</th>
                      <th className="text-left pb-2">키워드</th>
                      <th className="text-left pb-2 w-20">상태</th>
                      <th className="text-left pb-2 w-20">AEO</th>
                      <th className="text-left pb-2 w-20">글자수</th>
                      <th className="text-left pb-2 w-20">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.map((item, i) => (
                      <React.Fragment key={item.id}>
                        <tr className={`border-b transition-colors ${expandedRows.has(item.id) ? 'bg-white/5' : 'hover:bg-white/3'}`}
                          style={{ borderColor: '#2d2d4a' }}>
                          <td className="py-3 text-slate-600">{i + 1}</td>
                          <td className="py-3">
                            <span className="text-slate-300 font-medium">{item.keyword}</span>
                          </td>
                          <td className="py-3">
                            {item.status === 'pending' && <span className="badge-gray">대기중</span>}
                            {item.status === 'running' && (
                              <span className="badge-blue flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> 처리중
                              </span>
                            )}
                            {item.status === 'done' && <span className="badge-green">완료</span>}
                            {item.status === 'error' && <span className="badge-red">오류</span>}
                          </td>
                          <td className="py-3">
                            {item.aeoScore !== undefined
                              ? <span className={getAEOScoreBadgeClass(item.aeoScore)}>{item.aeoScore}점</span>
                              : <span className="text-slate-600">-</span>
                            }
                          </td>
                          <td className="py-3 text-slate-500 text-xs">
                            {item.wordCount ? item.wordCount.toLocaleString() + '자' : '-'}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {item.status === 'done' && (
                                <button onClick={() => toggleRow(item.id)}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 p-1">
                                  {expandedRows.has(item.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              {item.status === 'error' && (
                                <button className="text-xs text-amber-400 hover:text-amber-300 p-1"
                                  title="재시도">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedRows.has(item.id) && item.content && (
                          <tr style={{ borderBottom: '1px solid #2d2d4a' }}>
                            <td colSpan={6} className="py-3 px-2">
                              <div className="bg-black/20 rounded-lg p-4 text-xs text-slate-400 font-mono max-h-40 overflow-y-auto leading-relaxed">
                                {item.content.substring(0, 500)}
                                {item.content.length > 500 && '...'}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <button onClick={() => {
                                  navigator.clipboard.writeText(item.content || '')
                                  toast.success('복사됨')
                                }} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> 복사
                                </button>
                                <button className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                                  <Send className="w-3 h-3" /> 발행
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card h-64 flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-500">키워드를 입력하고 생성을 시작하세요</p>
              <p className="text-xs text-slate-600 mt-1">한 번에 최대 100개 처리 가능</p>
            </div>
          )}
        </div>
      </div>

      {/* Auto Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setShowScheduleModal(false)}>
          <div className="card max-w-lg w-full space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                전체 일정 자동배분
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm text-indigo-300">
              <strong>{completedItems.length}개</strong> 글을 자동으로 스케줄에 배분합니다.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">시작 날짜</label>
                <input type="date" value={scheduleConfig.startDate}
                  onChange={e => setScheduleConfig(p => ({ ...p, startDate: e.target.value }))}
                  className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">발행 시간</label>
                <div className="flex gap-2">
                  <select value={scheduleConfig.hour}
                    onChange={e => setScheduleConfig(p => ({ ...p, hour: Number(e.target.value) }))}
                    className="input-field text-sm flex-1">
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select value={scheduleConfig.minute}
                    onChange={e => setScheduleConfig(p => ({ ...p, minute: Number(e.target.value) }))}
                    className="input-field text-sm flex-1">
                    {[0, 10, 20, 30, 40, 50].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">플랫폼</label>
                <select value={scheduleConfig.platform}
                  onChange={e => setScheduleConfig(p => ({ ...p, platform: e.target.value }))}
                  className="input-field text-sm">
                  {['네이버 블로그', '티스토리', '워드프레스'].map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">발행 간격</label>
                <select value={scheduleConfig.intervalDays}
                  onChange={e => setScheduleConfig(p => ({ ...p, intervalDays: Number(e.target.value) }))}
                  className="input-field text-sm">
                  <option value={1}>매일</option>
                  <option value={2}>2일마다</option>
                  <option value={3}>3일마다</option>
                  <option value={7}>주 1회</option>
                </select>
              </div>
            </div>

            <div className="bg-dark-card/50 rounded-lg p-3 text-xs text-slate-500">
              예상 마지막 발행일: {(() => {
                const end = new Date(scheduleConfig.startDate)
                end.setDate(end.getDate() + (completedItems.length - 1) * scheduleConfig.intervalDays)
                return end.toLocaleDateString('ko-KR')
              })()}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowScheduleModal(false)} className="btn-secondary flex-1 py-2.5">취소</button>
              <button onClick={handleAutoSchedule} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                배분 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
