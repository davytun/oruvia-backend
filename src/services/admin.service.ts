import { createElement } from 'react'
import { and, count, desc, eq, isNull } from 'drizzle-orm'
import {
  ACCOUNT_TYPES,
  AUTH_CONFIG,
  CODE_PURPOSES,
  VERIFICATION_STATUSES,
} from '../config/constants'
import type { AppBindings } from '../config/env'
import type { Database } from '../database'
import {
  adminUsers,
  adminVerificationCodes,
  agentKycSubmissions,
  agentUsers,
  landlordKycSubmissions,
  landlordUsers,
  seekerUsers,
  type AdminUser,
} from '../models'
import { NotificationEmail, PasswordResetEmail } from '../templates'
import {
  DUMMY_PASSWORD_HASH,
  generateOtpCode,
  hashOtpCode,
  hashPassword,
  signAccessToken,
  verifyOtpCode,
  verifyPassword,
} from '../utils/crypto'
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors'
import type {
  ChangePasswordInput,
  CreateAdminInput,
  ForgotPasswordInput,
  KycListQueryInput,
  LoginInput,
  PaginationQueryInput,
  ResetPasswordInput,
  ReviewKycInput,
  UpdateAdminInput,
  UpdateUserSuspensionInput,
} from '../utils/validators'
import { toAgentKycRecord, toAgentProfile } from './agent.service'
import { sendEmail } from './email.service'
import { toLandlordKycRecord, toLandlordProfile } from './landlord.service'
import { toSeekerProfile } from './seeker.service'

export function toAdminProfile(admin: AdminUser) {
  return {
    id: admin.id,
    account_type: ACCOUNT_TYPES.ADMIN,
    full_name: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    avatar_url: admin.avatarUrl,
    is_suspended: admin.isSuspended,
    created_at: admin.createdAt,
    updated_at: admin.updatedAt,
  }
}

async function createAndSendAdminResetCode(
  db: Database,
  env: AppBindings,
  admin: AdminUser
) {
  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + AUTH_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
  ).toISOString()

  await db
    .update(adminVerificationCodes)
    .set({ usedAt: now.toISOString() })
    .where(
      and(
        eq(adminVerificationCodes.adminId, admin.id),
        eq(adminVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(adminVerificationCodes.usedAt)
      )
    )

  await db.insert(adminVerificationCodes).values({
    adminId: admin.id,
    codeHash,
    purpose: CODE_PURPOSES.PASSWORD_RESET,
    expiresAt,
  })

  await sendEmail(env, {
    to: admin.email,
    subject: 'Reset your Oruvia Administrator password',
    template: createElement(PasswordResetEmail, {
      code,
      accountType: 'admin',
    }),
  })
}

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
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH)
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

  const accessToken = await signAccessToken(
    {
      userId: admin.id,
      email: admin.email,
      accountType: ACCOUNT_TYPES.ADMIN,
      tokenVersion: admin.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    admin: toAdminProfile(admin),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function createAdminUser(db: Database, input: CreateAdminInput) {
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email))
    .limit(1)

  if (existing) {
    throw new ConflictError(
      'The email address provided is already registered.',
      [
        {
          field: 'email',
          issue: 'The email address provided is already registered.',
        },
      ]
    )
  }

  const adminId = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password)

  await db.insert(adminUsers).values({
    id: adminId,
    fullName: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    passwordHash,
  })

  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  return toAdminProfile(admin)
}

