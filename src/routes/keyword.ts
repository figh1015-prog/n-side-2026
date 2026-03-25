import { Hono } from 'hono'

type Bindings = { DB: D1Database; CACHE: KVNamespace }

export const keywordRoute = new Hono<{ Bindings: Bindings }>()

function calcSaturation(volume: number, competition: number): number {
  if (volume === 0) return 100
  return Math.min(100, Math.round((competition / volume) * 100))
}

function calcDifficulty(saturation: number): string {
  if (saturation < 20) return '쉬움'
  if (saturation < 50) return '보통'
  if (saturation < 80) return '어려움'
  return '매우어려움'
}

// POST /api/keyword/analyze
keywordRoute.post('/analyze', async (c) => {
  const { keyword, apiKeys } = await c.req.json()
  if (!keyword) return c.json({ error: '키워드가 필요합니다.' }, 400)

  const naverClientId = apiKeys?.naverClientId || ''
  const naverClientSecret = apiKeys?.naverClientSecret || ''

  // Mock data when no API keys
  if (!naverClientId || !naverClientSecret) {
    const mockVolume = Math.floor(Math.random() * 50000) + 1000
    const mockComp = Math.floor(Math.random() * 30000) + 500
    const saturation = calcSaturation(mockVolume, mockComp)
    return c.json({
      keyword,
      monthlyVolume: mockVolume,
      competition: mockComp,
      saturationScore: saturation,
      difficulty: calcDifficulty(saturation),
      trend: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
      related: [
        `${keyword} 방법`, `${keyword} 추천`, `${keyword} 효과`, 
        `${keyword} 종류`, `${keyword} 가격`, `${keyword} 비교`
      ],
      recommendedContentType: '정보성',
      isMock: true,
    })
  }

  try {
    // Naver Search API
    const searchRes = await fetch(
      `https://openapi.naver.com/v1/search/webkr?query=${encodeURIComponent(keyword)}&display=1`,
      {
        headers: {
          'X-Naver-Client-Id': naverClientId,
          'X-Naver-Client-Secret': naverClientSecret,
        },
      }
    )

    const searchData = await searchRes.json() as { total?: number }
    const competition = searchData.total || 0

    // Naver DataLab trend (simplified mock for now)
    const trend = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100))
    const mockVolume = Math.floor(Math.random() * 50000) + 1000
    const saturation = calcSaturation(mockVolume, competition)

    return c.json({
      keyword,
      monthlyVolume: mockVolume,
      competition,
      saturationScore: saturation,
      difficulty: calcDifficulty(saturation),
      trend,
      related: [
        `${keyword} 방법`, `${keyword} 추천`, `${keyword} 효과`,
        `${keyword} 후기`, `${keyword} 가격`, `${keyword} 비교`
      ],
      recommendedContentType: '정보성',
    })
  } catch (err) {
    return c.json({ error: 'API 호출 중 오류가 발생했습니다.' }, 500)
  }
})

// GET /api/keyword/lists — keyword list management
keywordRoute.get('/lists', async (c) => {
  if (!c.env?.DB) return c.json({ lists: [] })
  try {
    const result = await c.env.DB.prepare(
      'SELECT DISTINCT list_name FROM keywords WHERE list_name IS NOT NULL ORDER BY list_name'
    ).all()
    return c.json({ lists: result.results })
  } catch {
    return c.json({ lists: [] })
  }
})

// GET /api/keyword/list/:name
keywordRoute.get('/list/:name', async (c) => {
  const listName = c.req.param('name')
  if (!c.env?.DB) return c.json({ keywords: [] })
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM keywords WHERE list_name = ? ORDER BY created_at DESC'
    ).bind(listName).all()
    return c.json({ keywords: result.results })
  } catch {
    return c.json({ keywords: [] })
  }
})

// POST /api/keyword/save
keywordRoute.post('/save', async (c) => {
  const { keyword, listName, analysis } = await c.req.json()
  if (!keyword) return c.json({ error: '키워드가 필요합니다.' }, 400)

  if (!c.env?.DB) return c.json({ success: true, message: 'DB 없음 (로컬 저장됨)' })

  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare(
      `INSERT INTO keywords (id, keyword, list_name, monthly_volume, competition, saturation_score, difficulty, last_analyzed)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(keyword) DO UPDATE SET
       list_name=excluded.list_name,
       monthly_volume=excluded.monthly_volume,
       last_analyzed=datetime('now')`
    ).bind(
      id, keyword, listName || null,
      analysis?.monthlyVolume || null,
      analysis?.competition || null,
      analysis?.saturationScore || null,
      analysis?.difficulty || null
    ).run()
    return c.json({ success: true, id })
  } catch (err) {
    return c.json({ error: 'DB 저장 오류', detail: String(err) }, 500)
  }
})

