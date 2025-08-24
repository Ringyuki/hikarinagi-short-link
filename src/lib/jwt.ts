import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE_NAME = 'admin_session'

// 24 小时（秒）
export const DEFAULT_SESSION_DURATION_SECONDS = 24 * 60 * 60

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Auth] JWT_SECRET 未配置，无法验证登录会话')
    }
    // 开发环境使用默认值，便于本地调试
    return new TextEncoder().encode('dev-secret-change-me')
  }
  return new TextEncoder().encode(secret)
}

export interface SessionClaims {
  sub: string // username
  iat?: number
  exp?: number
}

export async function signSessionToken(
  username: string,
  expiresInSeconds: number = DEFAULT_SESSION_DURATION_SECONDS,
): Promise<string> {
  const secret = getJwtSecret()
  const now = Math.floor(Date.now() / 1000)
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(username)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(secret)
  return token
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return payload as SessionClaims
  } catch {
    return null
  }
}


