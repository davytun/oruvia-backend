import { and, eq, isNull } from 'drizzle-orm'
import { AUTH_CONFIG } from '../config/constants'
import type { AppBindings } from '../config/env'
import type { Database } from '../database'
import { agents, landlords, seekers, sessions, users } from '../models'
import {
  DUMMY_PASSWORD_HASH,
  generateRandomToken,
  hashPassword,
  sha256Hex,
  signAccessToken,
  verifyPassword,
} from '../utils/crypto'
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors'
import type { LoginInput, RegisterInput } from '../utils/validators'
import { getUserWithProfiles } from './user.service'

async function issueSessionTokens(
  db: Database,
  env: AppBindings,
  user: { id: string; email: string },
  userAgent?: string
) {
  const sessionId = crypto.randomUUID()
  const refreshToken = generateRandomToken(32)
  const refreshTokenHash = await sha256Hex(refreshToken)
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_TTL_SECONDS * 1000
  ).toISOString()

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    userAgent: userAgent ?? null,
  })

  const accessToken = await signAccessToken(
    {
      userId: user.id,
      email: user.email,
      sessionId,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function registerUser(
  db: Database,
  env: AppBindings,
  input: RegisterInput,
  userAgent?: string
) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)

  if (existing) {
    throw new ConflictError('The email address provided is already registered.', [
      {
        field: 'email',
        issue: 'The email address provided is already registered.',
      },
    ])
  }

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password)

  await db.insert(users).values({
    id: userId,
    fullName: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    passwordHash,
    lastLoginAt: new Date().toISOString(),
  })

  // Every user gets a dedicated seekers record so they can always act as a Seeker
  await db.insert(seekers).values({
    userId,
    preferredLocation: input.preferred_location ?? null,
  })

  // If registering as an Agent or Landlord, also create the role record in its own table
  if (input.role === 'agent') {
    await db.insert(agents).values({
      userId,
      agencyName: input.agency_name ?? null,
      licenseNumber: input.license_number ?? null,
      bio: input.bio ?? null,
      whatsappNumber: input.whatsapp_number ?? null,
    })
  } else if (input.role === 'landlord') {
    await db.insert(landlords).values({
      userId,
      companyName: input.company_name ?? null,
      bio: input.bio ?? null,
      whatsappNumber: input.whatsapp_number ?? null,
    })
  }

  const tokens = await issueSessionTokens(
    db,
    env,
    { id: userId, email: input.email },
    userAgent
  )
  const userProfile = await getUserWithProfiles(db, userId)

  return {
    user: userProfile,
    ...tokens,
  }
}

export async function loginUser(
  db: Database,
  env: AppBindings,
  input: LoginInput,
  userAgent?: string
) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)

  if (!user) {
    // Perform dummy PBKDF2 verification to prevent timing attacks
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH)
    throw new UnauthorizedError('Invalid email or password.')
  }

  if (user.isSuspended) {
    throw new ForbiddenError('Your account has been suspended.')
  }

  if (
    user.lockedUntil &&
    new Date(user.lockedUntil).getTime() > Date.now()
  ) {
    throw new ForbiddenError(
      'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
    )
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash)
  const now = new Date().toISOString()

  if (!passwordValid) {
    const nextFailedCount = user.failedLoginCount + 1
    const shouldLock =
      nextFailedCount >= AUTH_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS
    const lockedUntil = shouldLock
      ? new Date(
          Date.now() + AUTH_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
        ).toISOString()
      : null

    await db
      .update(users)
      .set({
        failedLoginCount: nextFailedCount,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))

    throw new UnauthorizedError('Invalid email or password.')
  }

  await db
    .update(users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))

  const tokens = await issueSessionTokens(
    db,
    env,
    { id: user.id, email: user.email },
    userAgent
  )
  const userProfile = await getUserWithProfiles(db, user.id)

  return {
    user: userProfile,
    ...tokens,
  }
}

export async function refreshUserSession(
  db: Database,
  env: AppBindings,
  refreshToken: string,
  userAgent?: string
) {
  const tokenHash = await sha256Hex(refreshToken)

  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.refreshTokenHash, tokenHash),
        isNull(sessions.revokedAt)
      )
    )
    .limit(1)

  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    throw new UnauthorizedError('Invalid or expired refresh token.')
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  if (!user || user.isSuspended) {
    throw new UnauthorizedError('Account is no longer active.')
  }

  // Rotate refresh token
  const newRefreshToken = generateRandomToken(32)
  const newRefreshTokenHash = await sha256Hex(newRefreshToken)
  const newExpiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_TTL_SECONDS * 1000
  ).toISOString()

  await db
    .update(sessions)
    .set({
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
      userAgent: userAgent ?? session.userAgent,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sessions.id, session.id))

  const accessToken = await signAccessToken(
    {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function logoutUserSession(db: Database, sessionId: string) {
  const now = new Date().toISOString()
  await db
    .update(sessions)
    .set({
      revokedAt: now,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))

  return { logged_out: true }
}

