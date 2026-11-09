import { eq } from 'drizzle-orm'
import { factory } from '../config/env'
import { sessions, users } from '../models'
import { verifyAccessToken } from '../utils/crypto'
import { ForbiddenError, UnauthorizedError } from '../utils/errors'

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice(7).trim()
  return token.length > 0 ? token : null
}

/**
 * Require a valid JWT Bearer token, active session, and non-suspended account
 */
export const authenticate = factory.createMiddleware(async (c, next) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  if (!token) {
    throw new UnauthorizedError('Missing or invalid Authorization Bearer token.')
  }

  let payload
  try {
    payload = await verifyAccessToken(token, c.env?.JWT_SECRET)
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token.')
  }

  const db = c.get('db')
  if (db) {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, payload.sid))
      .limit(1)

    if (
      !session ||
      session.revokedAt !== null ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedError('Session has expired or been revoked.')
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isSuspended: users.isSuspended,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    if (!user) {
      throw new UnauthorizedError('Account not found.')
    }

    if (user.isSuspended) {
      throw new ForbiddenError('Your account has been suspended.')
    }
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    sessionId: payload.sid,
  })

  await next()
})

/**
 * Optionally decode a JWT Bearer token if present without failing unauthenticated requests
 */
export const optionalAuthenticate = factory.createMiddleware(async (c, next) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  if (token) {
    try {
      const payload = await verifyAccessToken(token, c.env?.JWT_SECRET)
      c.set('user', {
        id: payload.sub,
        email: payload.email,
        sessionId: payload.sid,
      })
    } catch {
      // Ignore invalid token for optional auth routes
    }
  }
  await next()
})
