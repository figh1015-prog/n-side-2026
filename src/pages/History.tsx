import React, { useState, useEffect, useCallback } from 'react'
import {
  History, Search, Filter, Download, Trash2, Eye, Copy,
  Send, Edit3, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FileText, Calendar, BarChart2
} from 'lucide-react'
import { useToastContext } from '../App'
import { getAEOScoreBadgeClass } from '../lib/aeo'
import type { Article } from '../types'

// Mock data
const generateMockArticles = (): Article[] => {
  const keywords = [
    '다이어트 식단 완전 가이드', '헬스 운동 루틴', '단백질 보충제 비교',
    '오메가3 효능과 복용법', '저탄고지 식단 시작하기', '마그네슘 결핍 증상',
    '비타민D 보충 방법', '간헐적 단식 완전 가이드', '근육 증가 식단',
    '체지방 감소 운동', 'HIIT 운동 효과', '채식 단백질 공급원',
    '수면 개선 방법', '스트레스 해소법', '면역력 높이는 방법',
    '혈당 조절 식품', '콜레스테롤 낮추는 음식', '항산화 식품 종류',
    '장 건강 개선법', '두피 건강 관리',
  ]
  const platforms = ['네이버 블로그', '티스토리', '워드프레스']
  const statuses: Article['status'][] = ['draft', 'published', 'scheduled', 'error']

  return keywords.map((kw, i) => ({
    id: crypto.randomUUID(),
    keyword: kw,
    platform: platforms[i % 3],
    word_count: Math.floor(Math.random() * 3000) + 800,
    aeo_score: Math.floor(Math.random() * 60) + 40,
    readability_score: Math.random() * 30 + 60,
    status: statuses[i % 4],
    created_at: new Date(Date.now() - i * 86400000 * 1.5).toISOString(),
    published_at: i % 4 === 1 ? new Date(Date.now() - i * 86400000).toISOString() : undefined,
  }))
}

const MOCK_ARTICLES = generateMockArticles()

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  published: '발행됨',
  scheduled: '예약됨',
  error: '오류',
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: 'badge-gray',
  published: 'badge-green',
  scheduled: 'badge-blue',
  error: 'badge-red',
}