export async function listAdminUsers(
  db: Database,
  query: PaginationQueryInput
) {
  const offset = (query.page - 1) * query.per_page

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(adminUsers),
    db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt))
      .limit(query.per_page)
      .offset(offset),
  ])

  return {
    items: rows.map(toAdminProfile),
    total: totalRow?.total ?? 0,
  }
}

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

  if (!admin) {
    return {
      message:
        'If an administrator account exists for this email, a password reset code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(adminVerificationCodes)
    .where(
      and(
        eq(adminVerificationCodes.adminId, admin.id),
        eq(adminVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET)
      )
    )
    .orderBy(desc(adminVerificationCodes.createdAt))
    .limit(1)

  if (latestCode) {
    const elapsedSeconds =
      (Date.now() - new Date(latestCode.createdAt).getTime()) / 1000
    if (elapsedSeconds < AUTH_CONFIG.CODE_RESEND_COOLDOWN_SECONDS) {
      throw new AppError(
        'Please wait 60 seconds before requesting another password reset code.',
        429,
        'TOO_MANY_REQUESTS'
      )
    }
  }

  await createAndSendAdminResetCode(db, env, admin)

  return {
    message:
      'If an administrator account exists for this email, a password reset code has been sent.',
  }
}

export async function resetAdminPassword(
  db: Database,
  input: ResetPasswordInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, input.email))
    .limit(1)

  if (!admin) {
    throw new BadRequestError('Invalid or expired password reset code.')
  }

  const [codeRecord] = await db
    .select()
    .from(adminVerificationCodes)
    .where(
      and(
        eq(adminVerificationCodes.adminId, admin.id),
        eq(adminVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(adminVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(adminVerificationCodes.createdAt))
    .limit(1)

  if (!codeRecord) {
    throw new BadRequestError('Invalid or expired password reset code.')
  }

  if (codeRecord.attempts >= codeRecord.maxAttempts) {
    throw new BadRequestError(
      'Maximum reset attempts exceeded. Please request a new code.'
    )
  }

  if (new Date(codeRecord.expiresAt).getTime() <= Date.now()) {
    throw new BadRequestError(
      'Password reset code has expired. Please request a new code.'
    )
  }

  const isValid = await verifyOtpCode(input.code, codeRecord.codeHash)
  if (!isValid) {
    await db
      .update(adminVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(adminVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid password reset code.')
  }

  const now = new Date().toISOString()
  const newPasswordHash = await hashPassword(input.new_password)

  await db
    .update(adminVerificationCodes)
    .set({ usedAt: now })
    .where(eq(adminVerificationCodes.id, codeRecord.id))

  await db
    .update(adminUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: admin.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(adminUsers.id, admin.id))

  return {
    message: 'Password reset successfully.',
  }
}

export async function changeAdminPassword(
  db: Database,
  adminId: string,
  input: ChangePasswordInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  if (!admin) {
    throw new NotFoundError('Administrator')
  }

  const isCurrentValid = await verifyPassword(
    input.current_password,
    admin.passwordHash
  )
  if (!isCurrentValid) {
    throw new UnauthorizedError('Current password is incorrect.', [
      { field: 'current_password', issue: 'Current password is incorrect.' },
    ])
  }

  const newPasswordHash = await hashPassword(input.new_password)
  const now = new Date().toISOString()

  await db
    .update(adminUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: admin.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(adminUsers.id, adminId))

  return {
    message: 'Password changed successfully.',
  }
}

export async function getAdminProfile(db: Database, adminId: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  if (!admin) {
    throw new NotFoundError('Administrator')
  }

  return toAdminProfile(admin)
}

export async function updateAdminProfile(
  db: Database,
  adminId: string,
  input: UpdateAdminInput
) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1)

  if (!admin) {
    throw new NotFoundError('Administrator')
  }

  await db
    .update(adminUsers)
    .set({
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.avatar_url !== undefined
        ? { avatarUrl: input.avatar_url }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(adminUsers.id, adminId))

  return getAdminProfile(db, adminId)
}

export async function listAgentKycSubmissions(
  db: Database,
  query: KycListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const whereClause = query.status
    ? eq(agentKycSubmissions.status, query.status)
    : undefined

  const [[totalRow], submissions] = await Promise.all([
    db
      .select({ total: count() })
      .from(agentKycSubmissions)
      .where(whereClause),
    db
      .select()
      .from(agentKycSubmissions)
      .where(whereClause)
      .orderBy(desc(agentKycSubmissions.submittedAt))
      .limit(query.per_page)
      .offset(offset),
  ])

  return {
    items: submissions.map(toAgentKycRecord),
    total: totalRow?.total ?? 0,
  }
}

export async function reviewAgentKycSubmission(
  db: Database,
  env: AppBindings,
  submissionId: string,
  input: ReviewKycInput
) {
  const [submission] = await db
    .select()
    .from(agentKycSubmissions)
    .where(eq(agentKycSubmissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw new NotFoundError('Agent KYC submission')
  }

  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, submission.agentId))
    .limit(1)

  if (!agent) {
    throw new NotFoundError('Agent')
  }

  const now = new Date().toISOString()
  const isApproved = input.status === VERIFICATION_STATUSES.APPROVED
  const activeBadge = isApproved ? submission.qualifiedBadge : null

  await db
    .update(agentKycSubmissions)
    .set({
      status: input.status,
      rejectionReason: isApproved ? null : (input.rejection_reason ?? null),
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(agentKycSubmissions.id, submission.id))

  await db
    .update(agentUsers)
    .set({
      isVerified: isApproved,
      verificationStatus: input.status,
      verificationBadge: activeBadge,
      updatedAt: now,
    })
    .where(eq(agentUsers.id, agent.id))

  await sendEmail(env, {
    to: agent.email,
    subject: isApproved
      ? 'Your Oruvia Agent KYC has been approved'
      : 'Update on your Oruvia Agent KYC submission',
    template: createElement(NotificationEmail, {
      recipientName: agent.fullName,
      title: isApproved ? 'Agent KYC Approved' : 'Agent KYC Requires Attention',
      message: isApproved
        ? `Congratulations! Your agent verification has been approved. Your profile and listings now carry the "${activeBadge}" badge.`
        : `Your KYC submission could not be approved at this time. Please review the reason below and resubmit your documents.`,
      metadata: isApproved
        ? [
            { label: 'Status', value: 'Approved' },
            { label: 'Active Badge', value: activeBadge || 'verified_agent' },
          ]
        : [
            { label: 'Status', value: 'Rejected' },
            {
              label: 'Reason',
              value: input.rejection_reason || 'Document verification failed',
            },
          ],
    }),
  })

  const [updatedSubmission] = await db
    .select()
    .from(agentKycSubmissions)
    .where(eq(agentKycSubmissions.id, submission.id))
    .limit(1)

  const [updatedAgent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, agent.id))
    .limit(1)

  return {
    agent: toAgentProfile(updatedAgent),
    kyc_submission: toAgentKycRecord(updatedSubmission),
  }
}

export async function listLandlordKycSubmissions(
  db: Database,
  query: KycListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const whereClause = query.status
    ? eq(landlordKycSubmissions.status, query.status)
    : undefined

  const [[totalRow], submissions] = await Promise.all([
    db
      .select({ total: count() })
      .from(landlordKycSubmissions)
      .where(whereClause),
    db
      .select()
      .from(landlordKycSubmissions)
      .where(whereClause)
      .orderBy(desc(landlordKycSubmissions.submittedAt))
      .limit(query.per_page)
      .offset(offset),
  ])

  return {
    items: submissions.map(toLandlordKycRecord),
    total: totalRow?.total ?? 0,
  }
}

export async function reviewLandlordKycSubmission(
  db: Database,
  env: AppBindings,
  submissionId: string,
  input: ReviewKycInput
) {
  const [submission] = await db
    .select()
    .from(landlordKycSubmissions)
    .where(eq(landlordKycSubmissions.id, submissionId))
    .limit(1)

  if (!submission) {
    throw new NotFoundError('Landlord KYC submission')
  }

  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, submission.landlordId))
    .limit(1)

  if (!landlord) {
    throw new NotFoundError('Landlord')
  }

  const now = new Date().toISOString()
  const isApproved = input.status === VERIFICATION_STATUSES.APPROVED
  const activeBadge = isApproved ? submission.qualifiedBadge : null

  await db
    .update(landlordKycSubmissions)
    .set({
      status: input.status,
      rejectionReason: isApproved ? null : (input.rejection_reason ?? null),
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(landlordKycSubmissions.id, submission.id))

  await db
    .update(landlordUsers)
    .set({
      isVerified: isApproved,
      verificationStatus: input.status,
      verificationBadge: activeBadge,
      updatedAt: now,
    })
    .where(eq(landlordUsers.id, landlord.id))

  await sendEmail(env, {
    to: landlord.email,
    subject: isApproved
      ? 'Your Oruvia Landlord KYC has been approved'
      : 'Update on your Oruvia Landlord KYC submission',
    template: createElement(NotificationEmail, {
      recipientName: landlord.fullName,
      title: isApproved
        ? 'Landlord KYC Approved'
        : 'Landlord KYC Requires Attention',
      message: isApproved
        ? `Congratulations! Your landlord verification has been approved. Your profile and listings now carry the "${activeBadge}" badge.`
        : `Your KYC submission could not be approved at this time. Please review the reason below and resubmit your documents.`,
      metadata: isApproved
        ? [
            { label: 'Status', value: 'Approved' },
            {
              label: 'Active Badge',
              value: activeBadge || 'verified_landlord',
            },
          ]
        : [
            { label: 'Status', value: 'Rejected' },
            {
              label: 'Reason',
              value: input.rejection_reason || 'Document verification failed',
            },
          ],
    }),
  })

  const [updatedSubmission] = await db
    .select()
    .from(landlordKycSubmissions)
    .where(eq(landlordKycSubmissions.id, submission.id))
    .limit(1)

  const [updatedLandlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, landlord.id))
    .limit(1)

  return {
    landlord: toLandlordProfile(updatedLandlord),
    kyc_submission: toLandlordKycRecord(updatedSubmission),
  }
}

