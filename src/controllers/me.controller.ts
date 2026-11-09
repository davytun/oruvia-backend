import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  changeMyPassword,
  createAgentProfile,
  createLandlordProfile,
  getUserWithProfiles,
  updateAgentProfile,
  updateLandlordProfile,
  updateMyProfile,
} from '../services/user.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendSuccess } from '../utils/response'
import type {
  AgentProfileInput,
  ChangePasswordInput,
  LandlordProfileInput,
  UpdateMeInput,
} from '../utils/validators'

function requireAuthUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

export async function getMe(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const profile = await getUserWithProfiles(c.get('db'), user.id)
  return sendSuccess(c, profile)
}

export async function updateMe(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const input = await c.req.json<UpdateMeInput>()
  const profile = await updateMyProfile(c.get('db'), user.id, input)
  return sendSuccess(c, profile)
}

export async function changePassword(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const input = await c.req.json<ChangePasswordInput>()
  const result = await changeMyPassword(
    c.get('db'),
    user.id,
    user.sessionId,
    input
  )
  return sendSuccess(c, result)
}

export async function activateAgent(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const input = await c.req.json<AgentProfileInput>()
  const profile = await createAgentProfile(c.get('db'), user.id, input)
  return sendCreated(c, profile)
}

export async function editAgent(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const input = await c.req.json<AgentProfileInput>()
  const profile = await updateAgentProfile(c.get('db'), user.id, input)
  return sendSuccess(c, profile)
}

export async function activateLandlord(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const input = await c.req.json<LandlordProfileInput>()
  const profile = await createLandlordProfile(c.get('db'), user.id, input)
  return sendCreated(c, profile)
}

export async function editLandlord(c: Context<AppEnv>) {
  const user = requireAuthUser(c)
  const input = await c.req.json<LandlordProfileInput>()
  const profile = await updateLandlordProfile(c.get('db'), user.id, input)
  return sendSuccess(c, profile)
}

