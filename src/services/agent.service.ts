import { createElement } from 'react'
import { and, desc, eq, isNull } from 'drizzle-orm'
import {
  ACCOUNT_TYPES,
  AUTH_CONFIG,
  CODE_PURPOSES,
} from '../config/constants'
import type { AppBindings } from '../config/env'
import type { Database } from '../database'
import {
  agentUsers,
  agentVerificationCodes,
  type AgentUser,
} from '../models'
import { PasswordResetEmail, VerificationEmail } from '../templates'
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
  ForgotPasswordInput,
  LoginInput,
  RegisterAgentInput,
  ResendVerificationCodeInput,
  ResetPasswordInput,
  UpdateAgentInput,
  VerifyEmailInput,
} from '../utils/validators'
import { sendEmail } from './email.service'

export function toAgentProfile(agent: AgentUser) {
  return {
    id: agent.id,
    account_type: ACCOUNT_TYPES.AGENT,
    full_name: agent.fullName,
    email: agent.email,
    phone: agent.phone,
    whatsapp_number: agent.whatsappNumber,
    agency_name: agent.agencyName,
    license_number: agent.licenseNumber,
    bio: agent.bio,
    avatar_url: agent.avatarUrl,
    is_email_verified: agent.isEmailVerified,
    email_verified_at: agent.emailVerifiedAt,
    is_verified: agent.isVerified,
    verification_status: agent.verificationStatus,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  }
}

async function createAndSendAgentCode(
  db: Database,
  env: AppBindings,
  agent: AgentUser,
  purpose: typeof CODE_PURPOSES.EMAIL_VERIFICATION | typeof CODE_PURPOSES.PASSWORD_RESET
) {
  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + AUTH_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
  ).toISOString()

  await db
    .update(agentVerificationCodes)
    .set({ usedAt: now.toISOString() })
    .where(
      and(
        eq(agentVerificationCodes.agentId, agent.id),
        eq(agentVerificationCodes.purpose, purpose),
        isNull(agentVerificationCodes.usedAt)
      )
    )

  await db.insert(agentVerificationCodes).values({
    agentId: agent.id,
    codeHash,
    purpose,
    expiresAt,
  })

  const template =
    purpose === CODE_PURPOSES.EMAIL_VERIFICATION
      ? createElement(VerificationEmail, { code, accountType: 'agent' })
      : createElement(PasswordResetEmail, { code, accountType: 'agent' })

  const subject =
    purpose === CODE_PURPOSES.EMAIL_VERIFICATION
      ? 'Verify your Oruvia Agent account'
      : 'Reset your Oruvia Agent password'

  await sendEmail(env, {
    to: agent.email,
    subject,
    template,
  })
}

