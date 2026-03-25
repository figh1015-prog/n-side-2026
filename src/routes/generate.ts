import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'

type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
}

export const generateRoute = new Hono<{ Bindings: Bindings }>()

// AEO Score calculation
function calculateAEOScore(content: string): { score: number; breakdown: Record<string, boolean> } {
  const breakdown: Record<string, boolean> = {
    questionHeadings: /##\s+.+[?？]/.test(content) || /###\s+.+[?？]/.test(content),
    answerInTop30: content.length > 0 && content.substring(0, content.length * 0.3).length > 100,
    tableOfContents: /목차|차례|Table of Contents/i.test(content),
    faqSection: /FAQ|자주 묻는 질문|Q:|A:/i.test(content),
    statistics: /\d+%|\d+억|\d+만|\d+천|연구|조사|통계|데이터/.test(content),
    trustSignals: /작성자|출처|업데이트|날짜|저자/.test(content),
    conversationalTone: /어떻게|왜|무엇|~까요|~습니다|~인지/.test(content),
    entityMentions: /네이버|구글|카카오|삼성|현대/.test(content) || content.split('\n').length > 10,
  }

  let score = 100
  if (!breakdown.questionHeadings) score -= 15
  if (!breakdown.answerInTop30) score -= 15
  if (!breakdown.tableOfContents) score -= 10
  if (!breakdown.faqSection) score -= 10
  if (!breakdown.statistics) score -= 8
  if (!breakdown.trustSignals) score -= 7
  if (!breakdown.conversationalTone) score -= 5
  if (!breakdown.entityMentions) score -= 5

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}

// Auto detect schema type
function detectSchemaType(content: string, contentType: string): string {
  if (/\d+단계|\d+\. |Step \d+/i.test(content)) return 'HowTo'
  if (/Q:|A:|자주 묻는|FAQ/i.test(content)) return 'FAQ'
  if (/별점|평점|리뷰|후기|★|☆/i.test(content)) return 'Review'
  if (contentType === 'howto') return 'HowTo'
  if (contentType === 'review') return 'Review'
  return 'Article'
}

// Generate JSON-LD Schema
function generateSchema(content: string, keyword: string, schemaType: string): object {
  const title = content.split('\n')[0].replace(/^#+\s*/, '') || keyword
  const description = content.substring(0, 200).replace(/[#*]/g, '').trim()
  const datePublished = new Date().toISOString()

  const baseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: title,
    description: description,
    datePublished: datePublished,
    dateModified: datePublished,
    author: {
      '@type': 'Person',
      name: 'N-Side Pro',
    },
    publisher: {
      '@type': 'Organization',
      name: 'N-Side Pro',
    },
  }

  if (schemaType === 'HowTo') {
    const steps = content.match(/\d+\.\s+.+/g) || []
    baseSchema['step'] = steps.slice(0, 10).map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step.replace(/^\d+\.\s+/, ''),
    }))
  }

  if (schemaType === 'FAQ') {
    const faqMatches = content.matchAll(/Q[:.]\s*(.+)\n+A[:.]\s*(.+)/g)
    const faqs = Array.from(faqMatches).slice(0, 5)
    if (faqs.length > 0) {
      baseSchema['@type'] = 'FAQPage'
      baseSchema['mainEntity'] = faqs.map(match => ({
        '@type': 'Question',
        name: match[1],
        acceptedAnswer: {
          '@type': 'Answer',
          text: match[2],
        },
      }))
    }
  }

  return {
    mainSchema: baseSchema,
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: 'https://example.com' },
        { '@type': 'ListItem', position: 2, name: keyword, item: `https://example.com/${encodeURIComponent(keyword)}` },
      ],
    },
  }
}

