import { createElement } from 'react'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  ACCOUNT_TYPES,
  ADMIN_ROLES,
  AUTH_CONFIG,
  CODE_PURPOSES,
} from '../../config/constants'
import type { AppBindings } from '../../config/env'
import type { Database } from '../../database'
import {
  adminUsers,
  adminVerificationCodes,
  type AdminUser,
} from '../../models'
import { PasswordResetEmail } from '../../templates'
import {
  generateOtpCode,
  hashOtpCode,
  hashPassword,
  signAccessToken,
  verifyPassword,
} from '../../utils/crypto'
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errors'
import type {
  ChangePasswordInput,
  CreateAdminInput,
  ForgotPasswordInput,
  LoginInput,
  PaginationQueryInput,
  ResetPasswordInput,
  UpdateAdminInput,
  UpdateAdminSuspensionInput,
} from '../../utils/validators'
import { sendEmail } from '../email.service'

export function sanitizeAdmin(admin: AdminUser) {
  return {
    id: admin.id,
    account_type: ACCOUNT_TYPES.ADMIN,
    role: admin.role,
    full_name: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    avatar_url: admin.avatarUrl,
    is_suspended: admin.isSuspended,
    created_at: admin.createdAt,
    updated_at: admin.updatedAt,
  }
}

async function buildAdminAuthPayload(admin: AdminUser, env: AppBindings) {
  const expiresInSeconds = env.JWT_EXPIRES_IN_SECONDS
    ? Number(env.JWT_EXPIRES_IN_SECONDS)
    : AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS

  const accessToken = await signAccessToken(
    {
      userId: admin.id,
      email: admin.email,
      accountType: ACCOUNT_TYPES.ADMIN,
      tokenVersion: admin.tokenVersion,
    },
    env.JWT_SECRET,
    expiresInSeconds
  )

  return {
    user: sanitizeAdmin(admin),
    access_token: accessToken,
    token_type: 'Bearer' as const,
    expires_in: expiresInSeconds,
  }
}

async function issueAdminCode(db: Database, adminId: string): Promise<string> {
  const nowIso = new Date().toISOString()

  await db
    .update(adminVerificationCodes)
    .set({ usedAt: nowIso })
    .where(
      and(
        eq(adminVerificationCodes.adminId, adminId),
        eq(adminVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(adminVerificationCodes.usedAt)
      )
    )

  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
  ).toISOString()

  await db.insert(adminVerificationCodes).values({
    adminId,
    codeHash,
    purpose: CODE_PURPOSES.PASSWORD_RESET,
    expiresAt,
    attempts: 0,
    maxAttempts: AUTH_CONFIG.MAX_CODE_ATTEMPTS,
  })

  return code
}

async function consumeAdminCode(
  db: Database,
  adminId: string,
  code: string
): Promise<void> {
  const [latestCode] = await db
    .select()
    .from(adminVerificationCodes)
    .where(
      and(
        eq(adminVerificationCodes.adminId, adminId),
        eq(adminVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(adminVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(adminVerificationCodes.createdAt))
    .limit(1)

  if (!latestCode) {
    throw new UnauthorizedError('Invalid or expired password reset code.')
  }

  if (new Date(latestCode.expiresAt).getTime() < Date.now()) {
    throw new UnauthorizedError(
      'This password reset code has expired. Please request a new code.'
    )
  }

  if (latestCode.attempts >= latestCode.maxAttempts) {
    throw new ForbiddenError(
      'Maximum verification attempts exceeded. Please request a new code.'
    )
  }

  const candidateHash = await hashOtpCode(code)
  if (candidateHash !== latestCode.codeHash) {
    await db
      .update(adminVerificationCodes)
      .set({ attempts: latestCode.attempts + 1 })
      .where(eq(adminVerificationCodes.id, latestCode.id))
    throw new UnauthorizedError('Invalid password reset code.')
  }

  await db
    .update(adminVerificationCodes)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(adminVerificationCodes.id, latestCode.id))
}

/**
 * Authenticate an Admin (`super_admin` or `admin`)
 */
export async function loginAdmin(
  db: Database,
  env: AppBindings,
  input: LoginInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email))
    .limit(1)

  if (!admin) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  if (admin.isSuspended) {
    throw new ForbiddenError('Your administrator account has been suspended.')
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    admin.passwordHash
  )
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  return buildAdminAuthPayload(admin, env)
}

/**
 * Send a 6-digit password reset code to an Admin
 */
