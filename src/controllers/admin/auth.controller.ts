import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  changeAdminPassword,
  createAdmin,
  forgotAdminPassword,
  getAdminById,
  listAdmins,
  loginAdmin,
  resetAdminPassword,
  updateAdminProfile,
  updateAdminSuspension,
} from '../../services/admin/auth.service'
import { UnauthorizedError } from '../../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response'
import type {
  ChangePasswordInput,
  CreateAdminInput,
  ForgotPasswordInput,
  LoginInput,
  PaginationQueryInput,
  ResetPasswordInput,
  UpdateAdminInput,
  UpdateAdminSuspensionInput,
} from '../../utils/validators'

/**
 * POST /api/v1/admins/login
 */
export async function loginAdminHandler(c: Context<AppEnv, string>) {
  const input = c.req.valid('json' as never) as LoginInput
  const data = await loginAdmin(c.get('db'), c.env, input)
  return sendSuccess(c, data)
}

/**
 * POST /api/v1/admins/forgot-password
 */
export async function forgotAdminPasswordHandler(c: Context<AppEnv, string>) {
  const input = c.req.valid('json' as never) as ForgotPasswordInput
  const data = await forgotAdminPassword(c.get('db'), c.env, input)
  return sendSuccess(c, data)
}

/**
 * POST /api/v1/admins/reset-password
 */
export async function resetAdminPasswordHandler(c: Context<AppEnv, string>) {
  const input = c.req.valid('json' as never) as ResetPasswordInput
  const data = await resetAdminPassword(c.get('db'), c.env, input)
  return sendSuccess(c, data)
}

/**
 * POST /api/v1/admins/change-password
 */
export async function changeAdminPasswordHandler(c: Context<AppEnv, string>) {
  const user = c.get('user')
  if (!user) throw new UnauthorizedError()
  const input = c.req.valid('json' as never) as ChangePasswordInput
  const data = await changeAdminPassword(c.get('db'), c.env, user.id, input)
  return sendSuccess(c, data)
}

/**
 * GET /api/v1/admins/me
 */
export async function getAdminMeHandler(c: Context<AppEnv, string>) {
  const user = c.get('user')
  if (!user) throw new UnauthorizedError()
  const data = await getAdminById(c.get('db'), user.id)
  return sendSuccess(c, data)
}

/**
 * PATCH /api/v1/admins/me
 */
export async function updateAdminMeHandler(c: Context<AppEnv, string>) {
  const user = c.get('user')
  if (!user) throw new UnauthorizedError()
  const input = c.req.valid('json' as never) as UpdateAdminInput
  const data = await updateAdminProfile(c.get('db'), user.id, input)
  return sendSuccess(c, data)
}

/**
 * GET /api/v1/admins (Super Admin only)
 */
export async function listAdminsHandler(c: Context<AppEnv, string>) {
  const query = c.req.valid('query' as never) as PaginationQueryInput
  const result = await listAdmins(c.get('db'), query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * POST /api/v1/admins (Super Admin only)
 */
export async function createAdminHandler(c: Context<AppEnv, string>) {
  const input = c.req.valid('json' as never) as CreateAdminInput
  const data = await createAdmin(c.get('db'), input)
  return sendCreated(c, data)
}

/**
 * PATCH /api/v1/admins/:id/status (Super Admin only)
 */
export async function updateAdminSuspensionHandler(c: Context<AppEnv, string>) {
  const user = c.get('user')
  if (!user) throw new UnauthorizedError()
  const { id } = c.req.valid('param' as never) as { id: string }
  const input = c.req.valid('json' as never) as UpdateAdminSuspensionInput
  const data = await updateAdminSuspension(c.get('db'), user.id, id, input)
  return sendSuccess(c, data)
}