export async function registerAgent(
  db: Database,
  env: AppBindings,
  input: RegisterAgentInput
) {
  const [existing] = await db
    .select({ id: agentUsers.id })
    .from(agentUsers)
    .where(eq(agentUsers.email, input.email))
    .limit(1)

  if (existing) {
    throw new ConflictError('The email address provided is already registered.', [
      {
        field: 'email',
        issue: 'The email address provided is already registered.',
      },
    ])
  }

  const agentId = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password)

  await db.insert(agentUsers).values({
    id: agentId,
    fullName: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    whatsappNumber: input.whatsapp_number ?? null,
    agencyName: input.agency_name ?? null,
    licenseNumber: input.license_number ?? null,
    bio: input.bio ?? null,
    passwordHash,
  })

  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, agentId))
    .limit(1)

  await createAndSendAgentCode(
    db,
    env,
    agent,
    CODE_PURPOSES.EMAIL_VERIFICATION
  )

  const accessToken = await signAccessToken(
    {
      userId: agent.id,
      email: agent.email,
      accountType: ACCOUNT_TYPES.AGENT,
      tokenVersion: agent.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    agent: toAgentProfile(agent),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function verifyAgentEmail(db: Database, input: VerifyEmailInput) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.email, input.email))
    .limit(1)

  if (!agent) {
    throw new BadRequestError('Invalid or expired verification code.')
  }

  if (agent.isEmailVerified) {
    return {
      message: 'Email is already verified.',
      agent: toAgentProfile(agent),
    }
  }

  const [codeRecord] = await db
    .select()
    .from(agentVerificationCodes)
    .where(
      and(
        eq(agentVerificationCodes.agentId, agent.id),
        eq(agentVerificationCodes.purpose, CODE_PURPOSES.EMAIL_VERIFICATION),
        isNull(agentVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(agentVerificationCodes.createdAt))
    .limit(1)

  if (!codeRecord) {
    throw new BadRequestError('Invalid or expired verification code.')
  }

  if (codeRecord.attempts >= codeRecord.maxAttempts) {
    throw new BadRequestError(
      'Maximum verification attempts exceeded. Please request a new code.'
    )
  }

  if (new Date(codeRecord.expiresAt).getTime() <= Date.now()) {
    throw new BadRequestError(
      'Verification code has expired. Please request a new code.'
    )
  }

  const isValid = await verifyOtpCode(input.code, codeRecord.codeHash)
  if (!isValid) {
    await db
      .update(agentVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(agentVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid verification code.')
  }

  const now = new Date().toISOString()
  await db
    .update(agentVerificationCodes)
    .set({ usedAt: now })
    .where(eq(agentVerificationCodes.id, codeRecord.id))

  await db
    .update(agentUsers)
    .set({
      isEmailVerified: true,
      emailVerifiedAt: now,
      updatedAt: now,
    })
    .where(eq(agentUsers.id, agent.id))

  const [updatedAgent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, agent.id))
    .limit(1)

  return {
    message: 'Email verified successfully.',
    agent: toAgentProfile(updatedAgent),
  }
}

export async function resendAgentVerificationCode(
  db: Database,
  env: AppBindings,
  input: ResendVerificationCodeInput
) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.email, input.email))
    .limit(1)

  if (!agent || agent.isEmailVerified) {
    return {
      message:
        'If an unverified agent account exists for this email, a new verification code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(agentVerificationCodes)
    .where(
      and(
        eq(agentVerificationCodes.agentId, agent.id),
        eq(agentVerificationCodes.purpose, CODE_PURPOSES.EMAIL_VERIFICATION)
      )
    )
    .orderBy(desc(agentVerificationCodes.createdAt))
    .limit(1)

  if (latestCode) {
    const elapsedSeconds =
      (Date.now() - new Date(latestCode.createdAt).getTime()) / 1000
    if (elapsedSeconds < AUTH_CONFIG.CODE_RESEND_COOLDOWN_SECONDS) {
      throw new AppError(
        'Please wait 60 seconds before requesting another verification code.',
        429,
        'TOO_MANY_REQUESTS'
      )
    }
  }

  await createAndSendAgentCode(
    db,
    env,
    agent,
    CODE_PURPOSES.EMAIL_VERIFICATION
  )

  return {
    message:
      'If an unverified agent account exists for this email, a new verification code has been sent.',
  }
}

export async function loginAgent(
  db: Database,
  env: AppBindings,
  input: LoginInput
) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.email, input.email))
    .limit(1)

  if (!agent) {
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH)
    throw new UnauthorizedError('Invalid email or password.')
  }

  if (agent.isSuspended) {
    throw new ForbiddenError('Your agent account has been suspended.')
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    agent.passwordHash
  )
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  const accessToken = await signAccessToken(
    {
      userId: agent.id,
      email: agent.email,
      accountType: ACCOUNT_TYPES.AGENT,
      tokenVersion: agent.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    agent: toAgentProfile(agent),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function forgotAgentPassword(
  db: Database,
  env: AppBindings,
  input: ForgotPasswordInput
) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.email, input.email))
    .limit(1)

  if (!agent) {
    return {
      message:
        'If an agent account exists for this email, a password reset code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(agentVerificationCodes)
    .where(
      and(
        eq(agentVerificationCodes.agentId, agent.id),
        eq(agentVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET)
      )
    )
    .orderBy(desc(agentVerificationCodes.createdAt))
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

  await createAndSendAgentCode(db, env, agent, CODE_PURPOSES.PASSWORD_RESET)

  return {
    message:
      'If an agent account exists for this email, a password reset code has been sent.',
  }
}

export async function resetAgentPassword(
  db: Database,
  input: ResetPasswordInput
) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.email, input.email))
    .limit(1)

  if (!agent) {
    throw new BadRequestError('Invalid or expired password reset code.')
  }

  const [codeRecord] = await db
    .select()
    .from(agentVerificationCodes)
    .where(
      and(
        eq(agentVerificationCodes.agentId, agent.id),
        eq(agentVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(agentVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(agentVerificationCodes.createdAt))
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
      .update(agentVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(agentVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid password reset code.')
  }

  const now = new Date().toISOString()
  const newPasswordHash = await hashPassword(input.new_password)

  await db
    .update(agentVerificationCodes)
    .set({ usedAt: now })
    .where(eq(agentVerificationCodes.id, codeRecord.id))

  await db
    .update(agentUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: agent.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(agentUsers.id, agent.id))

  return {
    message: 'Password reset successfully.',
  }
}

export async function changeAgentPassword(
  db: Database,
  agentId: string,
  input: ChangePasswordInput
) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, agentId))
    .limit(1)

  if (!agent) {
    throw new NotFoundError('Agent')
  }

  const isCurrentValid = await verifyPassword(
    input.current_password,
    agent.passwordHash
  )
  if (!isCurrentValid) {
    throw new UnauthorizedError('Current password is incorrect.', [
      { field: 'current_password', issue: 'Current password is incorrect.' },
    ])
  }

  const newPasswordHash = await hashPassword(input.new_password)
  const now = new Date().toISOString()

  await db
    .update(agentUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: agent.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(agentUsers.id, agentId))

  return {
    message: 'Password changed successfully.',
  }
}

export async function getAgentProfile(db: Database, agentId: string) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, agentId))
    .limit(1)

  if (!agent) {
    throw new NotFoundError('Agent')
  }

  return toAgentProfile(agent)
}

export async function updateAgentProfile(
  db: Database,
  agentId: string,
  input: UpdateAgentInput
) {
  const [agent] = await db
    .select()
    .from(agentUsers)
    .where(eq(agentUsers.id, agentId))
    .limit(1)

  if (!agent) {
    throw new NotFoundError('Agent')
  }

  await db
    .update(agentUsers)
    .set({
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.whatsapp_number !== undefined
        ? { whatsappNumber: input.whatsapp_number }
        : {}),
      ...(input.agency_name !== undefined
        ? { agencyName: input.agency_name }
        : {}),
      ...(input.license_number !== undefined
        ? { licenseNumber: input.license_number }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(agentUsers.id, agentId))

  return getAgentProfile(db, agentId)
}

