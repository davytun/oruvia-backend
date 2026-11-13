import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminGetPropertyVerificationById,
  adminListPropertyVerifications,
  adminReviewPropertyVerification,
} from '../../services/admin/property-verification.service'
import { UnauthorizedError } from '../../utils/errors'
import { sendPaginated, sendSuccess } from '../../utils/response'
import type {
  AdminPropertyVerificationQueryInput,
  AdminReviewPropertyVerificationInput,
} from '../../utils/validators'

function requireAdmin(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) {
    throw new UnauthorizedError('Admin authentication required.')
  }
  return user
}

export async function adminListPropertyVerificationsHandler(
  c: Context<AppEnv>
) {
  requireAdmin(c)
  const query = c.req.valid(
    'query' as never
  ) as AdminPropertyVerificationQueryInput
  const result = await adminListPropertyVerifications(c.get('db'), query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

export async function adminGetPropertyVerificationByIdHandler(
  c: Context<AppEnv>
) {
  requireAdmin(c)
  const id = c.req.param('id') as string
  const result = await adminGetPropertyVerificationById(c.get('db'), id)
  return sendSuccess(c, result)
}

export async function adminReviewPropertyVerificationHandler(
  c: Context<AppEnv>
) {
  const admin = requireAdmin(c)
  const id = c.req.param('id') as string
  const input = c.req.valid(
    'json' as never
  ) as AdminReviewPropertyVerificationInput
  const result = await adminReviewPropertyVerification(
    c.get('db'),
    c.env,
    admin.id,
    id,
    input
  )
  return sendSuccess(c, result)
}

