import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { MODERATION_STATUSES } from '../config/constants'
import type { Database } from '../database'
import {
  agentUsers,
  cities,
  landlordUsers,
  propertyListings,
  propertyTypes,
  seekerFavorites,
  states,
} from '../models'
import { NotFoundError } from '../utils/errors'
import type { FavoritesQueryInput } from '../utils/validators'
import { formatListingResponse } from './listing.service'

/**
 * Batch-load `favorites_count` and `is_favorited` for a list of listing IDs
 * without N+1 queries.
 */
export async function getFavoriteMetadataForListings(
  db: Database,
  listingIds: string[],
  seekerId?: string
): Promise<{
  countsByListingId: Map<string, number>
  favoritedSet: Set<string>
}> {
  const countsByListingId = new Map<string, number>()
  const favoritedSet = new Set<string>()

  if (listingIds.length === 0) {
    return { countsByListingId, favoritedSet }
  }

  const countRows = await db
    .select({
      listingId: seekerFavorites.listingId,
      count: sql<number>`count(*)`,
    })
    .from(seekerFavorites)
    .where(inArray(seekerFavorites.listingId, listingIds))
    .groupBy(seekerFavorites.listingId)

  for (const row of countRows) {
    countsByListingId.set(row.listingId, Number(row.count ?? 0))
  }

  if (seekerId) {
    const savedRows = await db
      .select({ listingId: seekerFavorites.listingId })
      .from(seekerFavorites)
      .where(
        and(
          eq(seekerFavorites.seekerId, seekerId),
          inArray(seekerFavorites.listingId, listingIds)
        )
      )

    for (const row of savedRows) {
      favoritedSet.add(row.listingId)
    }
  }

  return { countsByListingId, favoritedSet }
}

/**
 * Verify that the target listing exists and is approved before favoriting
 */
async function ensureListingExistsAndApproved(db: Database, listingId: string) {
  const [listing] = await db
    .select({
      id: propertyListings.id,
      moderationStatus: propertyListings.moderationStatus,
    })
    .from(propertyListings)
    .where(eq(propertyListings.id, listingId))
    .limit(1)

  if (!listing || listing.moderationStatus !== MODERATION_STATUSES.APPROVED) {
    throw new NotFoundError('Property listing not found or not available.')
  }

  return listing
}

/**
 * Explicitly save a listing to a seeker's favorites (idempotent)
 */
export async function addFavorite(
  db: Database,
  seekerId: string,
  listingId: string
) {
  await ensureListingExistsAndApproved(db, listingId)

  const [existing] = await db
    .select()
    .from(seekerFavorites)
    .where(
      and(
        eq(seekerFavorites.seekerId, seekerId),
        eq(seekerFavorites.listingId, listingId)
      )
    )
    .limit(1)

  const now = new Date().toISOString()

  if (!existing) {
    await db
      .insert(seekerFavorites)
      .values({
        id: crypto.randomUUID(),
        seekerId,
        listingId,
        createdAt: now,
      })
      .onConflictDoNothing()
  }

  const { countsByListingId } = await getFavoriteMetadataForListings(db, [
    listingId,
  ])

  return {
    listing_id: listingId,
    is_favorited: true,
    favorites_count: countsByListingId.get(listingId) ?? 1,
    favorited_at: existing?.createdAt ?? now,
  }
}

/**
 * Explicitly remove a listing from a seeker's favorites
 */
export async function removeFavorite(
  db: Database,
  seekerId: string,
  listingId: string
) {
  const [existing] = await db
    .select({ id: seekerFavorites.id })
    .from(seekerFavorites)
    .where(
      and(
        eq(seekerFavorites.seekerId, seekerId),
        eq(seekerFavorites.listingId, listingId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Property listing is not in your favorites.')
  }

  await db
    .delete(seekerFavorites)
    .where(
      and(
        eq(seekerFavorites.seekerId, seekerId),
        eq(seekerFavorites.listingId, listingId)
      )
    )

  const { countsByListingId } = await getFavoriteMetadataForListings(db, [
    listingId,
  ])

  return {
    listing_id: listingId,
    is_favorited: false,
    favorites_count: countsByListingId.get(listingId) ?? 0,
  }
}

/**
 * Toggle save/unsave for a property listing
 */
export async function toggleFavorite(
  db: Database,
  seekerId: string,
  listingId: string
) {
  const [existing] = await db
    .select({ id: seekerFavorites.id })
    .from(seekerFavorites)
    .where(
      and(
        eq(seekerFavorites.seekerId, seekerId),
        eq(seekerFavorites.listingId, listingId)
      )
    )
    .limit(1)

  if (existing) {
    return removeFavorite(db, seekerId, listingId)
  }

  return addFavorite(db, seekerId, listingId)
}

/**
 * List a seeker's saved properties (paginated, newest first).
 * Keeps listings even if availability_status changed to rented/sold/unavailable
 * so seekers know a saved property has been taken; excludes rejected/suspended listings.
 */
export async function getSeekerFavorites(
  db: Database,
  seekerId: string,
  query: FavoritesQueryInput
) {
  const offset = (query.page - 1) * query.per_page

  const conditions = [
    eq(seekerFavorites.seekerId, seekerId),
    eq(propertyListings.moderationStatus, MODERATION_STATUSES.APPROVED),
    ne(propertyListings.moderationStatus, MODERATION_STATUSES.REJECTED),
  ]

  if (query.availability_status) {
    conditions.push(
      eq(propertyListings.availabilityStatus, query.availability_status)
    )
  }

  const whereClause = and(...conditions)

  const rows = await db
    .select({
      favorite: seekerFavorites,
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
    .from(seekerFavorites)
    .innerJoin(
      propertyListings,
      eq(seekerFavorites.listingId, propertyListings.id)
    )
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(
      propertyTypes,
      eq(propertyListings.propertyTypeId, propertyTypes.id)
    )
    .leftJoin(agentUsers, eq(propertyListings.agentId, agentUsers.id))
    .leftJoin(landlordUsers, eq(propertyListings.landlordId, landlordUsers.id))
    .where(whereClause)
    .orderBy(desc(seekerFavorites.createdAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(seekerFavorites)
    .innerJoin(
      propertyListings,
      eq(seekerFavorites.listingId, propertyListings.id)
    )
    .where(whereClause)

  const listingIds = rows.map((r) => r.listing.id)
  const { countsByListingId } = await getFavoriteMetadataForListings(
    db,
    listingIds
  )

  return {
    items: rows.map((row) => ({
      ...formatListingResponse(row),
      is_favorited: true,
      favorites_count: countsByListingId.get(row.listing.id) ?? 1,
      favorited_at: row.favorite.createdAt,
    })),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}
