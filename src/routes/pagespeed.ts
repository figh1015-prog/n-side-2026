import { Hono } from 'hono'

type Bindings = { DB: D1Database }

export const pagespeedRoute = new Hono<{ Bindings: Bindings }>()

pagespeedRoute.get('/', async (c) => {
  const url = c.req.query('url')
  const apiKey = c.req.query('apiKey')

  if (!url) return c.json({ error: 'URL이 필요합니다.' }, 400)

  if (!apiKey) {
    // Return mock data
    return c.json({
      url,
      lcp: { value: 2.3, score: 85, status: 'good' },
      inp: { value: 180, score: 75, status: 'needs-improvement' },
      cls: { value: 0.05, score: 92, status: 'good' },
      fcp: { value: 1.8, score: 88, status: 'good' },
      ttfb: { value: 0.6, score: 80, status: 'good' },
      overallScore: 84,
      recommendations: [
        '이미지를 WebP 형식으로 최적화하세요',
        'JavaScript를 지연 로드하세요',
        '브라우저 캐싱을 설정하세요',
      ],
      isMock: true,
    })
  }

  try {
    const psRes = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`
    )
    const data = await psRes.json() as {
      lighthouseResult?: {
        audits?: Record<string, { numericValue?: number; score?: number; displayValue?: string }>
        categories?: { performance?: { score?: number } }
      }
    }

    const audits = data.lighthouseResult?.audits || {}
    const lcp = audits['largest-contentful-paint']?.numericValue || 0
    const inp = audits['interaction-to-next-paint']?.numericValue || 0
    const cls = audits['cumulative-layout-shift']?.numericValue || 0

    const getStatus = (metric: string, value: number) => {
      if (metric === 'lcp') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
      if (metric === 'inp') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
      if (metric === 'cls') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
      return 'good'
    }

    return c.json({
      url,
      lcp: { value: lcp / 1000, score: Math.round((audits['largest-contentful-paint']?.score || 0) * 100), status: getStatus('lcp', lcp) },
      inp: { value: inp, score: Math.round((audits['interaction-to-next-paint']?.score || 0) * 100), status: getStatus('inp', inp) },
      cls: { value: cls, score: Math.round((audits['cumulative-layout-shift']?.score || 0) * 100), status: getStatus('cls', cls) },
      overallScore: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
      recommendations: [],
    })
  } catch (err) {
    return c.json({ error: 'PageSpeed API 오류', detail: String(err) }, 500)
  }
})

