import { eq } from 'drizzle-orm'
import { ACCOUNT_TYPES, ADMIN_ROLES, type AdminRole } from '../config/constants'
import { factory } from '../config/env'
import {
  adminUsers,
  agentUsers,
  landlordUsers,
  seekerUsers,
} from '../models'
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
 * Require a valid Seeker JWT Bearer token (`accountType === 'seeker'`)
 * and verify `tokenVersion` against `seeker_users`
 */
export const authenticateSeeker = factory.createMiddleware(async (c, next) => {
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

  if (payload.accountType !== ACCOUNT_TYPES.SEEKER) {
    throw new ForbiddenError('Access restricted to seeker accounts.')
  }

  const db = c.get('db')
  if (db) {
    const [seeker] = await db
      .select({
        id: seekerUsers.id,
        email: seekerUsers.email,
        tokenVersion: seekerUsers.tokenVersion,
        isSuspended: seekerUsers.isSuspended,
      })
      .from(seekerUsers)
      .where(eq(seekerUsers.id, payload.sub))
      .limit(1)

    if (!seeker || seeker.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has expired or been revoked.')
    }

    if (seeker.isSuspended) {
      throw new ForbiddenError('Your seeker account has been suspended.')
    }
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    accountType: payload.accountType,
    tokenVersion: payload.tokenVersion,
  })

  await next()
})

/**
 * Require a valid Agent JWT Bearer token (`accountType === 'agent'`)
 * and verify `tokenVersion` against `agent_users`
 */
export const authenticateAgent = factory.createMiddleware(async (c, next) => {
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

  if (payload.accountType !== ACCOUNT_TYPES.AGENT) {
    throw new ForbiddenError('Access restricted to agent accounts.')
  }

  const db = c.get('db')
  if (db) {
    const [agent] = await db
      .select({
        id: agentUsers.id,
        email: agentUsers.email,
        tokenVersion: agentUsers.tokenVersion,
        isSuspended: agentUsers.isSuspended,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, payload.sub))
      .limit(1)

    if (!agent || agent.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has expired or been revoked.')
    }

    if (agent.isSuspended) {
      throw new ForbiddenError('Your agent account has been suspended.')
    }
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    accountType: payload.accountType,
    tokenVersion: payload.tokenVersion,
  })

  await next()
})

/**
 * Require a valid Landlord JWT Bearer token (`accountType === 'landlord'`)
 * and verify `tokenVersion` against `landlord_users`
 */
export const authenticateLandlord = factory.createMiddleware(async (c, next) => {
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

  if (payload.accountType !== ACCOUNT_TYPES.LANDLORD) {
    throw new ForbiddenError('Access restricted to landlord accounts.')
  }

  const db = c.get('db')
  if (db) {
    const [landlord] = await db
      .select({
        id: landlordUsers.id,
        email: landlordUsers.email,
        tokenVersion: landlordUsers.tokenVersion,
        isSuspended: landlordUsers.isSuspended,
      })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, payload.sub))
      .limit(1)

    if (!landlord || landlord.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has expired or been revoked.')
    }

    if (landlord.isSuspended) {
      throw new ForbiddenError('Your landlord account has been suspended.')
    }
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    accountType: payload.accountType,
    tokenVersion: payload.tokenVersion,
  })

  await next()
})

/**
 * Require a valid Admin JWT Bearer token (`accountType === 'admin'`)
 */
export const authenticateAdmin = factory.createMiddleware(async (c, next) => {
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

  if (payload.accountType !== ACCOUNT_TYPES.ADMIN) {
    throw new ForbiddenError('Access restricted to administrator accounts.')
  }

  const db = c.get('db')
  let adminRole: AdminRole = ADMIN_ROLES.ADMIN
  if (db) {
    const [admin] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        role: adminUsers.role,
        tokenVersion: adminUsers.tokenVersion,
        isSuspended: adminUsers.isSuspended,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.sub))
      .limit(1)

    if (!admin || admin.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has expired or been revoked.')
    }

    if (admin.isSuspended) {
      throw new ForbiddenError('Your administrator account has been suspended.')
    }

    adminRole = (admin.role as AdminRole) || ADMIN_ROLES.ADMIN
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    accountType: payload.accountType,
    tokenVersion: payload.tokenVersion,
    adminRole,
  })

  await next()
})

/**
 * Require the authenticated Admin to hold the `super_admin` role
 * (must be chained after `authenticateAdmin`)
 */
export const requireSuperAdmin = factory.createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (
    !user ||
    user.accountType !== ACCOUNT_TYPES.ADMIN ||
    user.adminRole !== ADMIN_ROLES.SUPER_ADMIN
  ) {
    throw new ForbiddenError(
      'Access restricted to Super Administrator accounts.'
    )
  }
  await next()
})
