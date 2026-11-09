import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  changeAgentPassword,
  forgotAgentPassword,
  getAgentProfile,
  loginAgent,
  registerAgent,
  resendAgentVerificationCode,
  resetAgentPassword,
  updateAgentProfile,
  verifyAgentEmail,
} from '../services/agent.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendSuccess } from '../utils/response'
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

function requireAgentUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

export async function registerAgentHandler(c: Context<AppEnv>) {
  const input = await c.req.json<RegisterAgentInput>()
  const result = await registerAgent(c.get('db'), c.env, input)
  return sendCreated(c, result)
}

export async function verifyAgentEmailHandler(c: Context<AppEnv>) {
  const input = await c.req.json<VerifyEmailInput>()
  const result = await verifyAgentEmail(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function resendAgentCodeHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResendVerificationCodeInput>()
  const result = await resendAgentVerificationCode(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function loginAgentHandler(c: Context<AppEnv>) {
  const input = await c.req.json<LoginInput>()
  const result = await loginAgent(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function forgotAgentPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ForgotPasswordInput>()
  const result = await forgotAgentPassword(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function resetAgentPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResetPasswordInput>()
  const result = await resetAgentPassword(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function changeAgentPasswordHandler(c: Context<AppEnv>) {
  const user = requireAgentUser(c)
  const input = await c.req.json<ChangePasswordInput>()
  const result = await changeAgentPassword(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

export async function getAgentMeHandler(c: Context<AppEnv>) {
  const user = requireAgentUser(c)
  const result = await getAgentProfile(c.get('db'), user.id)
  return sendSuccess(c, result)
}

export async function updateAgentMeHandler(c: Context<AppEnv>) {
  const user = requireAgentUser(c)
  const input = await c.req.json<UpdateAgentInput>()
  const result = await updateAgentProfile(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

