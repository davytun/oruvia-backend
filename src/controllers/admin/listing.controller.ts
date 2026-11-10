import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminGetListingById,
  adminListListings,
  adminReviewListing,
} from '../../services/admin/listing.service'
import { UnauthorizedError } from '../../utils/errors'
import { sendPaginated, sendSuccess } from '../../utils/response'
import type {
  AdminListingListQueryInput,
  ReviewListingInput,
} from '../../utils/validators'

/**
 * GET /api/v1/admins/listings
 */
export async function adminListListingsHandler(c: Context<AppEnv>) {
  const query = c.req.valid('query' as never) as AdminListingListQueryInput
  const result = await adminListListings(c.get('db'), query)
  return sendPaginated(c, result.items, {
    page: result.page,
    per_page: result.perPage,
    total_records: result.total,
  })
}

/**
 * GET /api/v1/admins/listings/:id
 */
export async function adminGetListingByIdHandler(c: Context<AppEnv>) {
  const id = c.req.param('id') as string
  const result = await adminGetListingById(c.get('db'), id)
  return sendSuccess(c, result)
}

/**
 * PATCH /api/v1/admins/listings/:id/review
 */
export async function adminReviewListingHandler(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) throw new UnauthorizedError()
  const id = c.req.param('id') as string
  const input = c.req.valid('json' as never) as ReviewListingInput
  const result = await adminReviewListing(c.get('db'), c.env, user.id, id, input)
  return sendSuccess(c, result)
}
