import React, { useState } from 'react'
import {
  Link2, Send, CheckCircle, AlertCircle, Loader2,
  FileJson, Copy, ExternalLink, Gauge, Plus, Trash2
} from 'lucide-react'
import { useToastContext } from '../App'
import { storage } from '../lib/storage'

interface SubmissionLog {
  url: string
  status: 'success' | 'failed'
  time: string
}

export default function IndexingPage() {
  const toast = useToastContext()
  const [activeSection, setActiveSection] = useState<'indexnow' | 'schema' | 'meta' | 'vitals'>('indexnow')
  const [urls, setUrls] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [logs, setLogs] = useState<SubmissionLog[]>([])
  const [schemaContent, setSchemaContent] = useState('')
  const [generatedSchema, setGeneratedSchema] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaFirstPara, setMetaFirstPara] = useState('')
  const [metaResults, setMetaResults] = useState<{ titles: string[]; descriptions: string[] } | null>(null)
  const [vitalsUrl, setVitalsUrl] = useState('')
  const [vitalsResult, setVitalsResult] = useState<{ lcp: number; inp: number; cls: number; score: number } | null>(null)
  const [vitalsChecking, setVitalsChecking] = useState(false)

  const apiKeys = storage.getApiKeys()

  const handleSubmit = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean)
    if (urlList.length === 0) { toast.error('URL을 입력하세요.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/indexing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList, apiKey: apiKeys.indexNowKey, host: 'example.com' }),
      })
      const data = await res.json() as { submitted?: number; results?: { url: string; status: string }[] }
      const newLogs: SubmissionLog[] = (data.results || []).map((r: { url: string; status: string }) => ({
        url: r.url, status: r.status as 'success' | 'failed', time: new Date().toLocaleTimeString('ko-KR')
      }))
      setLogs(prev => [...newLogs, ...prev].slice(0, 100))
      toast.success(`${data.submitted || 0}개 URL 제출 완료`)
    } catch {
      toast.error('제출 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const generateSchema = async () => {
    if (!schemaContent.trim()) { toast.error('콘텐츠를 입력하세요.'); return }
    const res = await fetch('/api/schema/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: schemaContent }),
    })
    const data = await res.json() as { mainSchema?: object }
    setGeneratedSchema(JSON.stringify(data.mainSchema || data, null, 2))
    toast.success('스키마 생성됨')
  }

  const generateMeta = () => {
    if (!metaTitle) { toast.error('제목을 입력하세요.'); return }
    const titles = [
      metaTitle.substring(0, 60),
      `${metaTitle} | 완전 가이드 2026`.substring(0, 60),
      `${metaTitle} - 전문가 추천`.substring(0, 60),
    ]
    const desc = metaFirstPara || `${metaTitle}에 대한 완전한 정보를 제공합니다. 전문가가 검증한 내용으로 실용적인 팁과 최신 정보를 확인하세요.`
    const descriptions = [
      desc.substring(0, 155) + (desc.length > 155 ? '...' : ''),
      `${metaTitle}의 핵심 정보를 알아보세요. ${desc.substring(0, 100)}...`.substring(0, 155),
      `2026년 최신 정보: ${metaTitle}. ${desc.substring(0, 80)}...`.substring(0, 155),
    ]
    setMetaResults({ titles, descriptions })
    toast.success('메타 태그 생성됨')
  }

  const checkVitals = async () => {
    if (!vitalsUrl) { toast.error('URL을 입력하세요.'); return }
    setVitalsChecking(true)
    try {
      const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(vitalsUrl)}&apiKey=${apiKeys.pageSpeedKey || ''}`)
      const data = await res.json() as { lcp?: { value: number }; inp?: { value: number }; cls?: { value: number }; overallScore?: number }
      setVitalsResult({
        lcp: data.lcp?.value || 0,
        inp: data.inp?.value || 0,
        cls: data.cls?.value || 0,
        score: data.overallScore || 0,
      })
    } catch {
      toast.error('Core Web Vitals 확인 실패')
    } finally {
      setVitalsChecking(false)
    }
  }

  const sections = [
    { id: 'indexnow', label: 'IndexNow 제출' },
    { id: 'schema', label: '스키마 생성기' },
    { id: 'meta', label: '메타 태그' },
    { id: 'vitals', label: 'Core Web Vitals' },
  ]

  const getVitalStatus = (metric: string, value: number) => {
    if (metric === 'lcp') return value <= 2.5 ? 'good' : value <= 4 ? 'fair' : 'poor'
    if (metric === 'inp') return value <= 200 ? 'good' : value <= 500 ? 'fair' : 'poor'
    if (metric === 'cls') return value <= 0.1 ? 'good' : value <= 0.25 ? 'fair' : 'poor'
    return 'good'
  }

  const vitalColors = { good: '#10b981', fair: '#f59e0b', poor: '#ef4444' }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Link2 className="w-5 h-5 text-indigo-400" />
        인덱싱 & 기술 SEO
      </h1>

      <div className="tab-bar w-fit flex-wrap">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as typeof activeSection)}
            className={`tab-item ${activeSection === s.id ? 'active' : ''}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* IndexNow Submitter */}
      {activeSection === 'indexnow' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card">
              <div className="section-label mb-3">URL 입력</div>
              <textarea
                value={urls}
                onChange={e => setUrls(e.target.value)}
                placeholder={'https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3'}
                className="input-field text-sm resize-none h-36 font-mono"
              />
              <p className="text-xs text-slate-600 mt-1">한 줄에 하나씩, 최대 10,000개</p>
              <button onClick={handleSubmit} disabled={submitting || !urls.trim()}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2 py-3">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? '제출 중...' : '즉시 제출 (Bing + Naver)'}
              </button>
            </div>

            {!apiKeys.indexNowKey && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                IndexNow API 키가 없습니다 → <a href="/settings" className="underline">설정에서 추가</a>
              </div>
            )}
          </div>

          {/* Submission Log */}
          <div className="card">
            <div className="section-label mb-3">제출 기록</div>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">제출 기록이 없습니다.</div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b" style={{ borderColor: '#2d2d4a' }}>
                    {log.status === 'success'
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    }
                    <span className="flex-1 truncate text-slate-400">{log.url}</span>
                    <span className="text-slate-600 shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schema Generator */}
      {activeSection === 'schema' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <div className="section-label">콘텐츠 입력</div>
            <textarea value={schemaContent} onChange={e => setSchemaContent(e.target.value)}
              placeholder="글 내용을 붙여넣거나 저장된 글을 선택하세요..."
              className="input-field text-sm resize-none h-48" />
            <button onClick={generateSchema} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              <FileJson className="w-4 h-4" />
              JSON-LD 스키마 생성
            </button>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="section-label">생성된 스키마</div>
              {generatedSchema && (
                <div className="flex items-center gap-2">
                  <span className="badge-green flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3 h-3" /> Valid
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(generatedSchema); toast.success('복사됨') }}
                    className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> 복사
                  </button>
                  <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> 구글 검증
                  </a>
                </div>
              )}
            </div>
            {generatedSchema ? (
              <pre className="text-xs text-emerald-300 font-mono bg-black/30 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                {generatedSchema}
              </pre>
            ) : (
              <div className="text-center py-12 text-slate-600 text-sm">생성된 스키마가 여기에 표시됩니다.</div>
            )}
          </div>
        </div>
      )}

      {/* Meta Generator */}
      {activeSection === 'meta' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <div className="section-label">메타 태그 입력</div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">글 제목</label>
              <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
                placeholder="예: 다이어트 식단 완전 정복 가이드"
                className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">첫 문단 (선택)</label>
              <textarea value={metaFirstPara} onChange={e => setMetaFirstPara(e.target.value)}
                placeholder="첫 문단을 입력하면 더 정확한 설명이 생성됩니다..."
                className="input-field text-sm resize-none h-24" />
            </div>
            <button onClick={generateMeta} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              생성하기 (3가지 버전)
            </button>
          </div>

          {metaResults && (
            <div className="card space-y-4">
              <div>
                <div className="section-label mb-2">메타 제목 (3가지)</div>
                {metaResults.titles.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2 p-3 rounded-lg" style={{ background: '#13131f', border: '1px solid #2d2d4a' }}>
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">{t}</p>
                      <p className={`text-xs mt-1 ${t.length > 60 ? 'text-red-400' : 'text-emerald-400'}`}>{t.length}자</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(t); toast.success('복사됨') }}
                      className="text-slate-500 hover:text-slate-300 p-1 shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <div className="section-label mb-2">메타 설명 (3가지)</div>
                {metaResults.descriptions.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2 p-3 rounded-lg" style={{ background: '#13131f', border: '1px solid #2d2d4a' }}>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 leading-relaxed">{d}</p>
                      <p className={`text-xs mt-1 ${d.length > 160 ? 'text-red-400' : 'text-emerald-400'}`}>{d.length}자</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(d); toast.success('복사됨') }}
                      className="text-slate-500 hover:text-slate-300 p-1 shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Core Web Vitals */}
      {activeSection === 'vitals' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex gap-3">
              <input type="url" value={vitalsUrl} onChange={e => setVitalsUrl(e.target.value)}
                placeholder="https://example.com"
                className="input-field text-sm flex-1" />
              <button onClick={checkVitals} disabled={vitalsChecking}
                className="btn-primary flex items-center gap-2 px-5">
                {vitalsChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
                검사
              </button>
            </div>
            {!apiKeys.pageSpeedKey && (
              <p className="text-xs text-amber-400 mt-2">PageSpeed API 키 없음 - 샘플 데이터 표시</p>
            )}
          </div>

          {vitalsResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'LCP', value: `${vitalsResult.lcp.toFixed(1)}s`, metric: 'lcp', numVal: vitalsResult.lcp, desc: '최대 콘텐츠풀 페인트' },
                { label: 'INP', value: `${vitalsResult.inp}ms`, metric: 'inp', numVal: vitalsResult.inp, desc: '다음 페인트 상호작용' },
                { label: 'CLS', value: vitalsResult.cls.toFixed(3), metric: 'cls', numVal: vitalsResult.cls, desc: '누적 레이아웃 이동' },
              ].map(item => {
                const status = getVitalStatus(item.metric, item.numVal)
                const color = vitalColors[status]
                return (
                  <div key={item.label} className="card text-center">
                    <div className="text-xs text-slate-500 mb-2">{item.desc}</div>
                    <div className="text-3xl font-bold mb-1" style={{ color }}>{item.value}</div>
                    <div className="text-sm font-semibold" style={{ color }}>{item.label}</div>
                    <div className={`badge mt-2 mx-auto ${status === 'good' ? 'badge-green' : status === 'fair' ? 'badge-yellow' : 'badge-red'}`}>
                      {status === 'good' ? '양호' : status === 'fair' ? '개선 필요' : '불량'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
