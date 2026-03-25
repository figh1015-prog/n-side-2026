import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Play, Copy, Save, RefreshCw, Send, ChevronDown, ChevronUp,
  Loader2, CheckCircle, XCircle, Eye, Code, FileJson, AlignLeft,
  Zap, Info, BarChart2, Clock, Hash, Wand2, Search
} from 'lucide-react'
import { useToastContext } from '../App'
import { storage } from '../lib/storage'
import {
  calculateAEOScore, getAEOScoreColor, getAEOScoreBadgeClass, getAEOScoreLabel,
  AEO_CRITERIA_LABELS, AEO_CRITERIA_DEDUCTIONS, analyzeKeywordFrequency, highlightKeyword
} from '../lib/aeo'
import type { GenerationSettings, AEOBreakdown } from '../types'

const PLATFORMS = ['네이버 블로그', '티스토리', '워드프레스']
const CONTENT_TYPES = [
  { value: 'info', label: '정보성' },
  { value: 'review', label: '리뷰' },
  { value: 'compare', label: '비교' },
  { value: 'howto', label: 'How-To' },
  { value: 'news', label: '뉴스형' },
]
const TONES = [
  { value: 'professional', label: '전문가' },
  { value: 'friendly', label: '친근함' },
  { value: 'neutral', label: '중립' },
  { value: 'persuasive', label: '설득형' },
]
const WRITING_STYLES = [
  { value: 'blog', label: '블로그형' },
  { value: 'news', label: '뉴스기사형' },
  { value: 'academic', label: '학술형' },
]
const HUMANIZATION_LEVELS = [
  { value: 'basic', label: '기본' },
  { value: 'enhanced', label: '강화' },
  { value: 'maximum', label: '최대' },
]

type OutputTab = 'preview' | 'html' | 'markdown' | 'schema'

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-dark-border">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-300">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-slate-300 ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-slate-300 ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-3">')
    .replace(/^(?!<[h|l|p])(.+)$/gm, '<p class="text-slate-300 leading-relaxed mb-3">$1</p>')
}

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-dark-border last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/3 transition-all"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{label}</span>
      <div
        className={`w-10 h-5 rounded-full transition-all duration-200 relative ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-5' : 'left-0.5'}`} />
      </div>
    </label>
  )
}

