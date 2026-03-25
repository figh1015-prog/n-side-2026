import { Hono } from 'hono'

type Bindings = { DB: D1Database; CACHE: KVNamespace }

export const batchRoute = new Hono<{ Bindings: Bindings }>()

// In-memory batch storage for demo (use KV/D1 in production)
const batchJobs = new Map<string, {
  id: string
  keywords: string[]
  settings: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'cancelled'
  progress: number
  results: Array<{
    keyword: string
    status: string
    articleId?: string
    aeoScore?: number
    error?: string
  }>
  createdAt: string
}>()

batchRoute.post('/start', async (c) => {
  const { keywords, settings } = await c.req.json()
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return c.json({ error: '키워드 목록이 필요합니다.' }, 400)
  }
  if (keywords.length > 100) {
    return c.json({ error: '최대 100개의 키워드만 처리할 수 있습니다.' }, 400)
  }

  const batchId = crypto.randomUUID()
  batchJobs.set(batchId, {
    id: batchId,
    keywords,
    settings: settings || {},
    status: 'pending',
    progress: 0,
    results: keywords.map(k => ({ keyword: k, status: 'pending' })),
    createdAt: new Date().toISOString(),
  })

  // Store in KV if available
  if (c.env?.CACHE) {
    await c.env.CACHE.put(`batch:${batchId}`, JSON.stringify(batchJobs.get(batchId)), {
      expirationTtl: 86400,
    })
  }

  return c.json({ batchId, jobCount: keywords.length })
})

batchRoute.get('/:batchId/status', async (c) => {
  const batchId = c.req.param('batchId')

  // Try KV first
  if (c.env?.CACHE) {
    const stored = await c.env.CACHE.get(`batch:${batchId}`)
    if (stored) {
      return c.json(JSON.parse(stored))
    }
  }

  const job = batchJobs.get(batchId)
  if (!job) return c.json({ error: '배치 작업을 찾을 수 없습니다.' }, 404)

  return c.json(job)
})

batchRoute.post('/:batchId/update', async (c) => {
  const batchId = c.req.param('batchId')
  const update = await c.req.json()

  const job = batchJobs.get(batchId)
  if (!job) return c.json({ error: '배치 작업을 찾을 수 없습니다.' }, 404)

  const updated = { ...job, ...update }
  batchJobs.set(batchId, updated)

  if (c.env?.CACHE) {
    await c.env.CACHE.put(`batch:${batchId}`, JSON.stringify(updated), {
      expirationTtl: 86400,
    })
  }

  return c.json({ success: true })
})

batchRoute.post('/:batchId/cancel', async (c) => {
  const batchId = c.req.param('batchId')
  const job = batchJobs.get(batchId)
  if (!job) return c.json({ error: '배치 작업을 찾을 수 없습니다.' }, 404)

  job.status = 'cancelled'
  batchJobs.set(batchId, job)

  return c.json({ success: true })
})

