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

/**
 * 네이버 검색광고 API HMAC-SHA256 서명 생성
 * 공식 문서: https://naver.github.io/searchad-apidoc/#/guides
 * 서명 방식: HMAC-SHA256(timestamp + "." + method + "." + uri, secretKey) → Base64
 */
async function makeNaverAdSignature(
  timestamp: number,
  method: string,
  uri: string,
  secretKey: string
): Promise<string> {
  const message = `${timestamp}.${method}.${uri}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const msgData = encoder.encode(message)

  // Web Crypto API (Cloudflare Workers 지원)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const signatureArray = Array.from(new Uint8Array(signatureBuffer))
  // Base64 인코딩
  const base64 = btoa(String.fromCharCode(...signatureArray))
  return base64
}

/**
 * 네이버 검색광고 API - relKwdStat 월간 검색량 조회
 * 엔드포인트: GET /keywordstool?hintKeywords=키워드&showDetail=1
 */
async function fetchNaverAdKeyword(
  keyword: string,
  apiKey: string,
  secretKey: string,
  customerId: string
): Promise<{ monthlyPcQcCnt: number; monthlyMobileQcCnt: number; relKeywords: string[] } | null> {
  const timestamp = Date.now()
  const method = 'GET'
  const uri = '/keywordstool'

  try {
    const signature = await makeNaverAdSignature(timestamp, method, uri, secretKey)

    const url = `https://api.searchad.naver.com${uri}?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Timestamp': String(timestamp),
        'X-API-KEY': apiKey,
        'X-Customer': customerId,
        'X-Signature': signature,
      },
    })

    if (!res.ok) {
      console.error('[NaverAd] API 오류:', res.status, await res.text())
      return null
    }

    const data = await res.json() as {
      keywordList?: Array<{
        relKeyword: string
        monthlyPcQcCnt: number | string
        monthlyMobileQcCnt: number | string
        compIdx: string
      }>
    }

    if (!data.keywordList || data.keywordList.length === 0) return null

    const main = data.keywordList[0]
    // API가 "<10" 같은 문자열을 반환하는 경우 처리
    const pcCnt = typeof main.monthlyPcQcCnt === 'number'
      ? main.monthlyPcQcCnt
      : parseInt(String(main.monthlyPcQcCnt).replace(/[^0-9]/g, '')) || 0
    const mobileCnt = typeof main.monthlyMobileQcCnt === 'number'
      ? main.monthlyMobileQcCnt
      : parseInt(String(main.monthlyMobileQcCnt).replace(/[^0-9]/g, '')) || 0

    const relKeywords = data.keywordList
      .slice(1, 7)
      .map(k => k.relKeyword)
      .filter(Boolean)

    return {
      monthlyPcQcCnt: pcCnt,
      monthlyMobileQcCnt: mobileCnt,
      relKeywords,
    }
  } catch (err) {
    console.error('[NaverAd] 요청 실패:', err)
    return null
  }
}

// POST /api/keyword/analyze
keywordRoute.post('/analyze', async (c) => {
  const { keyword, apiKeys } = await c.req.json()
  if (!keyword) return c.json({ error: '키워드가 필요합니다.' }, 400)

  const naverClientId = apiKeys?.naverClientId || ''
  const naverClientSecret = apiKeys?.naverClientSecret || ''
  const naverAdApiKey = apiKeys?.naverAdApiKey || ''
  const naverAdSecretKey = apiKeys?.naverAdSecretKey || ''
  const naverAdCustomerId = apiKeys?.naverAdCustomerId || ''

  // ── 네이버 검색광고 API (월간 검색량) ──────────────────────────
  if (naverAdApiKey && naverAdSecretKey && naverAdCustomerId) {
    try {
      const adData = await fetchNaverAdKeyword(keyword, naverAdApiKey, naverAdSecretKey, naverAdCustomerId)

      if (adData) {
        const monthlyVolume = adData.monthlyPcQcCnt + adData.monthlyMobileQcCnt
        let competition = 0

        // 네이버 검색 API로 결과 수(경쟁도) 조회
        if (naverClientId && naverClientSecret) {
          try {
            const searchRes = await fetch(
              `https://openapi.naver.com/v1/search/webkr?query=${encodeURIComponent(keyword)}&display=1`,
              {
                headers: {
                  'X-Naver-Client-Id': naverClientId,
                  'X-Naver-Client-Secret': naverClientSecret,
                },
              }
            )
            if (searchRes.ok) {
              const searchData = await searchRes.json() as { total?: number }
              competition = searchData.total || 0
            }
          } catch { /* 무시 */ }
        }

        const saturation = calcSaturation(monthlyVolume, competition)

        // 연관 키워드: 광고 API 연관어 + 기본 패턴
        const related = adData.relKeywords.length > 0
          ? adData.relKeywords
          : [`${keyword} 방법`, `${keyword} 추천`, `${keyword} 효과`, `${keyword} 후기`, `${keyword} 가격`, `${keyword} 비교`]

        return c.json({
          keyword,
          monthlyVolume,
          monthlyPcQcCnt: adData.monthlyPcQcCnt,
          monthlyMobileQcCnt: adData.monthlyMobileQcCnt,
          competition,
          saturationScore: saturation,
          difficulty: calcDifficulty(saturation),
          trend: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
          related,
          recommendedContentType: saturation < 30 ? '정보성' : saturation < 60 ? '리뷰형' : '비교형',
          isMock: false,
        })
      }
    } catch (err) {
      console.error('[KeywordAnalyze] 검색광고 API 오류:', err)
    }
  }

  // ── 네이버 검색 API만 있는 경우 (경쟁도만) ──────────────────────
  if (naverClientId && naverClientSecret) {
    try {
      const searchRes = await fetch(
        `https://openapi.naver.com/v1/search/webkr?query=${encodeURIComponent(keyword)}&display=1`,
        {
          headers: {
            'X-Naver-Client-Id': naverClientId,
            'X-Naver-Client-Secret': naverClientSecret,
          },
        }
      )

      if (searchRes.ok) {
        const searchData = await searchRes.json() as { total?: number }
        const competition = searchData.total || 0
        const mockVolume = Math.floor(Math.random() * 50000) + 1000
        const saturation = calcSaturation(mockVolume, competition)

        return c.json({
          keyword,
          monthlyVolume: mockVolume,
          competition,
          saturationScore: saturation,
          difficulty: calcDifficulty(saturation),
          trend: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
          related: [
            `${keyword} 방법`, `${keyword} 추천`, `${keyword} 효과`,
            `${keyword} 후기`, `${keyword} 가격`, `${keyword} 비교`
          ],
          recommendedContentType: '정보성',
          isMock: true,
          note: '검색광고 API 없이 경쟁도만 실제 데이터. 월간 검색량은 추정치입니다.',
        })
      }
    } catch (err) {
      return c.json({ error: 'API 호출 중 오류가 발생했습니다.' }, 500)
    }
  }

  // ── API 키 없음: 목업 데이터 반환 ────────────────────────────────
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
})

// GET /api/keyword/lists — 키워드 목록 이름 조회
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

// GET /api/keyword/list/:name — 특정 목록의 키워드 조회
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

// POST /api/keyword/save — 키워드 분석 결과 DB 저장
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
       competition=excluded.competition,
       saturation_score=excluded.saturation_score,
       difficulty=excluded.difficulty,
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

// DELETE /api/keyword/:id — 키워드 삭제
keywordRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!c.env?.DB) return c.json({ error: 'DB not available' }, 503)
  try {
    await c.env.DB.prepare('DELETE FROM keywords WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})
