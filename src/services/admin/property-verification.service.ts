import { and, desc, eq, sql } from 'drizzle-orm'
import { createElement } from 'react'
import {
  LISTER_ROLES,
  PROPERTY_VERIFICATION_BADGES,
  PROPERTY_VERIFICATION_METHODS,
  VERIFICATION_STATUSES,
} from '../../config/constants'
import type { AppBindings } from '../../config/env'
import type { Database } from '../../database'
import {
  agentUsers,
  cities,
  landlordUsers,
  propertyListings,
  propertyVerificationSubmissions,
  states,
} from '../../models'
import { NotificationEmail } from '../../templates'
import { ConflictError, NotFoundError } from '../../utils/errors'
import type {
  AdminPropertyVerificationQueryInput,
  AdminReviewPropertyVerificationInput,
} from '../../utils/validators'
import { sendEmail } from '../email.service'

async function getListerContact(
  db: Database,
  listerRole: string,
  listerId: string
) {
  if (listerRole === LISTER_ROLES.AGENT) {
    const [agent] = await db
      .select({
        id: agentUsers.id,
        fullName: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        agencyName: agentUsers.agencyName,
      })
      .from(agentUsers)
      .where(eq(agentUsers.id, listerId))
      .limit(1)
    return agent
      ? {
          id: agent.id,
          role: LISTER_ROLES.AGENT,
          full_name: agent.fullName,
          email: agent.email,
          phone: agent.phone,
          business_name: agent.agencyName,
        }
      : null
  }

  const [landlord] = await db
    .select({
      id: landlordUsers.id,
      fullName: landlordUsers.fullName,
      email: landlordUsers.email,
      phone: landlordUsers.phone,
      companyName: landlordUsers.companyName,
    })
    .from(landlordUsers)
    .where(eq(landlordUsers.id, listerId))
    .limit(1)
  return landlord
    ? {
        id: landlord.id,
        role: LISTER_ROLES.LANDLORD,
        full_name: landlord.fullName,
        email: landlord.email,
        phone: landlord.phone,
        business_name: landlord.companyName,
      }
    : null
}

/**
 * Admin: List property verification submissions
 */
