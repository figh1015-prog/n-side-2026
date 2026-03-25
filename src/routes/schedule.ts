import { Hono } from 'hono'

type Bindings = { DB: D1Database; CACHE: KVNamespace }

export const scheduleRoute = new Hono<{ Bindings: Bindings }>()

scheduleRoute.get('/', async (c) => {
  if (!c.env?.DB) return c.json({ schedules: [] })
  try {
    const result = await c.env.DB.prepare(
      `SELECT s.*, a.keyword, a.word_count, a.aeo_score 
       FROM schedules s 
       LEFT JOIN articles a ON s.article_id = a.id 
       ORDER BY s.scheduled_at ASC`
    ).all()
    return c.json({ schedules: result.results })
  } catch {
    return c.json({ schedules: [] })
  }
})

scheduleRoute.post('/', async (c) => {
  const { articleId, scheduledAt, platform } = await c.req.json()
  if (!articleId || !scheduledAt) {
    return c.json({ error: '필수 필드가 누락되었습니다.' }, 400)
  }
  if (!c.env?.DB) return c.json({ success: true, message: 'DB 없음' })

  const id = crypto.randomUUID()
  try {
    // Check conflict
    const conflict = await c.env.DB.prepare(
      'SELECT id FROM schedules WHERE scheduled_at = ? AND platform = ? AND status = ?'
    ).bind(scheduledAt, platform, 'pending').first()

    if (conflict) {
      // Suggest next available slot
      const dt = new Date(scheduledAt)
      dt.setDate(dt.getDate() + 1)
      return c.json({
        conflict: true,
        suggestedTime: dt.toISOString(),
        message: '이미 같은 시간에 예약된 글이 있습니다. 다음 날로 예약하시겠습니까?',
      })
    }

    await c.env.DB.prepare(
      `INSERT INTO schedules (id, article_id, platform, scheduled_at, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).bind(id, articleId, platform, scheduledAt).run()

    return c.json({ success: true, id })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

scheduleRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!c.env?.DB) return c.json({ error: 'DB not available' }, 503)
  try {
    await c.env.DB.prepare('DELETE FROM schedules WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// POST /api/schedule/batch — auto-distribute batch articles
scheduleRoute.post('/batch-distribute', async (c) => {
  const { articleIds, startDate, intervalDays, hour, minute, platform } = await c.req.json()
  if (!articleIds || !Array.isArray(articleIds)) {
    return c.json({ error: 'articleIds 배열이 필요합니다.' }, 400)
  }

  const schedules: { articleId: string; scheduledAt: string; platform: string }[] = []
  const startDt = new Date(startDate || new Date().setDate(new Date().getDate() + 1))
  const h = hour ?? 9
  const m = minute ?? 0
  const interval = intervalDays ?? 1

  for (let i = 0; i < articleIds.length; i++) {
    const dt = new Date(startDt)
    dt.setDate(dt.getDate() + i * interval)
    dt.setHours(h, m, 0, 0)
    schedules.push({
      articleId: articleIds[i],
      scheduledAt: dt.toISOString(),
      platform: platform || '네이버 블로그',
    })
  }

  if (!c.env?.DB) return c.json({ schedules, message: 'DB 없음 - 시뮬레이션 결과' })

  try {
    const results = []
    for (const s of schedules) {
      const id = crypto.randomUUID()
      await c.env.DB.prepare(
        `INSERT INTO schedules (id, article_id, platform, scheduled_at, status)
         VALUES (?, ?, ?, ?, 'pending')`
      ).bind(id, s.articleId, s.platform, s.scheduledAt).run()
      results.push({ ...s, id })
    }
    return c.json({ success: true, schedules: results })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// GET /api/schedule/optimal-times — suggest best posting times
scheduleRoute.get('/optimal-times', async (c) => {
  // Competition pattern analysis (simplified mock)
  return c.json({
    suggestions: [
      { hour: 9, minute: 0, score: 92, reason: '오전 9시 - 경쟁 포스팅 최저, 검색 트래픽 상승 전' },
      { hour: 14, minute: 0, score: 85, reason: '오후 2시 - 점심 후 검색 증가 시점' },
      { hour: 21, minute: 0, score: 78, reason: '저녁 9시 - 일과 후 검색량 피크' },
    ],
    avoidTimes: ['월요일 오전 8-9시', '금요일 오후 5-7시'],
  })
})

