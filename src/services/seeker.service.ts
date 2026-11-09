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
  seekerUsers,
  seekerVerificationCodes,
  type SeekerUser,
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
  RegisterSeekerInput,
  ResendVerificationCodeInput,
  ResetPasswordInput,
  UpdateSeekerInput,
  VerifyEmailInput,
} from '../utils/validators'
import { sendEmail } from './email.service'

export function toSeekerProfile(seeker: SeekerUser) {
  return {
    id: seeker.id,
    account_type: ACCOUNT_TYPES.SEEKER,
    full_name: seeker.fullName,
    email: seeker.email,
    phone: seeker.phone,
    avatar_url: seeker.avatarUrl,
    preferred_location: seeker.preferredLocation,
    is_email_verified: seeker.isEmailVerified,
    email_verified_at: seeker.emailVerifiedAt,
    created_at: seeker.createdAt,
    updated_at: seeker.updatedAt,
  }
}

async function createAndSendSeekerCode(
  db: Database,
  env: AppBindings,
  seeker: SeekerUser,
  purpose: typeof CODE_PURPOSES.EMAIL_VERIFICATION | typeof CODE_PURPOSES.PASSWORD_RESET
) {
  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + AUTH_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
  ).toISOString()

  // Invalidate any previous unused codes for this purpose
  await db
    .update(seekerVerificationCodes)
    .set({ usedAt: now.toISOString() })
    .where(
      and(
        eq(seekerVerificationCodes.seekerId, seeker.id),
        eq(seekerVerificationCodes.purpose, purpose),
        isNull(seekerVerificationCodes.usedAt)
      )
    )

  await db.insert(seekerVerificationCodes).values({
    seekerId: seeker.id,
    codeHash,
    purpose,
    expiresAt,
  })

  const template =
    purpose === CODE_PURPOSES.EMAIL_VERIFICATION
      ? createElement(VerificationEmail, { code, accountType: 'seeker' })
      : createElement(PasswordResetEmail, { code, accountType: 'seeker' })

  const subject =
    purpose === CODE_PURPOSES.EMAIL_VERIFICATION
      ? 'Verify your Oruvia Seeker account'
      : 'Reset your Oruvia Seeker password'

  await sendEmail(env, {
    to: seeker.email,
    subject,
    template,
  })
}

