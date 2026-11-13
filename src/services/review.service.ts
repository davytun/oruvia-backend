import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import {
  INSPECTION_STATUSES,
  LISTER_ROLES,
  MODERATION_STATUSES,
  REVIEW_STATUSES,
  REVIEW_TARGET_TYPES,
  type ListerRole,
  type ReviewTargetType,
} from '../config/constants'
import type { Database } from '../database'
import {
  agentUsers,
  inspectionBookings,
  landlordUsers,
  propertyInquiries,
  propertyListings,
  reviews,
  seekerUsers,
  type Review,
} from '../models'
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors'
import { buildPaginationMeta, getPaginationOffset } from '../utils/response'
import type {
  CreateReviewInput,
  ListerReviewListQueryInput,
  PublicReviewListQueryInput,
  UpdateReviewInput,
} from '../utils/validators'

export type ReviewTargetRef =
  | { targetType: 'listing'; listingId: string }
  | { targetType: 'lister'; listerType: ListerRole; listerId: string }

/**
 * Recompute and persist `average_rating` and `review_count` for a listing or lister
 * based on all currently published reviews.
 */
export async function recomputeTargetRating(
  db: Database,
  target: ReviewTargetRef
) {
  const targetCondition =
    target.targetType === REVIEW_TARGET_TYPES.LISTING
      ? and(
          eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTING),
          eq(reviews.listingId, target.listingId),
          eq(reviews.status, REVIEW_STATUSES.PUBLISHED)
        )
      : and(
          eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTER),
          eq(reviews.listerType, target.listerType),
          eq(reviews.listerId, target.listerId),
          eq(reviews.status, REVIEW_STATUSES.PUBLISHED)
        )

  const [agg] = await db
    .select({
      count: sql<number>`count(*)`,
      avg: sql<number | null>`avg(${reviews.rating})`,
    })
    .from(reviews)
    .where(targetCondition)

  const reviewCount = Number(agg?.count ?? 0)
  const averageRating =
    reviewCount > 0 && agg?.avg !== null && agg?.avg !== undefined
      ? Math.round(Number(agg.avg) * 10) / 10
      : 0

  const now = new Date().toISOString()

  if (target.targetType === REVIEW_TARGET_TYPES.LISTING) {
    await db
      .update(propertyListings)
      .set({ averageRating, reviewCount, updatedAt: now })
      .where(eq(propertyListings.id, target.listingId))
  } else if (target.listerType === LISTER_ROLES.AGENT) {
    await db
      .update(agentUsers)
      .set({ averageRating, reviewCount, updatedAt: now })
      .where(eq(agentUsers.id, target.listerId))
  } else {
    await db
      .update(landlordUsers)
      .set({ averageRating, reviewCount, updatedAt: now })
      .where(eq(landlordUsers.id, target.listerId))
  }

  return { average_rating: averageRating, review_count: reviewCount }
}

async function getRatingBreakdown(db: Database, target: ReviewTargetRef) {
  const targetCondition =
    target.targetType === REVIEW_TARGET_TYPES.LISTING
      ? and(
          eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTING),
          eq(reviews.listingId, target.listingId),
          eq(reviews.status, REVIEW_STATUSES.PUBLISHED)
        )
      : and(
          eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTER),
          eq(reviews.listerType, target.listerType),
          eq(reviews.listerId, target.listerId),
          eq(reviews.status, REVIEW_STATUSES.PUBLISHED)
        )

  const rows = await db
    .select({
      rating: reviews.rating,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(targetCondition)
    .groupBy(reviews.rating)

  const breakdown: Record<'1' | '2' | '3' | '4' | '5', number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  }

  for (const row of rows) {
    const key = String(row.rating) as keyof typeof breakdown
    if (key in breakdown) {
      breakdown[key] = Number(row.count)
    }
  }

  return breakdown
}

