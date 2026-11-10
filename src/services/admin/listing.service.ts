import { createElement } from 'react'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
  LISTER_ROLES,
  MODERATION_STATUSES,
  type ModerationStatus,
} from '../../config/constants'
import type { AppBindings } from '../../config/env'
import type { Database } from '../../database'
import {
  agentUsers,
  cities,
  landlordUsers,
  propertyListings,
  propertyTypes,
  states,
} from '../../models'
import { NotificationEmail } from '../../templates'
import { NotFoundError } from '../../utils/errors'
import type {
  AdminListingListQueryInput,
  ReviewListingInput,
} from '../../utils/validators'
import { sendEmail } from '../email.service'
import { formatListingResponse } from '../listing.service'

/**
 * List all property listings for moderation (Admin)
 */
export async function adminListListings(
  db: Database,
  query: AdminListingListQueryInput
) {
  const offset = (query.page - 1) * query.per_page
  const conditions = []

  if (query.moderation_status) {
    conditions.push(
      eq(propertyListings.moderationStatus, query.moderation_status)
    )
  }
  if (query.availability_status) {
    conditions.push(
      eq(propertyListings.availabilityStatus, query.availability_status)
    )
  }
  if (query.city_id) {
    conditions.push(eq(propertyListings.cityId, query.city_id))
  }
  if (query.lister_role) {
    conditions.push(eq(propertyListings.listerRole, query.lister_role))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      listing: propertyListings,
      state: { id: states.id, name: states.name, slug: states.slug },
      city: { id: cities.id, name: cities.name, slug: cities.slug },
      propertyType: {
        id: propertyTypes.id,
        name: propertyTypes.name,
        slug: propertyTypes.slug,
        category: propertyTypes.category,
      },
      agent: {
        id: agentUsers.id,
        full_name: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsapp_number: agentUsers.whatsappNumber,
        agency_name: agentUsers.agencyName,
        avatar_url: agentUsers.avatarUrl,
        is_verified: agentUsers.isVerified,
        verification_status: agentUsers.verificationStatus,
        verification_badge: agentUsers.verificationBadge,
      },
      landlord: {
        id: landlordUsers.id,
        full_name: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
        whatsapp_number: landlordUsers.whatsappNumber,
        company_name: landlordUsers.companyName,
        avatar_url: landlordUsers.avatarUrl,
        is_verified: landlordUsers.isVerified,
        verification_status: landlordUsers.verificationStatus,
        verification_badge: landlordUsers.verificationBadge,
      },
    })
    .from(propertyListings)
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(propertyTypes, eq(propertyListings.propertyTypeId, propertyTypes.id))
    .leftJoin(agentUsers, eq(propertyListings.agentId, agentUsers.id))
    .leftJoin(landlordUsers, eq(propertyListings.landlordId, landlordUsers.id))
    .where(whereClause)
    .orderBy(desc(propertyListings.createdAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(propertyListings)
    .where(whereClause)

  return {
    items: rows.map(formatListingResponse),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Inspect a single property listing (Admin)
 */
export async function adminGetListingById(db: Database, listingId: string) {
  const [row] = await db
    .select({
      listing: propertyListings,
      state: { id: states.id, name: states.name, slug: states.slug },
      city: { id: cities.id, name: cities.name, slug: cities.slug },
      propertyType: {
        id: propertyTypes.id,
        name: propertyTypes.name,
        slug: propertyTypes.slug,
        category: propertyTypes.category,
      },
      agent: {
        id: agentUsers.id,
        full_name: agentUsers.fullName,
        email: agentUsers.email,
        phone: agentUsers.phone,
        whatsapp_number: agentUsers.whatsappNumber,
        agency_name: agentUsers.agencyName,
        avatar_url: agentUsers.avatarUrl,
        is_verified: agentUsers.isVerified,
        verification_status: agentUsers.verificationStatus,
        verification_badge: agentUsers.verificationBadge,
      },
      landlord: {
        id: landlordUsers.id,
        full_name: landlordUsers.fullName,
        email: landlordUsers.email,
        phone: landlordUsers.phone,
        whatsapp_number: landlordUsers.whatsappNumber,
        company_name: landlordUsers.companyName,
        avatar_url: landlordUsers.avatarUrl,
        is_verified: landlordUsers.isVerified,
        verification_status: landlordUsers.verificationStatus,
        verification_badge: landlordUsers.verificationBadge,
      },
    })
    .from(propertyListings)
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(propertyTypes, eq(propertyListings.propertyTypeId, propertyTypes.id))
    .leftJoin(agentUsers, eq(propertyListings.agentId, agentUsers.id))
    .leftJoin(landlordUsers, eq(propertyListings.landlordId, landlordUsers.id))
    .where(eq(propertyListings.id, listingId))
    .limit(1)

  if (!row) {
    throw new NotFoundError('Property listing not found.')
  }

  return formatListingResponse(row)
}

/**
 * Review, approve, reject, or suspend a property listing (Admin)
 */
export async function adminReviewListing(
  db: Database,
  env: AppBindings,
  adminId: string,
  listingId: string,
  input: ReviewListingInput
) {
  const [existing] = await db
    .select()
    .from(propertyListings)
    .where(eq(propertyListings.id, listingId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Property listing not found.')
  }

  const nowIso = new Date().toISOString()
  const isApproved = input.status === MODERATION_STATUSES.APPROVED

  const updateFields: Partial<typeof propertyListings.$inferInsert> = {
    moderationStatus: input.status,
    rejectionReason: isApproved ? null : (input.rejection_reason ?? null),
    reviewedByAdminId: adminId,
    reviewedAt: nowIso,
    updatedAt: nowIso,
  }

  if (isApproved && !existing.publishedAt) {
    updateFields.publishedAt = nowIso
  }

  const [updated] = await db
    .update(propertyListings)
    .set(updateFields)
    .where(eq(propertyListings.id, listingId))
    .returning()

  // Send notification email to the lister
  let recipientEmail: string | null = null
  let recipientName: string | null = null

  if (existing.listerRole === LISTER_ROLES.AGENT && existing.agentId) {
    const [agent] = await db
      .select({ email: agentUsers.email, fullName: agentUsers.fullName })
      .from(agentUsers)
      .where(eq(agentUsers.id, existing.agentId))
      .limit(1)
    if (agent) {
      recipientEmail = agent.email
      recipientName = agent.fullName
    }
  } else if (existing.listerRole === LISTER_ROLES.LANDLORD && existing.landlordId) {
    const [landlord] = await db
      .select({ email: landlordUsers.email, fullName: landlordUsers.fullName })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, existing.landlordId))
      .limit(1)
    if (landlord) {
      recipientEmail = landlord.email
      recipientName = landlord.fullName
    }
  }

  if (recipientEmail && recipientName) {
    const statusLabels: Record<ModerationStatus, string> = {
      approved: 'Approved and Published',
      rejected: 'Rejected',
      suspended: 'Suspended',
      pending_review: 'Under Review',
    }

    const title = isApproved
      ? `Your listing "${existing.title}" is Approved`
      : `Action required on your listing "${existing.title}"`

    const message = isApproved
      ? `Great news! Your property listing "${existing.title}" has been reviewed and approved by Oruvia moderators. It is now publicly discoverable by property seekers.`
      : `Your property listing "${existing.title}" status is now: ${statusLabels[input.status]}. Reason: ${input.rejection_reason || 'Does not meet our listing guidelines.'}`

    await sendEmail(env, {
      to: recipientEmail,
      subject: `Oruvia Listing Update: ${existing.title}`,
      template: createElement(NotificationEmail, {
        recipientName,
        title,
        message,
        metadata: [
          { label: 'Listing Title', value: existing.title },
          { label: 'Moderation Status', value: statusLabels[input.status] },
          ...(input.rejection_reason
            ? [{ label: 'Moderator Notes', value: input.rejection_reason }]
            : []),
        ],
      }),
    })
  }

  return adminGetListingById(db, updated.id)
}

