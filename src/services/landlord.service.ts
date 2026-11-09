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
  landlordUsers,
  landlordVerificationCodes,
  type LandlordUser,
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
  RegisterLandlordInput,
  ResendVerificationCodeInput,
  ResetPasswordInput,
  UpdateLandlordInput,
  VerifyEmailInput,
} from '../utils/validators'
import { sendEmail } from './email.service'

export function toLandlordProfile(landlord: LandlordUser) {
  return {
    id: landlord.id,
    account_type: ACCOUNT_TYPES.LANDLORD,
    full_name: landlord.fullName,
    email: landlord.email,
    phone: landlord.phone,
    whatsapp_number: landlord.whatsappNumber,
    company_name: landlord.companyName,
    bio: landlord.bio,
    avatar_url: landlord.avatarUrl,
    is_email_verified: landlord.isEmailVerified,
    email_verified_at: landlord.emailVerifiedAt,
    is_verified: landlord.isVerified,
    verification_status: landlord.verificationStatus,
    created_at: landlord.createdAt,
    updated_at: landlord.updatedAt,
  }
}

async function createAndSendLandlordCode(
  db: Database,
  env: AppBindings,
  landlord: LandlordUser,
  purpose: typeof CODE_PURPOSES.EMAIL_VERIFICATION | typeof CODE_PURPOSES.PASSWORD_RESET
) {
  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + AUTH_CONFIG.CODE_EXPIRY_MINUTES * 60 * 1000
  ).toISOString()

  await db
    .update(landlordVerificationCodes)
    .set({ usedAt: now.toISOString() })
    .where(
      and(
        eq(landlordVerificationCodes.landlordId, landlord.id),
        eq(landlordVerificationCodes.purpose, purpose),
        isNull(landlordVerificationCodes.usedAt)
      )
    )

  await db.insert(landlordVerificationCodes).values({
    landlordId: landlord.id,
    codeHash,
    purpose,
    expiresAt,
  })

  const template =
    purpose === CODE_PURPOSES.EMAIL_VERIFICATION
      ? createElement(VerificationEmail, { code, accountType: 'landlord' })
      : createElement(PasswordResetEmail, { code, accountType: 'landlord' })

  const subject =
    purpose === CODE_PURPOSES.EMAIL_VERIFICATION
      ? 'Verify your Oruvia Landlord account'
      : 'Reset your Oruvia Landlord password'

  await sendEmail(env, {
    to: landlord.email,
    subject,
    template,
  })
}

export async function registerLandlord(
  db: Database,
  env: AppBindings,
  input: RegisterLandlordInput
) {
  const [existing] = await db
    .select({ id: landlordUsers.id })
    .from(landlordUsers)
    .where(eq(landlordUsers.email, input.email))
    .limit(1)

  if (existing) {
    throw new ConflictError('The email address provided is already registered.', [
      {
        field: 'email',
        issue: 'The email address provided is already registered.',
      },
    ])
  }

  const landlordId = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password)

  await db.insert(landlordUsers).values({
    id: landlordId,
    fullName: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    whatsappNumber: input.whatsapp_number ?? null,
    companyName: input.company_name ?? null,
    bio: input.bio ?? null,
    passwordHash,
  })

  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, landlordId))
    .limit(1)

  await createAndSendLandlordCode(
    db,
    env,
    landlord,
    CODE_PURPOSES.EMAIL_VERIFICATION
  )

  const accessToken = await signAccessToken(
    {
      userId: landlord.id,
      email: landlord.email,
      accountType: ACCOUNT_TYPES.LANDLORD,
      tokenVersion: landlord.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    landlord: toLandlordProfile(landlord),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function verifyLandlordEmail(
  db: Database,
  input: VerifyEmailInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.email, input.email))
    .limit(1)

  if (!landlord) {
    throw new BadRequestError('Invalid or expired verification code.')
  }

  if (landlord.isEmailVerified) {
    return {
      message: 'Email is already verified.',
      landlord: toLandlordProfile(landlord),
    }
  }

  const [codeRecord] = await db
    .select()
    .from(landlordVerificationCodes)
    .where(
      and(
        eq(landlordVerificationCodes.landlordId, landlord.id),
        eq(
          landlordVerificationCodes.purpose,
          CODE_PURPOSES.EMAIL_VERIFICATION
        ),
        isNull(landlordVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(landlordVerificationCodes.createdAt))
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
      .update(landlordVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(landlordVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid verification code.')
  }

  const now = new Date().toISOString()
  await db
    .update(landlordVerificationCodes)
    .set({ usedAt: now })
    .where(eq(landlordVerificationCodes.id, codeRecord.id))

  await db
    .update(landlordUsers)
    .set({
      isEmailVerified: true,
      emailVerifiedAt: now,
      updatedAt: now,
    })
    .where(eq(landlordUsers.id, landlord.id))

  const [updatedLandlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, landlord.id))
    .limit(1)

  return {
    message: 'Email verified successfully.',
    landlord: toLandlordProfile(updatedLandlord),
  }
}

export async function resendLandlordVerificationCode(
  db: Database,
  env: AppBindings,
  input: ResendVerificationCodeInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.email, input.email))
    .limit(1)

  if (!landlord || landlord.isEmailVerified) {
    return {
      message:
        'If an unverified landlord account exists for this email, a new verification code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(landlordVerificationCodes)
    .where(
      and(
        eq(landlordVerificationCodes.landlordId, landlord.id),
        eq(
          landlordVerificationCodes.purpose,
          CODE_PURPOSES.EMAIL_VERIFICATION
        )
      )
    )
    .orderBy(desc(landlordVerificationCodes.createdAt))
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

  await createAndSendLandlordCode(
    db,
    env,
    landlord,
    CODE_PURPOSES.EMAIL_VERIFICATION
  )

  return {
    message:
      'If an unverified landlord account exists for this email, a new verification code has been sent.',
  }
}

export async function loginLandlord(
  db: Database,
  env: AppBindings,
  input: LoginInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.email, input.email))
    .limit(1)

  if (!landlord) {
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH)
    throw new UnauthorizedError('Invalid email or password.')
  }

  if (landlord.isSuspended) {
    throw new ForbiddenError('Your landlord account has been suspended.')
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    landlord.passwordHash
  )
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  const accessToken = await signAccessToken(
    {
      userId: landlord.id,
      email: landlord.email,
      accountType: ACCOUNT_TYPES.LANDLORD,
      tokenVersion: landlord.tokenVersion,
    },
    env.JWT_SECRET,
    AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS
  )

  return {
    landlord: toLandlordProfile(landlord),
    access_token: accessToken,
    expires_in: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  }
}

