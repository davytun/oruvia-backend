import type { Context } from 'hono'
import { LISTER_ROLES, type ListerRole } from '../config/constants'
import type { AppEnv } from '../config/env'
import {
  createSeekerReview,
  deleteListerReviewReply,
  deleteSeekerReview,
  getPublicListerReviews,
  getPublicListingReviews,
  listListerReviews,
  listSeekerReviews,
  updateSeekerReview,
  upsertListerReviewReply,
} from '../services/review.service'
import { ValidationError } from '../utils/errors'
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response'
import {
  createReviewSchema,
  listerReviewListQuerySchema,
  paginationQuerySchema,
  publicReviewListQuerySchema,
  replyToReviewSchema,
  updateReviewSchema,
} from '../utils/validators'

export async function getListingReviewsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const listingId = c.req.param('id')!
  const query = publicReviewListQuerySchema.parse(c.req.query())
  const result = await getPublicListingReviews(db, listingId, query)
  return sendSuccess(c, {
    listing: result.listing,
    summary: result.summary,
    reviews: result.items,
    pagination: result.pagination,
  })
}

export async function getListerReviewsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const listerType = c.req.param('listerType')!
  const listerId = c.req.param('listerId')!

  if (
    listerType !== LISTER_ROLES.AGENT &&
    listerType !== LISTER_ROLES.LANDLORD
  ) {
    throw new ValidationError([
      {
        field: 'listerType',
        issue: 'listerType must be either "agent" or "landlord".',
      },
    ])
  }

  const query = publicReviewListQuerySchema.parse(c.req.query())
  const result = await getPublicListerReviews(
    db,
    listerType as ListerRole,
    listerId,
    query
  )
  return sendSuccess(c, {
    lister: result.lister,
    summary: result.summary,
    reviews: result.items,
    pagination: result.pagination,
  })
}

export async function listSeekerReviewsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const query = paginationQuerySchema.parse(c.req.query())
  const result = await listSeekerReviews(
    db,
    user.id,
    query.page,
    query.per_page
  )
  return sendPaginated(c, result.items, result.pagination)
}

export async function createSeekerReviewHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const body = await c.req.json()
  const input = createReviewSchema.parse(body)
  const review = await createSeekerReview(db, user.id, input)
  return sendCreated(c, { review })
}

export async function updateSeekerReviewHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const reviewId = c.req.param('id')!
  const body = await c.req.json()
  const input = updateReviewSchema.parse(body)
  const review = await updateSeekerReview(db, user.id, reviewId, input)
  return sendSuccess(c, { review })
}

export async function deleteSeekerReviewHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const reviewId = c.req.param('id')!
  const result = await deleteSeekerReview(db, user.id, reviewId)
  return sendSuccess(c, result)
}

export async function listListerReviewsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const query = listerReviewListQuerySchema.parse(c.req.query())
  const result = await listListerReviews(
    db,
    user.accountType as ListerRole,
    user.id,
    query
  )
  return sendPaginated(c, result.items, result.pagination)
}

export async function replyToReviewHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const reviewId = c.req.param('id')!
  const body = await c.req.json()
  const input = replyToReviewSchema.parse(body)
  const review = await upsertListerReviewReply(
    db,
    user.accountType as ListerRole,
    user.id,
    reviewId,
    input.reply_text
  )
  return sendSuccess(c, { review })
}

export async function deleteReviewReplyHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const reviewId = c.req.param('id')!
  const result = await deleteListerReviewReply(
    db,
    user.accountType as ListerRole,
    user.id,
    reviewId
  )
  return sendSuccess(c, result)
}