export async function adminListPropertyVerifications(
  db: Database,
  query: AdminPropertyVerificationQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const conditions = []

  if (query.status) {
    conditions.push(eq(propertyVerificationSubmissions.status, query.status))
  }
  if (query.verification_method) {
    conditions.push(
      eq(
        propertyVerificationSubmissions.verificationMethod,
        query.verification_method
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      submission: propertyVerificationSubmissions,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        isPropertyVerified: propertyListings.isPropertyVerified,
        propertyVerificationBadge: propertyListings.propertyVerificationBadge,
      },
      cityName: cities.name,
      stateName: states.name,
    })
    .from(propertyVerificationSubmissions)
    .innerJoin(
      propertyListings,
      eq(propertyVerificationSubmissions.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .where(whereClause)
    .orderBy(desc(propertyVerificationSubmissions.submittedAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(propertyVerificationSubmissions)
    .where(whereClause)

  const items = await Promise.all(
    rows.map(async (row) => {
      const lister = await getListerContact(
        db,
        row.submission.listerRole,
        row.submission.listerId
      )
      return {
        ...row.submission,
        listing: {
          ...row.listing,
          city: row.cityName,
          state: row.stateName,
        },
        lister,
      }
    })
  )

  return {
    items,
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Admin: Get single property verification submission details
 */
export async function adminGetPropertyVerificationById(
  db: Database,
  submissionId: string
) {
  const [row] = await db
    .select({
      submission: propertyVerificationSubmissions,
      listing: {
        id: propertyListings.id,
        title: propertyListings.title,
        slug: propertyListings.slug,
        area: propertyListings.area,
        address: propertyListings.address,
        isPropertyVerified: propertyListings.isPropertyVerified,
        propertyVerificationStatus: propertyListings.propertyVerificationStatus,
        propertyVerificationBadge: propertyListings.propertyVerificationBadge,
      },
      cityName: cities.name,
      stateName: states.name,
    })
    .from(propertyVerificationSubmissions)
    .innerJoin(
      propertyListings,
      eq(propertyVerificationSubmissions.listingId, propertyListings.id)
    )
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .where(eq(propertyVerificationSubmissions.id, submissionId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Property verification submission not found.')
  }

  const lister = await getListerContact(
    db,
    row.submission.listerRole,
    row.submission.listerId
  )

  return {
    ...row.submission,
    listing: {
      ...row.listing,
      city: row.cityName,
      state: row.stateName,
    },
    lister,
  }
}

/**
 * Admin: Approve or Reject a property verification submission
 */
export async function adminReviewPropertyVerification(
  db: Database,
  env: AppBindings,
  adminId: string,
  submissionId: string,
  input: AdminReviewPropertyVerificationInput
) {
  const [row] = await db
    .select({
      submission: propertyVerificationSubmissions,
      listingTitle: propertyListings.title,
    })
    .from(propertyVerificationSubmissions)
    .innerJoin(
      propertyListings,
      eq(propertyVerificationSubmissions.listingId, propertyListings.id)
    )
    .where(eq(propertyVerificationSubmissions.id, submissionId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Property verification submission not found.')
  }

  if (row.submission.status !== VERIFICATION_STATUSES.PENDING) {
    throw new ConflictError(
      `This submission has already been reviewed (${row.submission.status}).`
    )
  }

  const now = new Date().toISOString()
  const isApproved = input.decision === VERIFICATION_STATUSES.APPROVED

  const defaultBadge =
    row.submission.verificationMethod === PROPERTY_VERIFICATION_METHODS.DOCUMENT
      ? PROPERTY_VERIFICATION_BADGES.VERIFIED_PROPERTY
      : PROPERTY_VERIFICATION_BADGES.ORUVIA_INSPECTED

  const grantedBadge = isApproved ? input.badge ?? defaultBadge : null

  await db
    .update(propertyVerificationSubmissions)
    .set({
      status: input.decision,
      qualifiedBadge: grantedBadge,
      rejectionReason: isApproved ? null : input.rejection_reason ?? null,
      adminNotes: input.admin_notes ?? null,
      reviewedByAdminId: adminId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(propertyVerificationSubmissions.id, submissionId))

  await db
    .update(propertyListings)
    .set({
      isPropertyVerified: isApproved,
      propertyVerificationStatus: input.decision,
      propertyVerificationBadge: grantedBadge,
      propertyVerifiedAt: isApproved ? now : null,
      updatedAt: now,
    })
    .where(eq(propertyListings.id, row.submission.listingId))

  const lister = await getListerContact(
    db,
    row.submission.listerRole,
    row.submission.listerId
  )

  if (lister?.email) {
    try {
      await sendEmail(env, {
        to: lister.email,
        subject: isApproved
          ? `Property Verified: ${row.listingTitle}`
          : `Property Verification Update: ${row.listingTitle}`,
        template: createElement(NotificationEmail, {
          recipientName: lister.full_name,
          title: isApproved
            ? 'Your Property Listing Is Verified!'
            : 'Property Verification Not Approved',
          message: isApproved
            ? `Congratulations! Your property listing "${row.listingTitle}" has been verified and awarded the "${grantedBadge}" badge. Seekers can now discover it under Verified Properties.`
            : `Your property verification request for "${row.listingTitle}" could not be approved. Reason: ${input.rejection_reason}. You may upload clearer documentation or reschedule a site check anytime.`,
          actionLabel: 'View Listing',
          actionUrl: `${env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/listings/${row.submission.listingId}`,
        }),
      })
    } catch (err) {
      console.error('[PropertyVerificationEmail] Failed to send email:', err)
    }
  }

  return adminGetPropertyVerificationById(db, submissionId)
}

