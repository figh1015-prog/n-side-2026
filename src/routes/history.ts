import { Hono } from 'hono'

type Bindings = { DB: D1Database; CACHE: KVNamespace }

export const historyRoute = new Hono<{ Bindings: Bindings }>()

historyRoute.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const platform = c.req.query('platform') || ''
  const status = c.req.query('status') || ''
  const search = c.req.query('search') || ''
  const limit = 20
  const offset = (page - 1) * limit

  if (!c.env?.DB) {
    return c.json({ articles: [], total: 0, page, pages: 0 })
  }

  try {
    let query = 'SELECT * FROM articles WHERE 1=1'
    const params: (string | number)[] = []

    if (platform) { query += ' AND platform = ?'; params.push(platform) }
    if (status) { query += ' AND status = ?'; params.push(status) }
    if (search) { query += ' AND keyword LIKE ?'; params.push(`%${search}%`) }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const [results, countResult] = await Promise.all([
      c.env.DB.prepare(query).bind(...params).all(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM articles').all(),
    ])

    const total = (countResult.results[0] as { count: number })?.count || 0

    return c.json({
      articles: results.results,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

historyRoute.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!c.env?.DB) return c.json({ error: 'DB not available' }, 503)

  try {
    const result = await c.env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first()
    if (!result) return c.json({ error: '찾을 수 없습니다.' }, 404)
    return c.json(result)
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

historyRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!c.env?.DB) return c.json({ error: 'DB not available' }, 503)

  try {
    await c.env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

historyRoute.patch('/:id/status', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()
  if (!c.env?.DB) return c.json({ error: 'DB not available' }, 503)

  try {
    await c.env.DB.prepare(
      "UPDATE articles SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(status, id).run()
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