// Build prompt for Gemini
function buildPrompt(params: {
  keyword: string
  platform: string
  contentType: string
  wordCount: number
  h2Count: number
  h3Count: number
  tone: string
  writingStyle: string
  keywordDensity: number
  includeLSI: boolean
  includeFAQ: boolean
  aeoOptimize: boolean
  humanizationLevel: string
}): string {
  const toneMap: Record<string, string> = {
    professional: '전문적이고 권위있는',
    friendly: '친근하고 따뜻한',
    neutral: '중립적이고 객관적인',
    persuasive: '설득력 있는',
  }
  const styleMap: Record<string, string> = {
    blog: '블로그형',
    news: '뉴스기사형',
    academic: '학술형',
  }
  const contentTypeMap: Record<string, string> = {
    info: '정보성',
    review: '리뷰',
    compare: '비교',
    howto: 'How-To 가이드',
    news: '뉴스형',
  }

  let prompt = `당신은 한국어 SEO 전문 블로그 작가입니다. 다음 요구사항에 맞는 고품질 블로그 글을 작성해주세요.

## 작성 요구사항
- **주제 키워드**: ${params.keyword}
- **플랫폼**: ${params.platform}
- **콘텐츠 유형**: ${contentTypeMap[params.contentType] || params.contentType}
- **목표 글자수**: 약 ${params.wordCount}자
- **어조**: ${toneMap[params.tone] || params.tone}
- **문체**: ${styleMap[params.writingStyle] || params.writingStyle}

## 구조 요구사항
- H2 제목: ${params.h2Count}개
- H2당 H3 소제목: ${params.h3Count}개
- 키워드 밀도: ${params.keywordDensity}%

## SEO 최적화 요구사항
${params.includeLSI ? '- LSI 키워드(관련 의미 키워드)를 자연스럽게 포함' : ''}
${params.includeFAQ ? `- 글 하단에 FAQ 섹션 추가 (Q: A: 형식으로 5개 질문)` : ''}
${params.aeoOptimize ? `- AEO(Answer Engine Optimization) 최적화:
  * 상위 30% 이내에 핵심 답변 포함
  * 질문형 H2 제목 사용 (?로 끝나는 제목)
  * 목차 섹션 포함
  * 통계/데이터 인용 포함` : ''}

${params.humanizationLevel === 'enhanced' ? `## 인간화 설정 (강화)
- 짧은 문장(5-7단어)과 긴 문장(20-30단어)을 교차 사용
- 1인칭 표현 자연스럽게 포함
- 개인적 경험 문구 추가` : ''}
${params.humanizationLevel === 'maximum' ? `## 인간화 설정 (최대)
- 개인적 경험과 감상을 포함
- 구체적인 날짜와 숫자 삽입
- 구어체 표현 자연스럽게 사용
- 문단 길이를 1-5문장으로 불규칙하게 변경` : ''}

## 출력 형식
마크다운 형식으로 작성하세요. 제목은 # 기호를 사용하세요.
블로그 글 전체를 완성해주세요. 중간에 끊지 마세요.

이제 "${params.keyword}"에 관한 완성된 블로그 글을 작성해주세요:`

  return prompt
}

// POST /api/generate — SSE streaming generation
generateRoute.post('/', async (c) => {
  const body = await c.req.json()
  const { keyword, settings, apiKeys } = body

  if (!keyword) {
    return c.json({ error: '키워드가 필요합니다.' }, 400)
  }

  const geminiKey = apiKeys?.gemini || apiKeys?.geminiKey
  if (!geminiKey) {
    return c.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, 400)
  }

  const prompt = buildPrompt({
    keyword,
    platform: settings?.platform || '네이버 블로그',
    contentType: settings?.contentType || 'info',
    wordCount: settings?.wordCount || 2000,
    h2Count: settings?.h2Count || 4,
    h3Count: settings?.h3Count || 2,
    tone: settings?.tone || 'professional',
    writingStyle: settings?.writingStyle || 'blog',
    keywordDensity: settings?.keywordDensity || 1.5,
    includeLSI: settings?.includeLSI !== false,
    includeFAQ: settings?.includeFAQ !== false,
    aeoOptimize: settings?.aeoOptimize !== false,
    humanizationLevel: settings?.humanizationLevel || 'basic',
  })

  return streamSSE(c, async (stream) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: settings?.humanizationLevel === 'maximum' ? 1.0 : 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: `Gemini API 오류: ${errText}` }) })
        return
      }

      let fullContent = ''
      const reader = response.body?.getReader()
      if (!reader) {
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: '스트림을 읽을 수 없습니다.' }) })
        return
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
              if (text) {
                fullContent += text
                await stream.writeSSE({ event: 'chunk', data: JSON.stringify({ text }) })
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }

      // Calculate AEO score after generation
      const { score: aeoScore, breakdown } = calculateAEOScore(fullContent)
      const schemaType = detectSchemaType(fullContent, settings?.contentType || 'info')
      const schema = generateSchema(fullContent, keyword, schemaType)

      // Word count
      const wordCount = fullContent.replace(/[#*`]/g, '').length

      // Readability (simple Flesch-Kincaid approximation for Korean)
      const sentences = fullContent.split(/[.!?。！？]/).filter(s => s.trim().length > 0)
      const avgSentenceLen = wordCount / Math.max(sentences.length, 1)
      const readabilityScore = Math.max(0, Math.min(100, 100 - (avgSentenceLen - 20) * 2))

      // Save to D1 if available
      const articleId = crypto.randomUUID()
      try {
        if (c.env?.DB) {
          await c.env.DB.prepare(
            `INSERT INTO articles (id, keyword, platform, content, schema_json, word_count, aeo_score, readability_score, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
          ).bind(
            articleId,
            keyword,
            settings?.platform || '네이버 블로그',
            fullContent,
            JSON.stringify(schema),
            wordCount,
            aeoScore,
            readabilityScore
          ).run()
        }
      } catch (dbErr) {
        console.error('DB save error:', dbErr)
      }

      // Send completion event
      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({
          articleId,
          aeoScore,
          aeoBreakdown: breakdown,
          schema,
          schemaType,
          wordCount,
          readabilityScore,
          estimatedReadTime: Math.ceil(wordCount / 400),
        }),
      })
    } catch (error) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }),
      })
    }
  })
})

export default generateRoute
