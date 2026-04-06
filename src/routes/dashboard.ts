import { Hono } from 'hono'

type Bindings = { DB: D1Database; CACHE: KVNamespace }

export const dashboardRoute = new Hono<{ Bindings: Bindings }>()

// GET /api/dashboard/stats — 실제 DB에서 통계 조회
dashboardRoute.get('/stats', async (c) => {
  if (!c.env?.DB) {
    return c.json({
      totalArticles: 0,
      trackedKeywords: 0,
      avgAEO: 0,
      weekPublished: 0,
    })
  }

  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const weekAgoStr = oneWeekAgo.toISOString()

    const [totalRes, keywordRes, aeoRes, weekRes] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM articles').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM keywords').first<{ count: number }>(),
      c.env.DB.prepare('SELECT AVG(aeo_score) as avg FROM articles WHERE aeo_score > 0').first<{ avg: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM articles WHERE status = 'published' AND created_at >= ?"
      ).bind(weekAgoStr).first<{ count: number }>(),
    ])

    return c.json({
      totalArticles: totalRes?.count || 0,
      trackedKeywords: keywordRes?.count || 0,
      avgAEO: Math.round(aeoRes?.avg || 0),
      weekPublished: weekRes?.count || 0,
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// GET /api/dashboard/chart — 최근 7일 생성 현황
dashboardRoute.get('/chart', async (c) => {
  if (!c.env?.DB) return c.json({ data: [] })

  try {
    const results = await c.env.DB.prepare(`
      SELECT 
        date(created_at) as day,
        COUNT(*) as count,
        ROUND(AVG(aeo_score), 0) as aeo
      FROM articles
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all<{ day: string; count: number; aeo: number }>()

    // 요일 라벨로 변환
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토']
    const data = results.results.map(r => ({
      day: dayLabels[new Date(r.day).getDay()],
      count: r.count,
      aeo: r.aeo || 0,
    }))

    return c.json({ data })
  } catch (err) {
    return c.json({ data: [] })
  }
})

// GET /api/dashboard/recent-activities — 최근 활동 (최근 생성 글 목록)
dashboardRoute.get('/recent-activities', async (c) => {
  if (!c.env?.DB) return c.json({ activities: [] })

  try {
    const results = await c.env.DB.prepare(`
      SELECT id, keyword, status, aeo_score, word_count, created_at
      FROM articles
      ORDER BY created_at DESC
      LIMIT 10
    `).all<{ id: string; keyword: string; status: string; aeo_score: number; word_count: number; created_at: string }>()

    const activities = results.results.map(r => {
      const diffMs = Date.now() - new Date(r.created_at).getTime()
      const diffMin = Math.floor(diffMs / 60000)
      const diffHour = Math.floor(diffMin / 60)
      const timeStr = diffMin < 60
        ? `${diffMin}분 전`
        : diffHour < 24
        ? `${diffHour}시간 전`
        : `${Math.floor(diffHour / 24)}일 전`

      return {
        id: r.id,
        type: 'generate',
        text: `"${r.keyword}" 글 생성 완료`,
        time: timeStr,
        status: r.status === 'error' ? 'error' : 'success',
        aeoScore: r.aeo_score,
      }
    })

    return c.json({ activities })
  } catch (err) {
    return c.json({ activities: [] })
  }
})

// GET /api/dashboard/top-keywords — 상위 키워드 (AEO 점수 기준)
dashboardRoute.get('/top-keywords', async (c) => {
  if (!c.env?.DB) return c.json({ keywords: [] })

  try {
    const results = await c.env.DB.prepare(`
      SELECT keyword, aeo_score, word_count
      FROM articles
      WHERE aeo_score > 0
      ORDER BY aeo_score DESC
      LIMIT 5
    `).all<{ keyword: string; aeo_score: number; word_count: number }>()

    const keywords = results.results.map(r => ({
      keyword: r.keyword,
      aeoScore: r.aeo_score,
      trend: 'up' as const,
      volume: 0,
    }))

    return c.json({ keywords })
  } catch (err) {
    return c.json({ keywords: [] })
  }
})

// GET /api/dashboard/pending — 검토 대기 글 (초안 상태)
dashboardRoute.get('/pending', async (c) => {
  if (!c.env?.DB) return c.json({ pending: [] })

  try {
    const results = await c.env.DB.prepare(`
      SELECT id, keyword, word_count, aeo_score
      FROM articles
      WHERE status = 'draft'
      ORDER BY created_at DESC
      LIMIT 5
    `).all<{ id: string; keyword: string; word_count: number; aeo_score: number }>()

    return c.json({ pending: results.results })
  } catch (err) {
    return c.json({ pending: [] })
  }
})
