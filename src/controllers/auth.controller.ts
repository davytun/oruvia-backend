import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  loginUser,
  logoutUserSession,
  refreshUserSession,
  registerUser,
} from '../services/auth.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendSuccess } from '../utils/response'
import type {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from '../utils/validators'

export async function register(c: Context<AppEnv>) {
  const input = await c.req.json<RegisterInput>()
  const userAgent = c.req.header('User-Agent')
  const result = await registerUser(c.get('db'), c.env, input, userAgent)
  return sendCreated(c, result)
}

export async function login(c: Context<AppEnv>) {
  const input = await c.req.json<LoginInput>()
  const userAgent = c.req.header('User-Agent')
  const result = await loginUser(c.get('db'), c.env, input, userAgent)
  return sendSuccess(c, result)
}

export async function refresh(c: Context<AppEnv>) {
  const input = await c.req.json<RefreshTokenInput>()
  const userAgent = c.req.header('User-Agent')
  const result = await refreshUserSession(
    c.get('db'),
    c.env,
    input.refresh_token,
    userAgent
  )
  return sendSuccess(c, result)
}

export async function logout(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  const result = await logoutUserSession(c.get('db'), user.sessionId)
  return sendSuccess(c, result)
}

