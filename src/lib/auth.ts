// ─── Auth client helpers ─────────────────────────────────────────────────────

const TOKEN_KEY = 'nside_token'
const USER_KEY = 'nside_user'

export interface AuthUser {
  userId: string
  role: 'admin' | 'approved' | 'pending' | 'rejected'
  name: string
  email: string
}

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },
  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

/** Authorization 헤더를 포함한 fetch */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = authStorage.getToken()
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
}

/** 로그인 */
export async function login(email: string, password: string): Promise<{
  success: boolean
  error?: string
  status?: string
  user?: AuthUser
  token?: string
}> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json() as {
      success?: boolean; error?: string; status?: string
      token?: string; user?: { id: string; email: string; name: string; role: string }
    }

    if (!res.ok) {
      return { success: false, error: data.error || '로그인 실패', status: data.status }
    }

    if (data.token && data.user) {
      const user: AuthUser = {
        userId: data.user.id,
        role: data.user.role as AuthUser['role'],
        name: data.user.name,
        email: data.user.email,
      }
      authStorage.setToken(data.token)
      authStorage.setUser(user)
      return { success: true, user, token: data.token }
    }

    return { success: false, error: '응답 오류' }
  } catch {
    return { success: false, error: '네트워크 오류가 발생했습니다.' }
  }
}

/** 회원가입 */
export async function register(data: {
  email: string; password: string; name: string; message?: string
}): Promise<{ success: boolean; error?: string; status?: string; message?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json() as { success?: boolean; error?: string; status?: string; message?: string }
    if (!res.ok) return { success: false, error: body.error || '가입 실패' }
    return { success: true, status: body.status, message: body.message }
  } catch {
    return { success: false, error: '네트워크 오류가 발생했습니다.' }
  }
}

/** 로그아웃 */
export async function logout(): Promise<void> {
  const token = authStorage.getToken()
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
  authStorage.clear()
}

/** 세션 검증 (토큰에서 파싱) */
export function getLocalUser(): AuthUser | null {
  const token = authStorage.getToken()
  if (!token) return null
  try {
    const [payloadB64] = token.split('.')
    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp < Date.now()) {
      authStorage.clear()
      return null
    }
    return authStorage.getUser()
  } catch {
    authStorage.clear()
    return null
  }
}
