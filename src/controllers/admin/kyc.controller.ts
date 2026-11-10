import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  getAgentKycSubmissionById,
  getLandlordKycSubmissionById,
  listAgentKycSubmissions,
  listLandlordKycSubmissions,
  reviewAgentKycSubmission,
  reviewLandlordKycSubmission,
} from '../../services/admin/kyc.service'
import { sendPaginated, sendSuccess } from '../../utils/response'
import type { KycListQueryInput, ReviewKycInput } from '../../utils/validators'

/**
 * GET /api/v1/admins/kyc/agents
 */
export async function listAgentKycHandler(c: Context<AppEnv, string>) {
  const query = c.req.valid('query' as never) as KycListQueryInput
  const result = await listAgentKycSubmissions(c.get('db'), query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * GET /api/v1/admins/kyc/agents/:id
 */
export async function getAgentKycByIdHandler(c: Context<AppEnv, string>) {
  const { id } = c.req.valid('param' as never) as { id: string }
  const data = await getAgentKycSubmissionById(c.get('db'), id)
  return sendSuccess(c, data)
}

/**
 * PATCH /api/v1/admins/kyc/agents/:id/review
 */
export async function reviewAgentKycHandler(c: Context<AppEnv, string>) {
  const { id } = c.req.valid('param' as never) as { id: string }
  const input = c.req.valid('json' as never) as ReviewKycInput
  const data = await reviewAgentKycSubmission(c.get('db'), c.env, id, input)
  return sendSuccess(c, data)
}

/**
 * GET /api/v1/admins/kyc/landlords
 */
export async function listLandlordKycHandler(c: Context<AppEnv, string>) {
  const query = c.req.valid('query' as never) as KycListQueryInput
  const result = await listLandlordKycSubmissions(c.get('db'), query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * GET /api/v1/admins/kyc/landlords/:id
 */
export async function getLandlordKycByIdHandler(c: Context<AppEnv, string>) {
  const { id } = c.req.valid('param' as never) as { id: string }
  const data = await getLandlordKycSubmissionById(c.get('db'), id)
  return sendSuccess(c, data)
}

/**
 * PATCH /api/v1/admins/kyc/landlords/:id/review
 */
export async function reviewLandlordKycHandler(c: Context<AppEnv, string>) {
  const { id } = c.req.valid('param' as never) as { id: string }
  const input = c.req.valid('json' as never) as ReviewKycInput
  const data = await reviewLandlordKycSubmission(c.get('db'), c.env, id, input)
  return sendSuccess(c, data)
}