export async function forgotLandlordPassword(
  db: Database,
  env: AppBindings,
  input: ForgotPasswordInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.email, input.email))
    .limit(1)

  if (!landlord) {
    return {
      message:
        'If a landlord account exists for this email, a password reset code has been sent.',
    }
  }

  const [latestCode] = await db
    .select()
    .from(landlordVerificationCodes)
    .where(
      and(
        eq(landlordVerificationCodes.landlordId, landlord.id),
        eq(landlordVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET)
      )
    )
    .orderBy(desc(landlordVerificationCodes.createdAt))
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

  await createAndSendLandlordCode(
    db,
    env,
    landlord,
    CODE_PURPOSES.PASSWORD_RESET
  )

  return {
    message:
      'If a landlord account exists for this email, a password reset code has been sent.',
  }
}

export async function resetLandlordPassword(
  db: Database,
  input: ResetPasswordInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.email, input.email))
    .limit(1)

  if (!landlord) {
    throw new BadRequestError('Invalid or expired password reset code.')
  }

  const [codeRecord] = await db
    .select()
    .from(landlordVerificationCodes)
    .where(
      and(
        eq(landlordVerificationCodes.landlordId, landlord.id),
        eq(landlordVerificationCodes.purpose, CODE_PURPOSES.PASSWORD_RESET),
        isNull(landlordVerificationCodes.usedAt)
      )
    )
    .orderBy(desc(landlordVerificationCodes.createdAt))
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
      .update(landlordVerificationCodes)
      .set({ attempts: codeRecord.attempts + 1 })
      .where(eq(landlordVerificationCodes.id, codeRecord.id))

    throw new BadRequestError('Invalid password reset code.')
  }

  const now = new Date().toISOString()
  const newPasswordHash = await hashPassword(input.new_password)

  await db
    .update(landlordVerificationCodes)
    .set({ usedAt: now })
    .where(eq(landlordVerificationCodes.id, codeRecord.id))

  await db
    .update(landlordUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: landlord.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(landlordUsers.id, landlord.id))

  return {
    message: 'Password reset successfully.',
  }
}

export async function changeLandlordPassword(
  db: Database,
  landlordId: string,
  input: ChangePasswordInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, landlordId))
    .limit(1)

  if (!landlord) {
    throw new NotFoundError('Landlord')
  }

  const isCurrentValid = await verifyPassword(
    input.current_password,
    landlord.passwordHash
  )
  if (!isCurrentValid) {
    throw new UnauthorizedError('Current password is incorrect.', [
      { field: 'current_password', issue: 'Current password is incorrect.' },
    ])
  }

  const newPasswordHash = await hashPassword(input.new_password)
  const now = new Date().toISOString()

  await db
    .update(landlordUsers)
    .set({
      passwordHash: newPasswordHash,
      tokenVersion: landlord.tokenVersion + 1,
      updatedAt: now,
    })
    .where(eq(landlordUsers.id, landlordId))

  return {
    message: 'Password changed successfully.',
  }
}

export async function getLandlordProfile(db: Database, landlordId: string) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, landlordId))
    .limit(1)

  if (!landlord) {
    throw new NotFoundError('Landlord')
  }

  return toLandlordProfile(landlord)
}

export async function updateLandlordProfile(
  db: Database,
  landlordId: string,
  input: UpdateLandlordInput
) {
  const [landlord] = await db
    .select()
    .from(landlordUsers)
    .where(eq(landlordUsers.id, landlordId))
    .limit(1)

  if (!landlord) {
    throw new NotFoundError('Landlord')
  }

  await db
    .update(landlordUsers)
    .set({
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.whatsapp_number !== undefined
        ? { whatsappNumber: input.whatsapp_number }
        : {}),
      ...(input.company_name !== undefined
        ? { companyName: input.company_name }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(landlordUsers.id, landlordId))

  return getLandlordProfile(db, landlordId)
}

