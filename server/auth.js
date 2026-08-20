/**
 * server/auth.js —— 认证模块（零外部依赖）
 * ---------------------------------------------------
 * - 密码哈希：node:crypto scrypt + 随机盐 + timingSafeEqual 比较
 * - 会话令牌：HS256 JWT（header.payload.signature），7 天有效期
 * - requireAuth：Express 中间件，校验 Authorization: Bearer <token>
 *
 * 生产部署请务必在 .env 设置随机的 JWT_SECRET。
 */

import crypto from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'agentmind-dev-secret-change-me'
const TOKEN_TTL_SECONDS = 7 * 24 * 3600 // 7 天

/** ---------- 密码哈希 ---------- */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

/** ---------- JWT（HS256） ---------- */

function b64url(bufOrStr) {
  return Buffer.from(bufOrStr).toString('base64url')
}

export function signToken(user) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({
      uid: user.id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    })
  )
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function verifyToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (!data?.uid || !data?.exp || data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

/** ---------- Express 中间件 ---------- */

export function requireAuth(req, res, next) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期，请重新登录。' })
  }
  req.user = { id: payload.uid, username: payload.username }
  next()
}
