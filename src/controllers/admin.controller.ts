import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  changeAdminPassword,
  createAdminUser,
  forgotAdminPassword,
  getAdminProfile,
  listAdminUsers,
  listAgentKycSubmissions,
  listLandlordKycSubmissions,
  listUsersByRole,
  loginAdmin,
  resetAdminPassword,
  reviewAgentKycSubmission,
  reviewLandlordKycSubmission,
  updateAdminProfile,
  updateUserSuspensionStatus,
} from '../services/admin.service'
import { UnauthorizedError } from '../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response'
import {
  kycListQuerySchema,
  paginationQuerySchema,
  type ChangePasswordInput,
  type CreateAdminInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type ReviewKycInput,
  type UpdateAdminInput,
  type UpdateUserSuspensionInput,
} from '../utils/validators'

function requireAdminUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }
  return user
}

export async function loginAdminHandler(c: Context<AppEnv>) {
  const input = await c.req.json<LoginInput>()
  const result = await loginAdmin(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function createAdminHandler(c: Context<AppEnv>) {
  const input = await c.req.json<CreateAdminInput>()
  const result = await createAdminUser(c.get('db'), input)
  return sendCreated(c, result)
}

export async function listAdminsHandler(c: Context<AppEnv>) {
  const query = paginationQuerySchema.parse(c.req.query())
  const { items, total } = await listAdminUsers(c.get('db'), query)
  return sendPaginated(c, items, {
    page: query.page,
    per_page: query.per_page,
    total_records: total,
  })
}

export async function forgotAdminPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ForgotPasswordInput>()
  const result = await forgotAdminPassword(c.get('db'), c.env, input)
  return sendSuccess(c, result)
}

export async function resetAdminPasswordHandler(c: Context<AppEnv>) {
  const input = await c.req.json<ResetPasswordInput>()
  const result = await resetAdminPassword(c.get('db'), input)
  return sendSuccess(c, result)
}

export async function changeAdminPasswordHandler(c: Context<AppEnv>) {
  const user = requireAdminUser(c)
  const input = await c.req.json<ChangePasswordInput>()
  const result = await changeAdminPassword(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

export async function getAdminMeHandler(c: Context<AppEnv>) {
  const user = requireAdminUser(c)
  const result = await getAdminProfile(c.get('db'), user.id)
  return sendSuccess(c, result)
}

export async function updateAdminMeHandler(c: Context<AppEnv>) {
  const user = requireAdminUser(c)
  const input = await c.req.json<UpdateAdminInput>()
  const result = await updateAdminProfile(c.get('db'), user.id, input)
  return sendSuccess(c, result)
}

export async function listAgentKycHandler(c: Context<AppEnv>) {
  const query = kycListQuerySchema.parse(c.req.query())
  const { items, total } = await listAgentKycSubmissions(c.get('db'), query)
  return sendPaginated(c, items, {
    page: query.page,
    per_page: query.per_page,
    total_records: total,
  })
}

export async function reviewAgentKycHandler(c: Context<AppEnv>) {
  const submissionId = c.req.param('id')!
  const input = await c.req.json<ReviewKycInput>()
  const result = await reviewAgentKycSubmission(
    c.get('db'),
    c.env,
    submissionId,
    input
  )
  return sendSuccess(c, result)
}

export async function listLandlordKycHandler(c: Context<AppEnv>) {
  const query = kycListQuerySchema.parse(c.req.query())
  const { items, total } = await listLandlordKycSubmissions(c.get('db'), query)
  return sendPaginated(c, items, {
    page: query.page,
    per_page: query.per_page,
    total_records: total,
  })
}

export async function reviewLandlordKycHandler(c: Context<AppEnv>) {
  const submissionId = c.req.param('id')!
  const input = await c.req.json<ReviewKycInput>()
  const result = await reviewLandlordKycSubmission(
    c.get('db'),
    c.env,
    submissionId,
    input
  )
  return sendSuccess(c, result)
}

export async function listSeekersForAdminHandler(c: Context<AppEnv>) {
  const query = paginationQuerySchema.parse(c.req.query())
  const { items, total } = await listUsersByRole(c.get('db'), 'seekers', query)
  return sendPaginated(c, items, {
    page: query.page,
    per_page: query.per_page,
    total_records: total,
  })
}

export async function listAgentsForAdminHandler(c: Context<AppEnv>) {
  const query = paginationQuerySchema.parse(c.req.query())
  const { items, total } = await listUsersByRole(c.get('db'), 'agents', query)
  return sendPaginated(c, items, {
    page: query.page,
    per_page: query.per_page,
    total_records: total,
  })
}

export async function listLandlordsForAdminHandler(c: Context<AppEnv>) {
  const query = paginationQuerySchema.parse(c.req.query())
  const { items, total } = await listUsersByRole(
    c.get('db'),
    'landlords',
    query
  )
  return sendPaginated(c, items, {
    page: query.page,
    per_page: query.per_page,
    total_records: total,
  })
}

export async function updateUserSuspensionHandler(c: Context<AppEnv>) {
  const role = c.req.param('role') as 'seekers' | 'agents' | 'landlords'
  const userId = c.req.param('id')!
  const input = await c.req.json<UpdateUserSuspensionInput>()
  const result = await updateUserSuspensionStatus(
    c.get('db'),
    role,
    userId,
    input
  )
  return sendSuccess(c, result)
}

