import type { Context } from 'hono'
import type { AppEnv } from '../../config/env'
import {
  adminDeleteReview,
  adminListReviews,
  adminModerateReview,
} from '../../services/admin/review.service'
import { sendPaginated, sendSuccess } from '../../utils/response'
import {
  adminModerateReviewSchema,
  adminReviewListQuerySchema,
} from '../../utils/validators'

export async function adminListReviewsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const query = adminReviewListQuerySchema.parse(c.req.query())
  const result = await adminListReviews(db, query)
  return sendPaginated(c, result.items, result.pagination)
}

export async function adminModerateReviewHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const admin = c.get('user')!
  const reviewId = c.req.param('id')!
  const body = await c.req.json()
  const input = adminModerateReviewSchema.parse(body)
  const review = await adminModerateReview(db, admin.id, reviewId, input)
  return sendSuccess(c, { review })
}

export async function adminDeleteReviewHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const reviewId = c.req.param('id')!
  const result = await adminDeleteReview(db, reviewId)
  return sendSuccess(c, result)
}