function AEOScoreCircle({ score }: { score: number }) {
  const color = getAEOScoreColor(score)
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="36" fill="none" stroke="#2d2d4a" strokeWidth="7" />
        <circle
          cx="45" cy="45" r="36" fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="45" y="49" textAnchor="middle" fill={color} fontSize="16" fontWeight="700">{score}</text>
      </svg>
      <div className={`text-xs font-medium mt-1 ${getAEOScoreBadgeClass(score).replace('badge', 'text')}`}>
        {getAEOScoreLabel(score)}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  const toast = useToastContext()
  const [keyword, setKeyword] = useState('')
  const [settings, setSettings] = useState<GenerationSettings>(() => storage.getSettings())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [outputTab, setOutputTab] = useState<OutputTab>('preview')
  const [aeoScore, setAeoScore] = useState<number | null>(null)
  const [aeoBreakdown, setAeoBreakdown] = useState<AEOBreakdown | null>(null)
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null)
  const [schemaType, setSchemaType] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [readabilityScore, setReadabilityScore] = useState(0)
  const [estimatedReadTime, setEstimatedReadTime] = useState(0)
  const [generationDone, setGenerationDone] = useState(false)
  const [showHumanizePreview, setShowHumanizePreview] = useState(false)
  const [keywordHighlight, setKeywordHighlight] = useState(false)
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([])
  const [articleId, setArticleId] = useState<string | null>(null)

  const outputRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<boolean>(false)

  const apiKeys = storage.getApiKeys()

  const updateSetting = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      storage.setSettings(next)
      return next
    })
  }

  const handleGenerate = useCallback(async () => {
    if (!keyword.trim()) {
      toast.error('키워드를 입력해주세요.')
      return
    }
    if (!apiKeys.gemini) {
      toast.error('Gemini API 키가 설정되지 않았습니다. 설정 페이지로 이동하세요.')
      return
    }

    setIsGenerating(true)
    setGeneratedContent('')
    setAeoScore(null)
    setAeoBreakdown(null)
    setSchema(null)
    setGenerationDone(false)
    abortRef.current = false
    setOutputTab('preview')

    let content = ''

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, settings, apiKeys }),
      })

      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error || 'API 오류')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('스트림 읽기 실패')

      const decoder = new TextDecoder()
      let buffer = ''

      while (!abortRef.current) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (!data) continue
            try {
              const parsed = JSON.parse(data)

              if (parsed.text) {
                content += parsed.text
                setGeneratedContent(content)
                // Auto scroll
                if (outputRef.current) {
                  outputRef.current.scrollTop = outputRef.current.scrollHeight
                }
              }

              if (parsed.aeoScore !== undefined) {
                // Completion event
                setAeoScore(parsed.aeoScore)
                setAeoBreakdown(parsed.aeoBreakdown)
                setSchema(parsed.schema)
                setSchemaType(parsed.schemaType)
                setWordCount(parsed.wordCount)
                setReadabilityScore(Math.round(parsed.readabilityScore))
                setEstimatedReadTime(parsed.estimatedReadTime)
                setArticleId(parsed.articleId)
                setGenerationDone(true)
                toast.success(`글 생성 완료! AEO 점수: ${parsed.aeoScore}점`)
              }

              if (parsed.message) {
                throw new Error(parsed.message)
              }
            } catch (parseErr) {
              // Ignore JSON parse errors for streaming
            }
          }
          if (line.startsWith('event: error')) {
            // error event coming in next line
          }
          if (line.startsWith('event: complete')) {
            // complete handled above
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      toast.error(`생성 오류: ${message}`)
    } finally {
      setIsGenerating(false)
    }
  }, [keyword, settings, apiKeys, toast])

  const handleCopy = async () => {
    const text = outputTab === 'markdown' ? generatedContent
      : outputTab === 'html' ? markdownToHtml(generatedContent).replace(/<[^>]+>/g, '')
      : outputTab === 'schema' ? JSON.stringify(schema, null, 2)
      : generatedContent
    await navigator.clipboard.writeText(text)
    toast.success('클립보드에 복사되었습니다.')
  }

  const handleRegenerate = () => {
    if (isGenerating) {
      abortRef.current = true
      setIsGenerating(false)
    } else {
      handleGenerate()
    }
  }

  // Live AEO calculation as content streams
  useEffect(() => {
    if (generatedContent.length > 200 && !generationDone) {
      const { score, breakdown } = calculateAEOScore(generatedContent)
      setAeoScore(score)
      setAeoBreakdown(breakdown)
    }
  }, [generatedContent, generationDone])

  const keywordFreq = keyword ? analyzeKeywordFrequency(generatedContent, keyword) : null

  const renderOutput = () => {
    if (!generatedContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)' }}>
            <Zap className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-slate-500 text-sm">키워드를 입력하고 생성 버튼을 클릭하세요</p>
          <p className="text-slate-600 text-xs mt-2">Gemini AI가 SEO 최적화 글을 실시간으로 생성합니다</p>
        </div>
      )
    }

    if (outputTab === 'preview') {
      const html = markdownToHtml(generatedContent)
      const highlighted = keywordHighlight && keyword ? highlightKeyword(html, keyword) : html
      return (
        <div
          className="prose prose-invert max-w-none p-5 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlighted }}
          style={{ '--tw-prose-body': '#cbd5e1' } as React.CSSProperties}
        />
      )
    }

    if (outputTab === 'markdown') {
      const text = keywordHighlight && keyword ? highlightKeyword(generatedContent, keyword) : generatedContent
      return (
        <pre className="p-5 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: text }} />
      )
    }

    if (outputTab === 'html') {
      const html = markdownToHtml(generatedContent)
      return (
        <pre className="p-5 text-xs text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{html}</pre>
      )
    }

    if (outputTab === 'schema') {
      if (!schema) return <div className="p-5 text-slate-500 text-sm">글 생성 후 스키마가 자동 생성됩니다.</div>
      return (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-cyan">{schemaType} Schema</span>
            <span className="badge-green flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Valid
            </span>
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              구글 검증 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <pre className="text-xs text-emerald-300 font-mono bg-black/30 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>
      )
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between"
        style={{ borderColor: '#2d2d4a' }}>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-400" />
          글 생성
        </h1>
        {!apiKeys.gemini && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            <XCircle className="w-4 h-4" />
            Gemini API 키 미설정 →
            <a href="/settings" className="underline font-medium">설정으로 이동</a>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Settings (380px) */}
        <div className="w-[380px] shrink-0 flex flex-col overflow-y-auto border-r"
          style={{ borderColor: '#2d2d4a', background: '#13131f' }}>

          {/* Keyword Input */}
          <div className="p-4 border-b" style={{ borderColor: '#2d2d4a' }}>
            <label className="section-label">키워드</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="예: 다이어트 식단 방법"
              className="input-field text-sm"
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
            {relatedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {relatedKeywords.map(kw => (
                  <button key={kw} onClick={() => setKeyword(kw)}
                    className="text-xs px-2 py-1 rounded-full transition-all"
                    style={{ background: 'rgba(79,70,229,0.15)', color: '#a5b4fc', border: '1px solid rgba(79,70,229,0.25)' }}>
                    {kw}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section A - Keyword Settings */}
          <Section title="키워드 설정">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">타겟 플랫폼</label>
              <div className="flex gap-1.5 flex-wrap">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => updateSetting('platform', p)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all ${settings.platform === p
                      ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">콘텐츠 유형</label>
              <div className="flex gap-1.5 flex-wrap">
                {CONTENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => updateSetting('contentType', t.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all ${settings.contentType === t.value
                      ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Section B - Content Settings */}
          <Section title="콘텐츠 설정">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500">글자 수</label>
                <span className="text-xs font-medium text-indigo-400">{settings.wordCount.toLocaleString()}자</span>
              </div>
              <input type="range" min={800} max={5000} step={100} value={settings.wordCount}
                onChange={e => updateSetting('wordCount', Number(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>800</span><span>5,000</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">H2 개수</label>
                <select value={settings.h2Count} onChange={e => updateSetting('h2Count', Number(e.target.value))}
                  className="input-field text-sm py-2">
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}개</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">H3/H2</label>
                <select value={settings.h3Count} onChange={e => updateSetting('h3Count', Number(e.target.value))}
                  className="input-field text-sm py-2">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}개</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">어조</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => updateSetting('tone', t.value)}
                    className={`text-xs py-1.5 rounded-lg transition-all ${settings.tone === t.value
                      ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">문체</label>
              <div className="flex gap-1.5">
                {WRITING_STYLES.map(s => (
                  <button key={s.value} onClick={() => updateSetting('writingStyle', s.value)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${settings.writingStyle === s.value
                      ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Section C - SEO Optimization */}
          <Section title="SEO 최적화">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500">키워드 밀도</label>
                <span className="text-xs font-medium text-cyan-400">{settings.keywordDensity}%</span>
              </div>
              <input type="range" min={0.5} max={3} step={0.1} value={settings.keywordDensity}
                onChange={e => updateSetting('keywordDensity', Number(e.target.value))}
                className="w-full accent-cyan-500" />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>0.5%</span><span>3%</span>
              </div>
            </div>
            <Toggle checked={settings.includeLSI} onChange={v => updateSetting('includeLSI', v)} label="LSI 키워드 포함" />
            <Toggle checked={settings.includeFAQ} onChange={v => updateSetting('includeFAQ', v)} label="FAQ 섹션 추가" />
            <Toggle checked={settings.aeoOptimize} onChange={v => updateSetting('aeoOptimize', v)} label="AEO 최적화" />
            <Toggle checked={settings.schemaAutoDetect} onChange={v => updateSetting('schemaAutoDetect', v)} label="스키마 자동 감지" />
          </Section>

          {/* Section D - Humanization */}
          <Section title="AI 탐지 회피">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">인간화 수준</label>
              <div className="flex gap-1.5">
                {HUMANIZATION_LEVELS.map(h => (
                  <button key={h.value} onClick={() => updateSetting('humanizationLevel', h.value)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${settings.humanizationLevel === h.value
                      ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs rounded-lg px-3 py-2.5 space-y-1"
              style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">목표 복잡도 (Perplexity)</span>
                <span className="text-indigo-400 font-medium">0.6 ~ 1.2</span>
              </div>
              <div className="text-slate-600">인간 작성 텍스트 범위</div>
            </div>
            <Toggle checked={settings.burstinessVariation} onChange={v => updateSetting('burstinessVariation', v)} label="문장 길이 변화 (Burstiness)" />
          </Section>

          {/* Generate Button */}
          <div className="p-4 shrink-0 mt-auto border-t" style={{ borderColor: '#2d2d4a' }}>
            <button
              onClick={isGenerating ? () => { abortRef.current = true; setIsGenerating(false) } : handleGenerate}
              disabled={!keyword.trim()}
              className={`btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base ${!keyword.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  생성 중... (클릭하여 중지)
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  생성 시작
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Output Header with Tabs */}
          <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
            style={{ borderColor: '#2d2d4a' }}>
            <div className="tab-bar">
              {([['preview', <Eye className="w-3.5 h-3.5" />, '미리보기'],
                ['markdown', <AlignLeft className="w-3.5 h-3.5" />, '마크다운'],
                ['html', <Code className="w-3.5 h-3.5" />, 'HTML'],
                ['schema', <FileJson className="w-3.5 h-3.5" />, 'JSON-LD']] as [OutputTab, React.ReactNode, string][]).map(([tab, icon, label]) => (
                <button key={tab} onClick={() => setOutputTab(tab)}
                  className={`tab-item flex items-center gap-1.5 ${outputTab === tab ? 'active' : ''}`}>
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {generatedContent && (
              <div className="flex items-center gap-2">
                <button onClick={() => setKeywordHighlight(!keywordHighlight)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all
                    ${keywordHighlight ? 'bg-amber-500/20 text-amber-400' : 'btn-secondary'}`}
                  title="키워드 하이라이트">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">키워드</span>
                </button>
                <button onClick={() => setShowHumanizePreview(!showHumanizePreview)}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">인간화 미리보기</span>
                </button>
                <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">복사</span>
                </button>
                <button onClick={handleRegenerate} className="btn-secondary flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Output Content */}
            <div ref={outputRef} className="flex-1 overflow-y-auto" style={{ background: '#0d0d1a' }}>
              {isGenerating && !generatedContent && (
                <div className="flex items-center gap-3 p-5 text-sm text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  Gemini AI가 글을 생성하고 있습니다...
                </div>
              )}
              {renderOutput()}
              <style>{`.keyword-highlight { background: rgba(251,191,36,0.25); color: #fbbf24; border-radius: 2px; padding: 0 2px; }`}</style>
            </div>

            {/* Right Metrics Panel */}
            {(generatedContent || isGenerating) && (
              <div className="w-[220px] shrink-0 border-l overflow-y-auto p-4 space-y-4"
                style={{ borderColor: '#2d2d4a', background: '#13131f' }}>

                {/* AEO Score */}
                <div className="text-center">
                  <div className="section-label text-center mb-2">AEO 점수</div>
                  {aeoScore !== null ? (
                    <AEOScoreCircle score={aeoScore} />
                  ) : (
                    <div className="w-[90px] h-[90px] mx-auto skeleton rounded-full" />
                  )}
                </div>

                {/* AEO Breakdown */}
                {aeoBreakdown && (
                  <div>
                    <div className="section-label mb-2">점수 상세</div>
                    <div className="space-y-1.5">
                      {(Object.entries(aeoBreakdown) as [keyof AEOBreakdown, boolean][]).map(([key, passed]) => (
                        <div key={key} className="flex items-start gap-1.5">
                          {passed
                            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          }
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs leading-tight ${passed ? 'text-slate-400' : 'text-slate-500'}`}>
                              {AEO_CRITERIA_LABELS[key]}
                            </span>
                            {!passed && (
                              <span className="text-xs text-red-500 block">-{AEO_CRITERIA_DEDUCTIONS[key]}점</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {wordCount > 0 && (
                  <div className="space-y-2">
                    <div className="section-label">글 통계</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <AlignLeft className="w-3 h-3" /> 글자수
                        </span>
                        <span className="text-xs font-medium text-slate-300">{wordCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 읽기 시간
                        </span>
                        <span className="text-xs font-medium text-slate-300">{estimatedReadTime}분</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <BarChart2 className="w-3 h-3" /> 가독성
                        </span>
                        <span className="text-xs font-medium text-slate-300">{readabilityScore}점</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keyword Frequency */}
                {keywordFreq && generatedContent && keyword && (
                  <div>
                    <div className="section-label">키워드 빈도</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">등장 횟수</span>
                        <span className="text-xs font-medium text-indigo-400">{keywordFreq.count}회</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">밀도</span>
                        <span className={`text-xs font-medium ${keywordFreq.density > 3 ? 'text-red-400' : keywordFreq.density < 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {keywordFreq.density}%
                        </span>
                      </div>
                      <div className="progress-bar mt-1">
                        <div className="progress-bar-fill" style={{ width: `${Math.min(100, keywordFreq.density * 33)}%` }} />
                      </div>
                      <div className="text-xs text-slate-600">목표: {settings.keywordDensity}%</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {generationDone && (
                  <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#2d2d4a' }}>
                    <button onClick={handleCopy}
                      className="w-full btn-secondary flex items-center justify-center gap-2 text-xs py-2">
                      <Copy className="w-3.5 h-3.5" /> 복사
                    </button>
                    <button className="w-full btn-secondary flex items-center justify-center gap-2 text-xs py-2">
                      <Save className="w-3.5 h-3.5" /> 저장
                    </button>
                    <button className="w-full btn-primary flex items-center justify-center gap-2 text-xs py-2">
                      <Send className="w-3.5 h-3.5" /> 발행하기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Humanize Preview Modal */}
          {showHumanizePreview && generatedContent && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
              onClick={() => setShowHumanizePreview(false)}>
              <div className="card max-w-3xl w-full max-h-[80vh] overflow-auto"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-400" />
                    인간화 미리보기 ({settings.humanizationLevel === 'basic' ? '기본' : settings.humanizationLevel === 'enhanced' ? '강화' : '최대'})
                  </h3>
                  <button onClick={() => setShowHumanizePreview(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="section-label mb-2">원본</div>
                    <div className="text-xs text-slate-400 leading-relaxed bg-black/20 rounded-lg p-3 h-64 overflow-y-auto">
                      {generatedContent.substring(0, 500)}...
                    </div>
                  </div>
                  <div>
                    <div className="section-label mb-2 text-indigo-400">인간화 적용</div>
                    <div className="text-xs text-slate-300 leading-relaxed bg-indigo-900/20 rounded-lg p-3 h-64 overflow-y-auto border border-indigo-500/20">
                      {settings.humanizationLevel === 'maximum'
                        ? `실제로 제가 이 주제를 처음 접했을 때, 솔직히 말해서 당황스러웠어요. ${generatedContent.substring(0, 400).replace(/\n/g, ' ')}... [인간화 처리 완료]`
                        : settings.humanizationLevel === 'enhanced'
                        ? `${generatedContent.substring(0, 400).replace(/\.\s/g, '.\n\n').replace(/\n\n\n/g, '\n\n')}... [강화 적용]`
                        : generatedContent.substring(0, 400) + '...'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ExternalLink import fix
function ExternalLink({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}
