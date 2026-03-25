import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
  ENVIRONMENT: string
}

export const authRoute = new Hono<{ Bindings: Bindings }>()

// ─── Crypto helpers (Web Crypto API — Cloudflare Workers 지원) ───────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── JWT-like simple token (base64 payload + signature) ─────────────────────

async function createSessionToken(userId: string, role: string): Promise<string> {
  const payload = {
    sub: userId,
    role,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7일
  }
  const payloadB64 = btoa(JSON.stringify(payload))
  const sig = generateToken().substring(0, 16)
  return `${payloadB64}.${sig}`
}

function parseToken(token: string): { sub: string; role: string; exp: number } | null {
  try {
    const [payloadB64] = token.split('.')
    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// ─── Auth middleware helper ──────────────────────────────────────────────────

export async function verifySession(
  token: string,
  db: D1Database | undefined,
  kv: KVNamespace | undefined
): Promise<{ userId: string; role: string; name: string; email: string } | null> {
  if (!token) return null

  const parsed = parseToken(token)
  if (!parsed) return null

  // KV 캐시 확인 (빠른 경로)
  if (kv) {
    const cached = await kv.get(`session:${parsed.sub}`)
    if (!cached) return null
    try {
      const data = JSON.parse(cached)
      if (data.tokenHash) {
        const incomingHash = await hashToken(token)
        if (data.tokenHash !== incomingHash) return null
      }
    } catch {}
  }

  // DB에서 사용자 정보 조회
  if (!db) return null
  try {
    const user = await db.prepare(
      `SELECT id, email, name, role, is_active FROM users WHERE id = ? AND is_active = 1`
    ).bind(parsed.sub).first() as { id: string; email: string; name: string; role: string; is_active: number } | null

    if (!user || user.role !== 'approved' && user.role !== 'admin') return null
    return { userId: user.id, role: user.role, name: user.name, email: user.email }
  } catch {
    return null
  }
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

authRoute.post('/register', async (c) => {
  const { email, password, name, message } = await c.req.json()

  if (!email || !password || !name) {
    return c.json({ error: '이메일, 비밀번호, 이름은 필수입니다.' }, 400)
  }
  if (password.length < 8) {
    return c.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: '올바른 이메일 형식이 아닙니다.' }, 400)
  }

  if (!c.env?.DB) {
    return c.json({ error: '서버 오류가 발생했습니다.' }, 503)
  }

  try {
    // 중복 이메일 체크
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first()

    if (existing) {
      return c.json({ error: '이미 사용 중인 이메일입니다.' }, 409)
    }

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)

    // 첫 번째 사용자는 자동으로 admin 승인
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first() as { count: number } | null
    const isFirst = (countResult?.count ?? 0) === 0
    const role = isFirst ? 'admin' : 'pending'

    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, request_message)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, email.toLowerCase(), passwordHash, name, role, message || null).run()

    if (isFirst) {
      return c.json({
        success: true,
        status: 'admin',
        message: '관리자 계정이 생성되었습니다. 바로 로그인할 수 있습니다.',
      })
    }

    return c.json({
      success: true,
      status: 'pending',
      message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
    })
  } catch (err) {
    console.error('Register error:', err)
    return c.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

authRoute.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400)
  }
  if (!c.env?.DB) {
    return c.json({ error: '서버 오류가 발생했습니다.' }, 503)
  }

  try {
    const user = await c.env.DB.prepare(
      `SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = ?`
    ).bind(email.toLowerCase()).first() as {
      id: string; email: string; name: string; role: string
      password_hash: string; is_active: number
    } | null

    if (!user) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    if (!user.is_active) {
      return c.json({ error: '비활성화된 계정입니다.' }, 403)
    }

    const inputHash = await hashPassword(password)
    if (inputHash !== user.password_hash) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401)
    }

    if (user.role === 'pending') {
      return c.json({
        error: '계정 승인 대기 중입니다.',
        status: 'pending',
        message: '관리자가 승인하면 이용할 수 있습니다.',
      }, 403)
    }
    if (user.role === 'rejected') {
      return c.json({ error: '가입이 거절된 계정입니다. 관리자에게 문의하세요.', status: 'rejected' }, 403)
    }

    // 세션 토큰 생성
    const token = await createSessionToken(user.id, user.role)
    const tokenHash = await hashToken(token)
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // DB에 세션 저장
    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(sessionId, user.id, tokenHash, expiresAt).run()

    // 마지막 로그인 업데이트
    await c.env.DB.prepare(
      `UPDATE users SET last_login = datetime('now') WHERE id = ?`
    ).bind(user.id).run()

    // KV에 세션 캐시 (7일)
    if (c.env?.CACHE) {
      await c.env.CACHE.put(
        `session:${user.id}`,
        JSON.stringify({ tokenHash, role: user.role, name: user.name }),
        { expirationTtl: 7 * 24 * 60 * 60 }
      )
    }

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return c.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, 500)
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