export function formatReviewResponse(
  review: Review,
  seeker?: { id: string; fullName: string; avatarUrl: string | null } | null,
  listing?: { id: string; title: string; slug: string } | null
) {
  return {
    id: review.id,
    target_type: review.targetType,
    listing_id: review.listingId,
    lister_type: review.listerType,
    lister_id: review.listerId,
    rating: review.rating,
    comment: review.comment,
    is_verified_inspection: review.isVerifiedInspection,
    status: review.status,
    reply: review.replyText
      ? {
          text: review.replyText,
          replied_at: review.repliedAt,
        }
      : null,
    seeker: seeker
      ? {
          id: seeker.id,
          full_name: seeker.fullName,
          avatar_url: seeker.avatarUrl,
        }
      : null,
    listing: listing ?? null,
    hidden_reason: review.hiddenReason,
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  }
}

export async function getPublicListingReviews(
  db: Database,
  listingId: string,
  query: PublicReviewListQueryInput
) {
  const [listing] = await db
    .select({
      id: propertyListings.id,
      title: propertyListings.title,
      slug: propertyListings.slug,
      averageRating: propertyListings.averageRating,
      reviewCount: propertyListings.reviewCount,
      moderationStatus: propertyListings.moderationStatus,
    })
    .from(propertyListings)
    .where(eq(propertyListings.id, listingId))
    .limit(1)

  if (!listing || listing.moderationStatus !== MODERATION_STATUSES.APPROVED) {
    throw new NotFoundError('Property listing not found.')
  }

  const conditions = [
    eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTING),
    eq(reviews.listingId, listingId),
    eq(reviews.status, REVIEW_STATUSES.PUBLISHED),
  ]

  if (query.rating !== undefined) {
    conditions.push(eq(reviews.rating, query.rating))
  }
  if (query.verified_only) {
    conditions.push(eq(reviews.isVerifiedInspection, true))
  }

  const whereClause = and(...conditions)
  const orderBy =
    query.sort === 'highest'
      ? [desc(reviews.rating), desc(reviews.createdAt)]
      : query.sort === 'lowest'
        ? [reviews.rating, desc(reviews.createdAt)]
        : [desc(reviews.createdAt)]

  const { page, per_page, limit, offset } = getPaginationOffset(
    query.page,
    query.per_page
  )

  const [rows, [{ count }], breakdown] = await Promise.all([
    db
      .select({
        review: reviews,
        seeker: {
          id: seekerUsers.id,
          fullName: seekerUsers.fullName,
          avatarUrl: seekerUsers.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(seekerUsers, eq(reviews.seekerId, seekerUsers.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(whereClause),
    getRatingBreakdown(db, { targetType: 'listing', listingId }),
  ])

  return {
    listing: {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
    },
    summary: {
      average_rating: listing.averageRating,
      review_count: listing.reviewCount,
      breakdown,
    },
    items: rows.map((r) => formatReviewResponse(r.review, r.seeker)),
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

export async function getPublicListerReviews(
  db: Database,
  listerType: ListerRole,
  listerId: string,
  query: PublicReviewListQueryInput
) {
  let listerInfo: {
    id: string
    role: ListerRole
    full_name: string
    business_name: string | null
    avatar_url: string | null
    is_verified: boolean
    verification_badge: string | null
    average_rating: number
    review_count: number
  } | null = null

  if (listerType === LISTER_ROLES.AGENT) {
    const [agent] = await db
      .select()
      .from(agentUsers)
      .where(eq(agentUsers.id, listerId))
      .limit(1)
    if (!agent || agent.isSuspended) {
      throw new NotFoundError('Agent not found.')
    }
    listerInfo = {
      id: agent.id,
      role: 'agent',
      full_name: agent.fullName,
      business_name: agent.agencyName,
      avatar_url: agent.avatarUrl,
      is_verified: agent.isVerified,
      verification_badge: agent.verificationBadge,
      average_rating: agent.averageRating,
      review_count: agent.reviewCount,
    }
  } else {
    const [landlord] = await db
      .select()
      .from(landlordUsers)
      .where(eq(landlordUsers.id, listerId))
      .limit(1)
    if (!landlord || landlord.isSuspended) {
      throw new NotFoundError('Landlord not found.')
    }
    listerInfo = {
      id: landlord.id,
      role: 'landlord',
      full_name: landlord.fullName,
      business_name: landlord.companyName,
      avatar_url: landlord.avatarUrl,
      is_verified: landlord.isVerified,
      verification_badge: landlord.verificationBadge,
      average_rating: landlord.averageRating,
      review_count: landlord.reviewCount,
    }
  }

  const conditions = [
    eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTER),
    eq(reviews.listerType, listerType),
    eq(reviews.listerId, listerId),
    eq(reviews.status, REVIEW_STATUSES.PUBLISHED),
  ]

  if (query.rating !== undefined) {
    conditions.push(eq(reviews.rating, query.rating))
  }
  if (query.verified_only) {
    conditions.push(eq(reviews.isVerifiedInspection, true))
  }

  const whereClause = and(...conditions)
  const orderBy =
    query.sort === 'highest'
      ? [desc(reviews.rating), desc(reviews.createdAt)]
      : query.sort === 'lowest'
        ? [reviews.rating, desc(reviews.createdAt)]
        : [desc(reviews.createdAt)]

  const { page, per_page, limit, offset } = getPaginationOffset(
    query.page,
    query.per_page
  )

  const [rows, [{ count }], breakdown] = await Promise.all([
    db
      .select({
        review: reviews,
        seeker: {
          id: seekerUsers.id,
          fullName: seekerUsers.fullName,
          avatarUrl: seekerUsers.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(seekerUsers, eq(reviews.seekerId, seekerUsers.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(whereClause),
    getRatingBreakdown(db, { targetType: 'lister', listerType, listerId }),
  ])

  return {
    lister: listerInfo,
    summary: {
      average_rating: listerInfo.average_rating,
      review_count: listerInfo.review_count,
      breakdown,
    },
    items: rows.map((r) => formatReviewResponse(r.review, r.seeker)),
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

export async function listSeekerReviews(
  db: Database,
  seekerId: string,
  rawPage: number,
  rawPerPage: number
) {
  const whereClause = eq(reviews.seekerId, seekerId)
  const { page, per_page, limit, offset } = getPaginationOffset(
    rawPage,
    rawPerPage
  )

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        review: reviews,
        listing: {
          id: propertyListings.id,
          title: propertyListings.title,
          slug: propertyListings.slug,
        },
      })
      .from(reviews)
      .leftJoin(propertyListings, eq(reviews.listingId, propertyListings.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(whereClause),
  ])

  return {
    items: rows.map((r) =>
      formatReviewResponse(
        r.review,
        null,
        r.listing?.id ? r.listing : null
      )
    ),
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

export async function createSeekerReview(
  db: Database,
  seekerId: string,
  input: CreateReviewInput
) {
  let isVerifiedInspection = false
  let targetRef: ReviewTargetRef

  if (input.target_type === REVIEW_TARGET_TYPES.LISTING) {
    const listingId = input.listing_id!
    const [listing] = await db
      .select({
        id: propertyListings.id,
        moderationStatus: propertyListings.moderationStatus,
      })
      .from(propertyListings)
      .where(eq(propertyListings.id, listingId))
      .limit(1)

    if (!listing || listing.moderationStatus !== MODERATION_STATUSES.APPROVED) {
      throw new NotFoundError('Property listing not found.')
    }

    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.seekerId, seekerId),
          eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTING),
          eq(reviews.listingId, listingId)
        )
      )
      .limit(1)

    if (existingReview) {
      throw new ConflictError(
        'You have already reviewed this property listing. You can update your existing review instead.'
      )
    }

    const [inspection, inquiry] = await Promise.all([
      db
        .select({ id: inspectionBookings.id, status: inspectionBookings.status })
        .from(inspectionBookings)
        .where(
          and(
            eq(inspectionBookings.seekerId, seekerId),
            eq(inspectionBookings.listingId, listingId)
          )
        ),
      db
        .select({ id: propertyInquiries.id })
        .from(propertyInquiries)
        .where(
          and(
            eq(propertyInquiries.seekerId, seekerId),
            eq(propertyInquiries.listingId, listingId)
          )
        )
        .limit(1),
    ])

    if (inspection.length === 0 && inquiry.length === 0) {
      throw new ForbiddenError(
        'Only seekers who have inquired about or booked an inspection for this property can leave a review.'
      )
    }

    isVerifiedInspection = inspection.some(
      (item) => item.status === INSPECTION_STATUSES.COMPLETED
    )
    targetRef = { targetType: 'listing', listingId }
  } else {
    const listerType = input.lister_type!
    const listerId = input.lister_id!

    if (listerType === LISTER_ROLES.AGENT) {
      const [agent] = await db
        .select({ id: agentUsers.id, isSuspended: agentUsers.isSuspended })
        .from(agentUsers)
        .where(eq(agentUsers.id, listerId))
        .limit(1)
      if (!agent || agent.isSuspended) {
        throw new NotFoundError('Agent not found.')
      }
    } else {
      const [landlord] = await db
        .select({
          id: landlordUsers.id,
          isSuspended: landlordUsers.isSuspended,
        })
        .from(landlordUsers)
        .where(eq(landlordUsers.id, listerId))
        .limit(1)
      if (!landlord || landlord.isSuspended) {
        throw new NotFoundError('Landlord not found.')
      }
    }

    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.seekerId, seekerId),
          eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTER),
          eq(reviews.listerType, listerType),
          eq(reviews.listerId, listerId)
        )
      )
      .limit(1)

    if (existingReview) {
      throw new ConflictError(
        'You have already reviewed this lister. You can update your existing review instead.'
      )
    }

    const [inspection, inquiry] = await Promise.all([
      db
        .select({ id: inspectionBookings.id, status: inspectionBookings.status })
        .from(inspectionBookings)
        .where(
          and(
            eq(inspectionBookings.seekerId, seekerId),
            eq(inspectionBookings.listerRole, listerType),
            eq(inspectionBookings.listerId, listerId)
          )
        ),
      db
        .select({ id: propertyInquiries.id })
        .from(propertyInquiries)
        .where(
          and(
            eq(propertyInquiries.seekerId, seekerId),
            eq(propertyInquiries.listerRole, listerType),
            eq(propertyInquiries.listerId, listerId)
          )
        )
        .limit(1),
    ])

    if (inspection.length === 0 && inquiry.length === 0) {
      throw new ForbiddenError(
        'Only seekers who have inquired with or booked an inspection with this lister can leave a review.'
      )
    }

    isVerifiedInspection = inspection.some(
      (item) => item.status === INSPECTION_STATUSES.COMPLETED
    )
    targetRef = { targetType: 'lister', listerType, listerId }
  }

  const now = new Date().toISOString()
  const reviewId = crypto.randomUUID()

  await db.insert(reviews).values({
    id: reviewId,
    seekerId,
    targetType: input.target_type,
    listingId:
      input.target_type === REVIEW_TARGET_TYPES.LISTING
        ? input.listing_id!
        : null,
    listerType:
      input.target_type === REVIEW_TARGET_TYPES.LISTER
        ? input.lister_type!
        : null,
    listerId:
      input.target_type === REVIEW_TARGET_TYPES.LISTER
        ? input.lister_id!
        : null,
    rating: input.rating,
    comment: input.comment ?? null,
    isVerifiedInspection,
    status: REVIEW_STATUSES.PUBLISHED,
    createdAt: now,
    updatedAt: now,
  })

  await recomputeTargetRating(db, targetRef)

  const [created] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  return formatReviewResponse(created)
}

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

export async function updateSeekerReview(
  db: Database,
  seekerId: string,
  reviewId: string,
  input: UpdateReviewInput
) {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Review not found.')
  }
  if (existing.seekerId !== seekerId) {
    throw new ForbiddenError('You can only edit your own reviews.')
  }

  const now = new Date().toISOString()
  await db
    .update(reviews)
    .set({
      rating: input.rating ?? existing.rating,
      comment: input.comment !== undefined ? input.comment : existing.comment,
      updatedAt: now,
    })
    .where(eq(reviews.id, reviewId))

  if (input.rating !== undefined && input.rating !== existing.rating) {
    await recomputeTargetRating(db, getReviewTargetRef(existing))
  }

  const [updated] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  return formatReviewResponse(updated)
}

export async function deleteSeekerReview(
  db: Database,
  seekerId: string,
  reviewId: string
) {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Review not found.')
  }
  if (existing.seekerId !== seekerId) {
    throw new ForbiddenError('You can only delete your own reviews.')
  }

  await db.delete(reviews).where(eq(reviews.id, reviewId))
  await recomputeTargetRating(db, getReviewTargetRef(existing))

  return { deleted: true, id: reviewId }
}

async function getListerOwnedListingIds(
  db: Database,
  listerRole: ListerRole,
  listerId: string
): Promise<string[]> {
  const rows = await db
    .select({ id: propertyListings.id })
    .from(propertyListings)
    .where(
      listerRole === LISTER_ROLES.AGENT
        ? eq(propertyListings.agentId, listerId)
        : eq(propertyListings.landlordId, listerId)
    )
  return rows.map((r) => r.id)
}

export async function listListerReviews(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  query: ListerReviewListQueryInput
) {
  const ownedListingIds = await getListerOwnedListingIds(
    db,
    listerRole,
    listerId
  )

  const profileTarget = and(
    eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTER),
    eq(reviews.listerType, listerRole),
    eq(reviews.listerId, listerId)
  )

  const ownershipClause =
    ownedListingIds.length > 0
      ? or(
          profileTarget,
          and(
            eq(reviews.targetType, REVIEW_TARGET_TYPES.LISTING),
            inArray(reviews.listingId, ownedListingIds)
          )
        )
      : profileTarget

  const conditions = [
    eq(reviews.status, REVIEW_STATUSES.PUBLISHED),
    ownershipClause,
  ]

  if (query.target_type) {
    conditions.push(eq(reviews.targetType, query.target_type))
  }
  if (query.has_reply === true) {
    conditions.push(isNotNull(reviews.replyText))
  } else if (query.has_reply === false) {
    conditions.push(isNull(reviews.replyText))
  }

  const whereClause = and(...conditions)
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
    db.select({ count: sql<number>`count(*)` }).from(reviews).where(whereClause),
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

async function assertListerOwnsReviewTarget(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  review: Review
) {
  if (review.targetType === REVIEW_TARGET_TYPES.LISTER) {
    if (review.listerType !== listerRole || review.listerId !== listerId) {
      throw new ForbiddenError(
        'You can only reply to reviews on your own profile or listings.'
      )
    }
    return
  }

  if (review.listingId) {
    const [listing] = await db
      .select({
        agentId: propertyListings.agentId,
        landlordId: propertyListings.landlordId,
      })
      .from(propertyListings)
      .where(eq(propertyListings.id, review.listingId))
      .limit(1)

    const ownerId =
      listerRole === LISTER_ROLES.AGENT ? listing?.agentId : listing?.landlordId
    if (!listing || ownerId !== listerId) {
      throw new ForbiddenError(
        'You can only reply to reviews on your own profile or listings.'
      )
    }
  }
}

export async function upsertListerReviewReply(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  reviewId: string,
  replyText: string
) {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  if (!existing || existing.status !== REVIEW_STATUSES.PUBLISHED) {
    throw new NotFoundError('Review not found.')
  }

  await assertListerOwnsReviewTarget(db, listerRole, listerId, existing)

  const now = new Date().toISOString()
  await db
    .update(reviews)
    .set({
      replyText,
      repliedAt: now,
      updatedAt: now,
    })
    .where(eq(reviews.id, reviewId))

  const [updated] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  return formatReviewResponse(updated)
}

export async function deleteListerReviewReply(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  reviewId: string
) {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Review not found.')
  }

  await assertListerOwnsReviewTarget(db, listerRole, listerId, existing)

  const now = new Date().toISOString()
  await db
    .update(reviews)
    .set({
      replyText: null,
      repliedAt: null,
      updatedAt: now,
    })
    .where(eq(reviews.id, reviewId))

  return { deleted: true, review_id: reviewId }
}