export async function forgotAdminPassword(
  db: Database,
  env: AppBindings,
  input: ForgotPasswordInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email))
    .limit(1)

  if (admin && !admin.isSuspended) {
    const code = await issueAdminCode(db, admin.id)

    await sendEmail(env, {
      to: admin.email,
      subject: `${code} is your Oruvia Admin password reset code`,
      template: createElement(PasswordResetEmail, {
        code,
        accountType: 'admin',
      }),
    })
  }

  return {
    message:
      'If an administrator account with that email exists, a 6-digit password reset code has been sent.',
  }
}

/**
 * Reset Admin password with 6-digit code and revoke active tokens
 */
export async function resetAdminPassword(
  db: Database,
  env: AppBindings,
  input: ResetPasswordInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email))
    .limit(1)

  if (!admin) {
    throw new UnauthorizedError('Invalid email or password reset code.')
  }

  if (admin.isSuspended) {
    throw new ForbiddenError('Your administrator account has been suspended.')
  }

  await consumeAdminCode(db, admin.id, input.code)

  const newPasswordHash = await hashPassword(input.new_password)
  const [updated] = await db
    .update(adminUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: admin.tokenVersion + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(adminUsers.id, admin.id))
    .returning()

  return buildAdminAuthPayload(updated, env)
}

/**
 * Change authenticated Admin password and revoke older tokens
 */
export async function changeAdminPassword(
  db: Database,
  env: AppBindings,
  adminId: string,
  input: ChangePasswordInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  if (!admin) {
    throw new NotFoundError('Administrator account not found.')
  }

  const isCurrentValid = await verifyPassword(
    input.current_password,
    admin.passwordHash
  )
  if (!isCurrentValid) {
    throw new UnauthorizedError('Your current password is incorrect.')
  }

  const newPasswordHash = await hashPassword(input.new_password)
  const [updated] = await db
    .update(adminUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: admin.tokenVersion + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(adminUsers.id, admin.id))
    .returning()

  return buildAdminAuthPayload(updated, env)
}

/**
 * Get authenticated Admin profile
 */
export async function getAdminById(db: Database, adminId: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  if (!admin) {
    throw new NotFoundError('Administrator account not found.')
  }

  return sanitizeAdmin(admin)
}

/**
 * Update authenticated Admin profile
 */
export async function updateAdminProfile(
  db: Database,
  adminId: string,
  input: UpdateAdminInput
) {
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Administrator account not found.')
  }

  const updateFields: Partial<typeof adminUsers.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.full_name !== undefined) updateFields.fullName = input.full_name
  if (input.phone !== undefined) updateFields.phone = input.phone
  if (input.avatar_url !== undefined) updateFields.avatarUrl = input.avatar_url

  const [updated] = await db
    .update(adminUsers)
    .set(updateFields)
    .where(eq(adminUsers.id, adminId))
    .returning()

  return sanitizeAdmin(updated)
}

/**
 * Create a new Admin account (Super Admin only)
 */
export async function createAdmin(db: Database, input: CreateAdminInput) {
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email))
    .limit(1)

  if (existing) {
    throw new ValidationError([
      {
        field: 'email',
        issue: 'An administrator account with this email already exists.',
      },
    ])
  }

  const passwordHash = await hashPassword(input.password)

  const [created] = await db
    .insert(adminUsers)
    .values({
      fullName: input.full_name,
      email: input.email,
      phone: input.phone ?? null,
      role: ADMIN_ROLES.ADMIN,
      passwordHash,
      tokenVersion: 0,
      isSuspended: false,
    })
    .returning()

  return sanitizeAdmin(created)
}

/**
 * List all Admin accounts (Super Admin only)
 */
export async function listAdmins(db: Database, query: PaginationQueryInput) {
  const offset = (query.page - 1) * query.per_page

  const rows = await db
    .select()
    .from(adminUsers)
    .orderBy(desc(adminUsers.createdAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminUsers)

  return {
    items: rows.map(sanitizeAdmin),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Suspend or unsuspend a regular Admin account (Super Admin only)
 */
export async function updateAdminSuspension(
  db: Database,
  superAdminId: string,
  targetAdminId: string,
  input: UpdateAdminSuspensionInput
) {
  if (superAdminId === targetAdminId) {
    throw new ForbiddenError('You cannot suspend your own Super Admin account.')
  }

  const [target] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, targetAdminId))
    .limit(1)

  if (!target) {
    throw new NotFoundError('Administrator account not found.')
  }

  if (target.role === ADMIN_ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Super Administrator accounts cannot be suspended.')
  }

  const nowIso = new Date().toISOString()
  const [updated] = await db
    .update(adminUsers)
    .set({
      isSuspended: input.is_suspended,
      tokenVersion: input.is_suspended
        ? target.tokenVersion + 1
        : target.tokenVersion,
      updatedAt: nowIso,
    })
    .where(eq(adminUsers.id, targetAdminId))
    .returning()

  return sanitizeAdmin(updated)
}
