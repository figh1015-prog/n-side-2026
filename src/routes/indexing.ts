import { Hono } from 'hono'

type Bindings = { DB: D1Database; CACHE: KVNamespace }

export const indexingRoute = new Hono<{ Bindings: Bindings }>()

// POST /api/indexing/submit
indexingRoute.post('/submit', async (c) => {
  const { urls, apiKey, host } = await c.req.json()
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return c.json({ error: 'URL 목록이 필요합니다.' }, 400)
  }

  const indexNowKey = apiKey || 'your-indexnow-key'
  const siteHost = host || 'example.com'

  const results: { url: string; status: string; code?: number }[] = []

  // Submit in batches of 100
  const batches = []
  for (let i = 0; i < urls.length; i += 100) {
    batches.push(urls.slice(i, i + 100))
  }

  for (const batch of batches) {
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: siteHost,
          key: indexNowKey,
          keyLocation: `https://${siteHost}/${indexNowKey}.txt`,
          urlList: batch,
        }),
      })

      for (const url of batch) {
        results.push({ url, status: res.ok ? 'success' : 'failed', code: res.status })
      }

      // Log to D1
      if (c.env?.DB) {
        for (const url of batch) {
          const id = crypto.randomUUID()
          await c.env.DB.prepare(
            `INSERT INTO indexing_log (id, url, service, status) VALUES (?, ?, 'indexnow', ?)`
          ).bind(id, url, res.ok ? 'success' : 'failed').run()
        }
      }
    } catch (err) {
      for (const url of batch) {
        results.push({ url, status: 'error' })
      }
    }
  }

  return c.json({ submitted: results.length, results })
})

// GET /api/indexing/history
indexingRoute.get('/history', async (c) => {
  if (!c.env?.DB) return c.json({ logs: [] })
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM indexing_log ORDER BY submitted_at DESC LIMIT 100'
    ).all()
    return c.json({ logs: result.results })
  } catch {
    return c.json({ logs: [] })
  }
})

