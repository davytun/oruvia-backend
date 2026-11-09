import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  changeSeekerPassword,
  forgotSeekerPassword,
  getSeekerProfile,
  loginSeeker,
  registerSeeker,
  resendSeekerVerificationCode,
  resetSeekerPassword,
  updateSeekerProfile,
  verifySeekerEmail,
} from '../services/seeker.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendSuccess } from '../utils/response'
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

function requireSeekerUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

export async function registerSeekerHandler(c: Context<AppEnv>) {
  const input = await c.req.json<RegisterSeekerInput>()
  const result = await registerSeeker(c.get('db'), c.env, input)
  return sendCreated(c, result)
}

export async function verifySeekerEmailHandler(c: Context<AppEnv>) {
  const input = await c.req.json<VerifyEmailInput>()
  const result = await verifySeekerEmail(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function resendSeekerCodeHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResendVerificationCodeInput>()
  const result = await resendSeekerVerificationCode(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function loginSeekerHandler(c: Context<AppEnv>) {
  const input = await c.req.json<LoginInput>()
  const result = await loginSeeker(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function forgotSeekerPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ForgotPasswordInput>()
  const result = await forgotSeekerPassword(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function resetSeekerPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResetPasswordInput>()
  const result = await resetSeekerPassword(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function changeSeekerPasswordHandler(c: Context<AppEnv>) {
  const user = requireSeekerUser(c)
  const input = await c.req.json<ChangePasswordInput>()
  const result = await changeSeekerPassword(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

export async function getSeekerMeHandler(c: Context<AppEnv>) {
  const user = requireSeekerUser(c)
  const result = await getSeekerProfile(c.get('db'), user.id)
  return sendSuccess(c, result)
}

export async function updateSeekerMeHandler(c: Context<AppEnv>) {
  const user = requireSeekerUser(c)
  const input = await c.req.json<UpdateSeekerInput>()
  const result = await updateSeekerProfile(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

