import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  changeLandlordPassword,
  forgotLandlordPassword,
  getLandlordProfile,
  loginLandlord,
  registerLandlord,
  resendLandlordVerificationCode,
  resetLandlordPassword,
  updateLandlordProfile,
  verifyLandlordEmail,
} from '../services/landlord.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendSuccess } from '../utils/response'
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

function requireLandlordUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

export async function registerLandlordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<RegisterLandlordInput>()
  const result = await registerLandlord(c.get('db'), c.env, input)
  return sendCreated(c, result)
}

export async function verifyLandlordEmailHandler(c: Context<AppEnv>) {
  const input = await c.req.json<VerifyEmailInput>()
  const result = await verifyLandlordEmail(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function resendLandlordCodeHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResendVerificationCodeInput>()
  const result = await resendLandlordVerificationCode(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function loginLandlordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<LoginInput>()
  const result = await loginLandlord(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function forgotLandlordPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ForgotPasswordInput>()
  const result = await forgotLandlordPassword(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function resetLandlordPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResetPasswordInput>()
  const result = await resetLandlordPassword(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function changeLandlordPasswordHandler(c: Context<AppEnv>) {
  const user = requireLandlordUser(c)
  const input = await c.req.json<ChangePasswordInput>()
  const result = await changeLandlordPassword(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

export async function getLandlordMeHandler(c: Context<AppEnv>) {
  const user = requireLandlordUser(c)
  const result = await getLandlordProfile(c.get('db'), user.id)
  return sendSuccess(c, result)
}

export async function updateLandlordMeHandler(c: Context<AppEnv>) {
  const user = requireLandlordUser(c)
  const input = await c.req.json<UpdateLandlordInput>()
  const result = await updateLandlordProfile(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

