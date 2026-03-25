import type { AEOBreakdown } from '../types'

export function calculateAEOScore(content: string): { score: number; breakdown: AEOBreakdown } {
  const breakdown: AEOBreakdown = {
    questionHeadings: /##\s+.+[?？]/.test(content) || /###\s+.+[?？]/.test(content),
    answerInTop30: (() => {
      const top30 = content.substring(0, Math.floor(content.length * 0.3))
      return top30.replace(/[#*`]/g, '').trim().length > 150
    })(),
    tableOfContents: /목차|차례|Table of Contents/i.test(content),
    faqSection: /FAQ|자주 묻는 질문|Q:|A:/i.test(content),
    statistics: /\d+%|\d+억|\d+만|\d+천|연구|조사|통계|데이터|출처/.test(content),
    trustSignals: /작성자|출처|업데이트|날짜|저자|마지막|최신/.test(content),
    conversationalTone: /어떻게|왜|무엇|~까요|~습니다|~인지|하지만|그러나|또한/.test(content),
    entityMentions: content.split('\n').length > 15,
  }

  const deductions: Record<keyof AEOBreakdown, number> = {
    questionHeadings: 15,
    answerInTop30: 15,
    tableOfContents: 10,
    faqSection: 10,
    statistics: 8,
    trustSignals: 7,
    conversationalTone: 5,
    entityMentions: 5,
  }

  let score = 100
  for (const [key, passed] of Object.entries(breakdown)) {
    if (!passed) {
      score -= deductions[key as keyof AEOBreakdown]
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
  }
}

export function getAEOScoreColor(score: number): string {
  if (score >= 85) return '#10b981' // green
  if (score >= 70) return '#4F46E5' // blue
  if (score >= 40) return '#f59e0b' // yellow
  return '#ef4444' // red
}

export function getAEOScoreBadgeClass(score: number): string {
  if (score >= 85) return 'aeo-badge-green'
  if (score >= 70) return 'aeo-badge-blue'
  if (score >= 40) return 'aeo-badge-yellow'
  return 'aeo-badge-red'
}

export function getAEOScoreLabel(score: number): string {
  if (score >= 85) return '우수'
  if (score >= 70) return '양호'
  if (score >= 40) return '보통'
  return '개선 필요'
}

export const AEO_CRITERIA_LABELS: Record<keyof AEOBreakdown, string> = {
  questionHeadings: '질문형 H2/H3 제목',
  answerInTop30: '핵심 답변 상위 30% 포함',
  tableOfContents: '목차 섹션',
  faqSection: 'FAQ 섹션',
  statistics: '통계/데이터 인용',
  trustSignals: '신뢰 신호 (작성자/날짜/출처)',
  conversationalTone: '대화형 어조',
  entityMentions: '충분한 콘텐츠 분량',
}

export const AEO_CRITERIA_DEDUCTIONS: Record<keyof AEOBreakdown, number> = {
  questionHeadings: 15,
  answerInTop30: 15,
  tableOfContents: 10,
  faqSection: 10,
  statistics: 8,
  trustSignals: 7,
  conversationalTone: 5,
  entityMentions: 5,
}

export function analyzeKeywordFrequency(content: string, keyword: string): {
  count: number
  density: number
  positions: number[]
} {
  const text = content.replace(/[#*`]/g, '').replace(/\n/g, ' ')
  const totalChars = text.length
  const words = text.split(/\s+/).filter(w => w.length > 0)
  
  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const matches = Array.from(text.matchAll(regex))
  
  const count = matches.length
  const density = totalChars > 0 ? (count * keyword.length / totalChars) * 100 : 0
  const positions = matches.map(m => m.index || 0)

  return { count, density: Math.round(density * 100) / 100, positions }
}

export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="keyword-highlight">$1</mark>')
}