authRoute.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (token) {
    const parsed = parseToken(token)
    if (parsed && c.env?.CACHE) {
      await c.env.CACHE.delete(`session:${parsed.sub}`)
    }
    if (parsed && c.env?.DB) {
      const tokenHash = await hashToken(token)
      await c.env.DB.prepare(
        'DELETE FROM sessions WHERE token_hash = ?'
      ).bind(tokenHash).run().catch(() => {})
    }
  }

  return c.json({ success: true })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

authRoute.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) return c.json({ error: '인증이 필요합니다.' }, 401)

  const session = await verifySession(token, c.env?.DB, c.env?.CACHE)
  if (!session) return c.json({ error: '세션이 만료되었습니다.' }, 401)

  return c.json({ user: session })
})

// ─── GET /api/auth/admin/users ───────────────────────────────────────────────
// 관리자 전용: 전체 회원 목록 (pending 포함)

authRoute.get('/admin/users', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return c.json({ error: '인증이 필요합니다.' }, 401)

  const session = await verifySession(token, c.env?.DB, c.env?.CACHE)
  if (!session || session.role !== 'admin') {
    return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  }

  if (!c.env?.DB) return c.json({ users: [] })

  try {
    const result = await c.env.DB.prepare(
      `SELECT id, email, name, role, request_message, created_at, approved_at, last_login
       FROM users ORDER BY
         CASE role WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
         created_at DESC`
    ).all()
    return c.json({ users: result.results })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ─── POST /api/auth/admin/approve ────────────────────────────────────────────
// 관리자: 회원 승인

authRoute.post('/admin/approve', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return c.json({ error: '인증이 필요합니다.' }, 401)

  const session = await verifySession(token, c.env?.DB, c.env?.CACHE)
  if (!session || session.role !== 'admin') {
    return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  }

  const { userId, action } = await c.req.json() // action: 'approve' | 'reject'
  if (!userId || !action) return c.json({ error: 'userId와 action이 필요합니다.' }, 400)
  if (!c.env?.DB) return c.json({ error: 'DB 오류' }, 503)

  try {
    const newRole = action === 'approve' ? 'approved' : 'rejected'
    await c.env.DB.prepare(
      `UPDATE users SET role = ?, approved_at = datetime('now'), approved_by = ? WHERE id = ?`
    ).bind(newRole, session.userId, userId).run()

    return c.json({ success: true, role: newRole })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ─── DELETE /api/auth/admin/users/:id ────────────────────────────────────────

authRoute.delete('/admin/users/:id', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return c.json({ error: '인증이 필요합니다.' }, 401)

  const session = await verifySession(token, c.env?.DB, c.env?.CACHE)
  if (!session || session.role !== 'admin') {
    return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  }

  const userId = c.req.param('id')
  if (userId === session.userId) {
    return c.json({ error: '자기 자신을 삭제할 수 없습니다.' }, 400)
  }

  if (!c.env?.DB) return c.json({ error: 'DB 오류' }, 503)

  try {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// ─── PATCH /api/auth/admin/users/:id/role ────────────────────────────────────

authRoute.patch('/admin/users/:id/role', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return c.json({ error: '인증이 필요합니다.' }, 401)

  const session = await verifySession(token, c.env?.DB, c.env?.CACHE)
  if (!session || session.role !== 'admin') {
    return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  }

  const userId = c.req.param('id')
  const { role } = await c.req.json()

  if (!c.env?.DB) return c.json({ error: 'DB 오류' }, 503)

  try {
    await c.env.DB.prepare(
      `UPDATE users SET role = ? WHERE id = ?`
    ).bind(role, userId).run()

    // KV 세션 캐시 무효화
    if (c.env?.CACHE) {
      await c.env.CACHE.delete(`session:${userId}`)
    }

    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})
