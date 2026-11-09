import { factory } from '../config/env'
import { verifyAccessToken } from '../utils/crypto'
import { UnauthorizedError } from '../utils/errors'

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice(7).trim()
  return token.length > 0 ? token : null
}

/**
 * Require a valid JWT Bearer token and attach `AuthUser` to `c.var.user`
 */
export const authenticate = factory.createMiddleware(async (c, next) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  if (!token) {
    throw new UnauthorizedError('Missing or invalid Authorization Bearer token')
  }

  try {
    const payload = await verifyAccessToken(token, c.env?.JWT_SECRET)
    c.set('user', {
      id: payload.id,
      email: payload.email,
    })
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token')
  }

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
        id: payload.id,
        email: payload.email,
      })
    } catch {
      // Ignore invalid token for optional auth routes
    }
  }
  await next()
})