export async function listUsersByRole(
  db: Database,
  role: 'seekers' | 'agents' | 'landlords',
  query: PaginationQueryInput
) {
  const offset = (query.page - 1) * query.per_page

  if (role === 'seekers') {
    const [[totalRow], rows] = await Promise.all([
      db.select({ total: count() }).from(seekerUsers),
      db
        .select()
        .from(seekerUsers)
        .orderBy(desc(seekerUsers.createdAt))
        .limit(query.per_page)
        .offset(offset),
    ])
    return {
      items: rows.map((row) => ({
        ...toSeekerProfile(row),
        is_suspended: row.isSuspended,
      })),
      total: totalRow?.total ?? 0,
    }
  }

  if (role === 'agents') {
    const [[totalRow], rows] = await Promise.all([
      db.select({ total: count() }).from(agentUsers),
      db
        .select()
        .from(agentUsers)
        .orderBy(desc(agentUsers.createdAt))
        .limit(query.per_page)
        .offset(offset),
    ])
    return {
      items: rows.map((row) => ({
        ...toAgentProfile(row),
        is_suspended: row.isSuspended,
      })),
      total: totalRow?.total ?? 0,
    }
  }

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(landlordUsers),
    db
      .select()
      .from(landlordUsers)
      .orderBy(desc(landlordUsers.createdAt))
      .limit(query.per_page)
      .offset(offset),
  ])
  return {
    items: rows.map((row) => ({
      ...toLandlordProfile(row),
      is_suspended: row.isSuspended,
    })),
    total: totalRow?.total ?? 0,
  }
}

