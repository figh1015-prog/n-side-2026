import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const schemaRoute = new Hono<{ Bindings: Bindings }>()

function detectType(content: string, hint?: string): string {
  if (hint === 'howto' || /\d+단계|\d+\. |Step \d+/i.test(content)) return 'HowTo'
  if (hint === 'faq' || /Q:|A:|자주 묻는|FAQ/i.test(content)) return 'FAQ'
  if (hint === 'review' || /별점|평점|리뷰|후기|★/i.test(content)) return 'Review'
  return 'Article'
}

schemaRoute.post('/generate', async (c) => {
  const { content, contentType, keyword, articleTitle } = await c.req.json()
  if (!content) return c.json({ error: '콘텐츠가 필요합니다.' }, 400)

  const schemaType = detectType(content, contentType)
  const title = articleTitle || content.split('\n')[0].replace(/^#+\s*/, '').trim() || keyword || '제목 없음'
  const description = content
    .replace(/^#+.*/gm, '')
    .replace(/\*\*/g, '')
    .trim()
    .substring(0, 200)

  const now = new Date().toISOString()

  let mainSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    headline: title,
    description,
    datePublished: now,
    dateModified: now,
    author: { '@type': 'Person', name: 'Author' },
    publisher: { '@type': 'Organization', name: 'N-Side Pro' },
  }

  if (schemaType === 'HowTo') {
    const steps = content.match(/\d+[\.)]?\s+.+/g) || []
    mainSchema = {
      ...mainSchema,
      name: title,
      step: steps.slice(0, 10).map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.replace(/^\d+[\.)]?\s+/, '').substring(0, 50),
        text: s.replace(/^\d+[\.)]?\s+/, ''),
      })),
    }
  }

  if (schemaType === 'FAQ') {
    const qaPairs: { q: string; a: string }[] = []
    const lines = content.split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^Q[:.]\s*/.test(lines[i]) && /^A[:.]\s*/.test(lines[i + 1])) {
        qaPairs.push({
          q: lines[i].replace(/^Q[:.]\s*/, ''),
          a: lines[i + 1].replace(/^A[:.]\s*/, ''),
        })
      }
    }
    if (qaPairs.length > 0) {
      mainSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: qaPairs.map(p => ({
          '@type': 'Question',
          name: p.q,
          acceptedAnswer: { '@type': 'Answer', text: p.a },
        })),
      }
    }
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: 'https://example.com' },
      { '@type': 'ListItem', position: 2, name: keyword || title, item: `https://example.com/${encodeURIComponent(keyword || title)}` },
    ],
  }

  return c.json({
    schemaType,
    mainSchema,
    breadcrumb,
    combinedSchema: [mainSchema, breadcrumb],
    isValid: true,
  })
})

