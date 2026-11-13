import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import {
  REVIEW_STATUSES,
  REVIEW_TARGET_TYPES,
  type ListerRole,
} from '../../config/constants'
import type { Database } from '../../database'
import {
  propertyListings,
  reviews,
  seekerUsers,
  type Review,
} from '../../models'
import { NotFoundError } from '../../utils/errors'
import { buildPaginationMeta, getPaginationOffset } from '../../utils/response'
import type {
  AdminModerateReviewInput,
  AdminReviewListQueryInput,
} from '../../utils/validators'
import {
  formatReviewResponse,
  recomputeTargetRating,
  type ReviewTargetRef,
} from '../review.service'

function getReviewTargetRef(review: Review): ReviewTargetRef {
  if (review.targetType === REVIEW_TARGET_TYPES.LISTING && review.listingId) {
    return { targetType: 'listing', listingId: review.listingId }
  }
  return {
    targetType: 'lister',
    listerType: review.listerType as ListerRole,
    listerId: review.listerId!,
  }
}

export async function adminListReviews(
  db: Database,
  query: AdminReviewListQueryInput
) {
  const conditions = []

  if (query.status) {
    conditions.push(eq(reviews.status, query.status))
  }
  if (query.target_type) {
    conditions.push(eq(reviews.targetType, query.target_type))
  }
  if (query.rating !== undefined) {
    conditions.push(eq(reviews.rating, query.rating))
  }
  if (query.is_verified_inspection !== undefined) {
    conditions.push(
      eq(reviews.isVerifiedInspection, query.is_verified_inspection)
    )
  }
  if (query.search) {
    const pattern = `%${query.search}%`
    conditions.push(
      or(
        like(reviews.comment, pattern),
        like(reviews.replyText, pattern),
        like(seekerUsers.fullName, pattern)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  const { page, per_page, limit, offset } = getPaginationOffset(
    query.page,
    query.per_page
  )

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        review: reviews,
        seeker: {
          id: seekerUsers.id,
          fullName: seekerUsers.fullName,
          avatarUrl: seekerUsers.avatarUrl,
        },
        listing: {
          id: propertyListings.id,
          title: propertyListings.title,
          slug: propertyListings.slug,
        },
      })
      .from(reviews)
      .innerJoin(seekerUsers, eq(reviews.seekerId, seekerUsers.id))
      .leftJoin(propertyListings, eq(reviews.listingId, propertyListings.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .innerJoin(seekerUsers, eq(reviews.seekerId, seekerUsers.id))
      .where(whereClause),
  ])

  return {
    items: rows.map((r) =>
      formatReviewResponse(
        r.review,
        r.seeker,
        r.listing?.id ? r.listing : null
      )
    ),
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

export async function adminModerateReview(
  db: Database,
  adminId: string,
  reviewId: string,
  input: AdminModerateReviewInput
) {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Review not found.')
  }

  const now = new Date().toISOString()
  const nextStatus =
    input.action === 'hide' ? REVIEW_STATUSES.HIDDEN : REVIEW_STATUSES.PUBLISHED

  await db
    .update(reviews)
    .set({
      status: nextStatus,
      hiddenReason: input.action === 'hide' ? (input.reason ?? null) : null,
      moderatedBy: adminId,
      moderatedAt: now,
      updatedAt: now,
    })
    .where(eq(reviews.id, reviewId))

  await recomputeTargetRating(db, getReviewTargetRef(existing))

  const [updated] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  return formatReviewResponse(updated)
}

export async function adminDeleteReview(db: Database, reviewId: string) {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Review not found.')
  }

  await db.delete(reviews).where(eq(reviews.id, reviewId))
  await recomputeTargetRating(db, getReviewTargetRef(existing))

  return { deleted: true, id: reviewId }
}