export async function updateUserSuspensionStatus(
  db: Database,
  role: 'seekers' | 'agents' | 'landlords',
  userId: string,
  input: UpdateUserSuspensionInput
) {
  const now = new Date().toISOString()

  if (role === 'seekers') {
    const [seeker] = await db
      .select()
      .from(seekerUsers)
      .where(eq(seekerUsers.id, userId))
      .limit(1)

    if (!seeker) throw new NotFoundError('Seeker')

    await db
      .update(seekerUsers)
      .set({
        isSuspended: input.is_suspended,
        ...(input.is_suspended ? { tokenVersion: seeker.tokenVersion + 1 } : {}),
        updatedAt: now,
      })
      .where(eq(seekerUsers.id, userId))

    const [updated] = await db
      .select()
      .from(seekerUsers)
      .where(eq(seekerUsers.id, userId))
      .limit(1)

    return {
      ...toSeekerProfile(updated),
      is_suspended: updated.isSuspended,
    }
  }

  if (role === 'agents') {
    const [agent] = await db
      .select()
      .from(agentUsers)
      .where(eq(agentUsers.id, userId))
      .limit(1)

    if (!agent) throw new NotFoundError('Agent')

    await db
      .update(agentUsers)
      .set({
        isSuspended: input.is_suspended,
        ...(input.is_suspended ? { tokenVersion: agent.tokenVersion + 1 } : {}),
        updatedAt: now,
      })
      .where(eq(agentUsers.id, userId))

    const [updated] = await db
      .select()
      .from(agentUsers)
      .where(eq(agentUsers.id, userId))
      .limit(1)

    return {
      ...toAgentProfile(updated),
      is_suspended: updated.isSuspended,
    }
  }

  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, userId))
    .limit(1)

  if (!landlord) throw new NotFoundError('Landlord')

  await db
    .update(landlordUsers)
    .set({
      isSuspended: input.is_suspended,
      ...(input.is_suspended
        ? { tokenVersion: landlord.tokenVersion + 1 }
        : {}),
      updatedAt: now,
    })
    .where(eq(landlordUsers.id, userId))

  const [updated] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, userId))
    .limit(1)

  return {
    ...toLandlordProfile(updated),
    is_suspended: updated.isSuspended,
  }
}

