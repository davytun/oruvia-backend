import { and, desc, eq } from 'drizzle-orm'
import {
  LISTER_ROLES,
  MODERATION_STATUSES,
  VERIFICATION_STATUSES,
  type ListerRole,
} from '../config/constants'
import type { Database } from '../database'
import { propertyListings, propertyVerificationSubmissions } from '../models'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors'
import type { SubmitPropertyVerificationInput } from '../utils/validators'

/**
 * Verify listing exists and belongs to the requesting Agent or Landlord
 */
async function assertListingOwnership(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string
) {
  const [listing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, listingId))
    .limit(1)

  if (!listing) {
    throw new NotFoundError('Property listing not found.')
  }

  const isOwner =
    listerRole === LISTER_ROLES.AGENT
      ? listing.listerRole === LISTER_ROLES.AGENT &&
        listing.agentId === listerId
      : listing.listerRole === LISTER_ROLES.LANDLORD &&
        listing.landlordId === listerId

  if (!isOwner) {
    throw new ForbiddenError('You do not have permission to manage this listing.')
  }

  return listing
}

/**
 * Submit a property verification request (Document and/or Physical Site Inspection)
 * Independent of listing moderation_status so live approved listings stay live.
 */
export async function submitPropertyVerification(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string,
  input: SubmitPropertyVerificationInput
) {
  const listing = await assertListingOwnership(
    db,
    listerRole,
    listerId,
    listingId
  )

  if (
    listing.moderationStatus === MODERATION_STATUSES.REJECTED ||
    listing.moderationStatus === MODERATION_STATUSES.SUSPENDED
  ) {
    throw new ValidationError([
      {
        field: 'listing_id',
        issue: `Cannot request property verification for a listing with status "${listing.moderationStatus}".`,
      },
    ])
  }

  if (listing.isPropertyVerified) {
    throw new ConflictError('This property listing is already verified.')
  }

  const [existingPending] = await db
    .select({ id: propertyVerificationSubmissions.id })
    .from(propertyVerificationSubmissions)
    .where(
      and(
        eq(propertyVerificationSubmissions.listingId, listingId),
        eq(
          propertyVerificationSubmissions.status,
          VERIFICATION_STATUSES.PENDING
        )
      )
    )
    .limit(1)

  if (existingPending) {
    throw new ConflictError(
      'A property verification request is already pending review for this listing.'
    )
  }

  const now = new Date().toISOString()
  const submissionId = crypto.randomUUID()

  await db.insert(propertyVerificationSubmissions).values({
    id: submissionId,
    listingId,
    listerRole,
    listerId,
    verificationMethod: input.verification_method,
    documentType: input.document_type ?? null,
    documentUrls: input.document_urls ?? [],
    siteContactName: input.site_contact_name ?? null,
    siteContactPhone: input.site_contact_phone ?? null,
    preferredInspectionDate: input.preferred_inspection_date ?? null,
    notes: input.notes ?? null,
    status: VERIFICATION_STATUSES.PENDING,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  await db
    .update(propertyListings)
    .set({
      propertyVerificationStatus: VERIFICATION_STATUSES.PENDING,
      updatedAt: now,
    })
    .where(eq(propertyListings.id, listingId))

  const [created] = await db
    .select()
    .from(propertyVerificationSubmissions)
    .where(eq(propertyVerificationSubmissions.id, submissionId))
    .limit(1)

  return {
    listing_id: listingId,
    property_verification_status: VERIFICATION_STATUSES.PENDING,
    submission: created,
  }
}

/**
 * Get property verification status and submission history for a listing
 */
export async function getMyListingVerificationStatus(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string
) {
  const listing = await assertListingOwnership(
    db,
    listerRole,
    listerId,
    listingId
  )

  const submissions = await db
    .select()
    .from(propertyVerificationSubmissions)
    .where(eq(propertyVerificationSubmissions.listingId, listingId))
    .orderBy(desc(propertyVerificationSubmissions.submittedAt))

  return {
    listing_id: listing.id,
    title: listing.title,
    property_verification: {
      is_verified: listing.isPropertyVerified,
      status: listing.propertyVerificationStatus,
      badge: listing.propertyVerificationBadge,
      verified_at: listing.propertyVerifiedAt,
    },
    submissions,
  }
}

