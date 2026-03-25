import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { generateRoute } from './routes/generate'
import { keywordRoute } from './routes/keyword'
import { historyRoute } from './routes/history'
import { scheduleRoute } from './routes/schedule'
import { indexingRoute } from './routes/indexing'
import { schemaRoute } from './routes/schema'
import { batchRoute } from './routes/batch'
import { pagespeedRoute } from './routes/pagespeed'

type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}))

// API Routes
app.route('/api/generate', generateRoute)
app.route('/api/keyword', keywordRoute)
app.route('/api/history', historyRoute)
app.route('/api/schedule', scheduleRoute)
app.route('/api/indexing', indexingRoute)
app.route('/api/schema', schemaRoute)
app.route('/api/batch', batchRoute)
app.route('/api/pagespeed', pagespeedRoute)

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