export default function HistoryPage() {
  const toast = useToastContext()
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES)
  const [filtered, setFiltered] = useState<Article[]>(MOCK_ARTICLES)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAeoMin, setFilterAeoMin] = useState('')
  const [filterAeoMax, setFilterAeoMax] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const PER_PAGE = 20

  const applyFilters = useCallback(() => {
    let result = [...articles]
    if (search) result = result.filter(a => a.keyword.includes(search))
    if (filterPlatform) result = result.filter(a => a.platform === filterPlatform)
    if (filterStatus) result = result.filter(a => a.status === filterStatus)
    if (filterAeoMin) result = result.filter(a => a.aeo_score >= Number(filterAeoMin))
    if (filterAeoMax) result = result.filter(a => a.aeo_score <= Number(filterAeoMax))
    setFiltered(result)
    setPage(1)
  }, [articles, search, filterPlatform, filterStatus, filterAeoMin, filterAeoMax])

  useEffect(() => { applyFilters() }, [applyFilters])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paginated.map(a => a.id)))
    }
  }

  const deleteSelected = () => {
    setArticles(prev => prev.filter(a => !selected.has(a.id)))
    setSelected(new Set())
    toast.success(`${selected.size}개 삭제됨`)
  }

  const exportCSV = () => {
    const rows = [
      ['날짜', '키워드', '플랫폼', '글자수', 'AEO점수', '상태'],
      ...filtered.map(a => [
        new Date(a.created_at).toLocaleDateString('ko-KR'),
        a.keyword,
        a.platform,
        a.word_count,
        a.aeo_score,
        STATUS_LABELS[a.status],
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('CSV 내보내기 완료')
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          생성 히스토리
        </h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={deleteSelected}
              className="flex items-center gap-2 text-sm py-2 px-4 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Trash2 className="w-4 h-4" />
              {selected.size}개 삭제
            </button>
          )}
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Download className="w-4 h-4" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '전체', value: articles.length, color: '#4F46E5', icon: <FileText className="w-4 h-4" /> },
          { label: '발행됨', value: articles.filter(a => a.status === 'published').length, color: '#10b981', icon: <Send className="w-4 h-4" /> },
          { label: '초안', value: articles.filter(a => a.status === 'draft').length, color: '#94a3b8', icon: <Edit3 className="w-4 h-4" /> },
          { label: '평균 AEO', value: Math.round(articles.reduce((s, a) => s + a.aeo_score, 0) / articles.length) + '점', color: '#f59e0b', icon: <BarChart2 className="w-4 h-4" /> },
        ].map(stat => (
          <div key={stat.label} className="card py-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="키워드 검색..."
              className="input-field text-sm pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 text-sm py-2 ${showFilters ? 'border-indigo-500 text-indigo-400' : ''}`}
          >
            <Filter className="w-4 h-4" />
            필터
            {(filterPlatform || filterStatus || filterAeoMin || filterAeoMax) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 ml-1" />
            )}
          </button>
          <span className="text-xs text-slate-500">{filtered.length}개 결과</span>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: '#2d2d4a' }}>
            <div>
              <label className="text-xs text-slate-500 block mb-1">플랫폼</label>
              <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                className="input-field text-sm py-2">
                <option value="">전체</option>
                {['네이버 블로그', '티스토리', '워드프레스'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">상태</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="input-field text-sm py-2">
                <option value="">전체</option>
                {['draft', 'published', 'scheduled', 'error'].map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">AEO 최소</label>
              <input type="number" min={0} max={100} value={filterAeoMin}
                onChange={e => setFilterAeoMin(e.target.value)}
                className="input-field text-sm py-2" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">AEO 최대</label>
              <input type="number" min={0} max={100} value={filterAeoMax}
                onChange={e => setFilterAeoMax(e.target.value)}
                className="input-field text-sm py-2" placeholder="100" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b" style={{ borderColor: '#2d2d4a' }}>
              <th className="pb-3 pr-3 text-left w-8">
                <input type="checkbox"
                  checked={selected.size === paginated.length && paginated.length > 0}
                  onChange={selectAll}
                  className="accent-indigo-500 w-4 h-4 cursor-pointer" />
              </th>
              <th className="pb-3 text-left">날짜</th>
              <th className="pb-3 text-left">키워드</th>
              <th className="pb-3 text-left hidden md:table-cell">플랫폼</th>
              <th className="pb-3 text-left hidden sm:table-cell">글자수</th>
              <th className="pb-3 text-left">AEO</th>
              <th className="pb-3 text-left">상태</th>
              <th className="pb-3 text-left">액션</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(article => (
              <React.Fragment key={article.id}>
                <tr
                  className={`border-b transition-colors cursor-pointer
                    ${expandedId === article.id ? 'bg-white/5' : 'hover:bg-white/3'}
                    ${selected.has(article.id) ? 'bg-indigo-500/5' : ''}`}
                  style={{ borderColor: '#2d2d4a' }}
                >
                  <td className="py-3 pr-3" onClick={e => { e.stopPropagation(); toggleSelect(article.id) }}>
                    <input type="checkbox" checked={selected.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(article.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                  </td>
                  <td className="py-3" onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}>
                    <div className="font-medium text-slate-300 max-w-[200px] truncate">{article.keyword}</div>
                  </td>
                  <td className="py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-500">{article.platform}</span>
                  </td>
                  <td className="py-3 text-slate-500 text-xs hidden sm:table-cell">
                    {article.word_count.toLocaleString()}자
                  </td>
                  <td className="py-3">
                    <span className={getAEOScoreBadgeClass(article.aeo_score)}>
                      {article.aeo_score}점
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={STATUS_BADGE_CLASSES[article.status] || 'badge-gray'}>
                      {STATUS_LABELS[article.status]}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                        className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
                        title="미리보기"
                      >
                        {expandedId === article.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <Eye className="w-4 h-4" />
                        }
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(article.keyword); toast.success('복사됨') }}
                        className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
                        title="복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setArticles(prev => prev.filter(a => a.id !== article.id))
                          toast.success('삭제됨')
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {article.status === 'draft' && (
                        <button
                          onClick={() => {
                            setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'published' as const } : a))
                            toast.success('발행됨')
                          }}
                          className="text-slate-500 hover:text-emerald-400 p-1 transition-colors"
                          title="발행"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedId === article.id && (
                  <tr style={{ borderBottom: '1px solid #2d2d4a' }}>
                    <td colSpan={8} className="py-4 px-3">
                      <div className="space-y-3">
                        {/* Meta info */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            생성: {new Date(article.created_at).toLocaleString('ko-KR')}
                          </span>
                          {article.published_at && (
                            <span className="flex items-center gap-1">
                              <Send className="w-3 h-3" />
                              발행: {new Date(article.published_at).toLocaleString('ko-KR')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <BarChart2 className="w-3 h-3" />
                            가독성: {article.readability_score ? Math.round(article.readability_score) : '-'}점
                          </span>
                        </div>

                        {/* Content preview */}
                        <div className="bg-black/20 rounded-lg p-4 text-xs text-slate-400 font-mono leading-relaxed max-h-32 overflow-y-auto">
                          {article.keyword}에 관한 글이 여기에 표시됩니다. (콘텐츠 미리보기)
                          <br /><br />
                          플랫폼: {article.platform} | 글자수: {article.word_count.toLocaleString()}자 | AEO: {article.aeo_score}점
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                            <Edit3 className="w-3.5 h-3.5" /> 재편집
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(article.keyword); toast.success('복사됨') }}
                            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                          >
                            <Copy className="w-3.5 h-3.5" /> 복사
                          </button>
                          {article.status !== 'published' && (
                            <button
                              onClick={() => {
                                setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: 'published' as const } : a))
                                toast.success('발행됨')
                              }}
                              className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
                            >
                              <Send className="w-3.5 h-3.5" /> 발행
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setArticles(prev => prev.filter(a => a.id !== article.id))
                              setExpandedId(null)
                              toast.success('삭제됨')
                            }}
                            className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all ml-auto"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {paginated.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {(page - 1) * PER_PAGE + 1} - {Math.min(page * PER_PAGE, filtered.length)} / {filtered.length}개
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary p-2 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page - 2 + i
              if (pg > totalPages) return null
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                    ${pg === page ? 'bg-indigo-600 text-white' : 'btn-secondary'}`}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary p-2 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