export async function registerSeeker(
  db: Database,
  env: AppBindings,
  input: RegisterSeekerInput
) {
  const [existing] = await db
    .select({ id: seekerUsers.id })
    .from(seekerUsers)
    .where(eq(seekerUsers.email, input.email))
    .limit(1)

  if (existing) {
    throw new ConflictError('The email address provided is already registered.', [
      {
        field: 'email',
        issue: 'The email address provided is already registered.',
      },
    ])
  }

  const seekerId = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password)

  await db.insert(seekerUsers).values({
    id: seekerId,
    fullName: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    preferredLocation: input.preferred_location ?? null,
    passwordHash,
  })

  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seekerId))
    .limit(1)

  await createAndSendSeekerCode(
    db,
    env,
    seeker,
    CODE_PURPOSES.EMAIL_VERIFICATION
  )

  const accessToken = await signAccessToken(
    {
      userId: seeker.id,
      email: seeker.email,
      accountType: ACCOUNT_TYPES.SEEKER,
      tokenVersion: seeker.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    seeker: toSeekerProfile(seeker),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function verifySeekerEmail(db: Database, input: VerifyEmailInput) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.email, input.email))
    .limit(1)

  if (!seeker) {
    throw new BadRequestError('Invalid or expired verification code.')
  }

  if (seeker.isEmailVerified) {
    return {
      message: 'Email is already verified.',
      seeker: toSeekerProfile(seeker),
    }
  }

  const [codeRecord] = await db
    .select()
    .from(seekerVerificationCodes)
    .where(
      and(
        eq(seekerVerificationCodes.seekerId, seeker.id),
        eq(seekerVerificationCodes.purpose, CODE_PURPOSES.EMAIL_VERIFICATION),
        isNull(seekerVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(seekerVerificationCodes.createdAt))
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
      .update(seekerVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(seekerVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid verification code.')
  }

  const now = new Date().toISOString()
  await db
    .update(seekerVerificationCodes)
    .set({ usedAt: now })
    .where(eq(seekerVerificationCodes.id, codeRecord.id))

  await db
    .update(seekerUsers)
    .set({
      isEmailVerified: true,
      emailVerifiedAt: now,
      updatedAt: now,
    })
    .where(eq(seekerUsers.id, seeker.id))

  const [updatedSeeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seeker.id))
    .limit(1)

  return {
    message: 'Email verified successfully.',
    seeker: toSeekerProfile(updatedSeeker),
  }
}

export async function resendSeekerVerificationCode(
  db: Database,
  env: AppBindings,
  input: ResendVerificationCodeInput
) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.email, input.email))
    .limit(1)

  if (!seeker || seeker.isEmailVerified) {
    return {
      message:
        'If an unverified seeker account exists for this email, a new verification code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(seekerVerificationCodes)
    .where(
      and(
        eq(seekerVerificationCodes.seekerId, seeker.id),
        eq(seekerVerificationCodes.purpose, CODE_PURPOSES.EMAIL_VERIFICATION)
      )
    )
    .orderBy(desc(seekerVerificationCodes.createdAt))
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

  await createAndSendSeekerCode(
    db,
    env,
    seeker,
    CODE_PURPOSES.EMAIL_VERIFICATION
  )

  return {
    message:
      'If an unverified seeker account exists for this email, a new verification code has been sent.',
  }
}

export async function loginSeeker(
  db: Database,
  env: AppBindings,
  input: LoginInput
) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.email, input.email))
    .limit(1)

  if (!seeker) {
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH)
    throw new UnauthorizedError('Invalid email or password.')
  }

  if (seeker.isSuspended) {
    throw new ForbiddenError('Your seeker account has been suspended.')
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    seeker.passwordHash
  )
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  const accessToken = await signAccessToken(
    {
      userId: seeker.id,
      email: seeker.email,
      accountType: ACCOUNT_TYPES.SEEKER,
      tokenVersion: seeker.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    seeker: toSeekerProfile(seeker),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function forgotSeekerPassword(
  db: Database,
  env: AppBindings,
  input: ForgotPasswordInput
) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.email, input.email))
    .limit(1)

  if (!seeker) {
    return {
      message:
        'If a seeker account exists for this email, a password reset code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(seekerVerificationCodes)
    .where(
      and(
        eq(seekerVerificationCodes.seekerId, seeker.id),
        eq(seekerVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET)
      )
    )
    .orderBy(desc(seekerVerificationCodes.createdAt))
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

  await createAndSendSeekerCode(
    db,
    env,
    seeker,
    CODE_PURPOSES.PASSWORD_RESET
  )

  return {
    message:
      'If a seeker account exists for this email, a password reset code has been sent.',
  }
}

export async function resetSeekerPassword(
  db: Database,
  input: ResetPasswordInput
) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.email, input.email))
    .limit(1)

  if (!seeker) {
    throw new BadRequestError('Invalid or expired password reset code.')
  }

  const [codeRecord] = await db
    .select()
    .from(seekerVerificationCodes)
    .where(
      and(
        eq(seekerVerificationCodes.seekerId, seeker.id),
        eq(seekerVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(seekerVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(seekerVerificationCodes.createdAt))
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
      .update(seekerVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(seekerVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid password reset code.')
  }

  const now = new Date().toISOString()
  const newPasswordHash = await hashPassword(input.new_password)

  await db
    .update(seekerVerificationCodes)
    .set({ usedAt: now })
    .where(eq(seekerVerificationCodes.id, codeRecord.id))

  await db
    .update(seekerUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: seeker.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(seekerUsers.id, seeker.id))

  return {
    message: 'Password reset successfully.',
  }
}

export async function changeSeekerPassword(
  db: Database,
  seekerId: string,
  input: ChangePasswordInput
) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seekerId))
    .limit(1)

  if (!seeker) {
    throw new NotFoundError('Seeker')
  }

  const isCurrentValid = await verifyPassword(
    input.current_password,
    seeker.passwordHash
  )
  if (!isCurrentValid) {
    throw new UnauthorizedError('Current password is incorrect.', [
      { field: 'current_password', issue: 'Current password is incorrect.' },
    ])
  }

  const newPasswordHash = await hashPassword(input.new_password)
  const now = new Date().toISOString()

  await db
    .update(seekerUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: seeker.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(seekerUsers.id, seekerId))

  return {
    message: 'Password changed successfully.',
  }
}

export async function getSeekerProfile(db: Database, seekerId: string) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seekerId))
    .limit(1)

  if (!seeker) {
    throw new NotFoundError('Seeker')
  }

  return toSeekerProfile(seeker)
}

export async function updateSeekerProfile(
  db: Database,
  seekerId: string,
  input: UpdateSeekerInput
) {
  const [seeker] = await db
    .select()
    .from(seekerUsers)
    .where(eq(seekerUsers.id, seekerId))
    .limit(1)

  if (!seeker) {
    throw new NotFoundError('Seeker')
  }

  await db
    .update(seekerUsers)
    .set({
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
      ...(input.preferred_location !== undefined
        ? { preferredLocation: input.preferred_location }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(seekerUsers.id, seekerId))

  return getSeekerProfile(db, seekerId)
}

