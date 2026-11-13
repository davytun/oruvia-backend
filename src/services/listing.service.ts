import {
  and,
  asc,
  desc,
  eq,
  gte,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import {
  AVAILABILITY_STATUSES,
  LISTER_ROLES,
  MODERATION_STATUSES,
  type ListerRole,
} from '../config/constants'
import type { Database } from '../database'
import {
  agentUsers,
  cities,
  landlordUsers,
  propertyListings,
  propertyTypes,
  states,
  type PropertyListing,
} from '../models'
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors'
import type {
  CreateListingInput,
  ListingSearchQueryInput,
  PaginationQueryInput,
  UpdateListingAvailabilityInput,
  UpdateListingInput,
} from '../utils/validators'
import { getFavoriteMetadataForListings } from './favorite.service'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateListingSlug(title: string): string {
  const base = slugify(title).slice(0, 70)
  const rand = crypto.randomUUID().slice(0, 8)
  return `${base}-${rand}`
}

export function formatListingResponse(row: {
  listing: PropertyListing
  state: { id: string; name: string; slug: string }
  city: { id: string; name: string; slug: string }
  propertyType: {
    id: string;
    name: string;
    slug: string;
    category: string;
  }
  agent?: {
    id: string
    full_name: string
    email: string
    phone: string | null
    whatsapp_number: string | null
    agency_name: string | null
    avatar_url: string | null
    is_verified: boolean
    verification_status: string
    verification_badge: string | null
  } | null
  landlord?: {
    id: string
    full_name: string
    email: string
    phone: string | null
    whatsapp_number: string | null
    company_name: string | null
    avatar_url: string | null
    is_verified: boolean
    verification_status: string
    verification_badge: string | null
  } | null
}, options?: { includeListerEmail?: boolean }) {
  const { listing, state, city, propertyType, agent, landlord } = row
  const includeEmail = options?.includeListerEmail ?? false

  const lister =
    listing.listerRole === LISTER_ROLES.AGENT && agent
      ? {
          role: 'agent' as const,
          id: agent.id,
          name: agent.full_name,
          ...(includeEmail ? { email: agent.email } : {}),
          phone: agent.phone,
          whatsapp_number: agent.whatsapp_number,
          business_name: agent.agency_name,
          avatar_url: agent.avatar_url,
          is_verified: agent.is_verified,
          verification_status: agent.verification_status,
          verification_badge: agent.verification_badge,
        }
      : listing.listerRole === LISTER_ROLES.LANDLORD && landlord
        ? {
            role: 'landlord' as const,
            id: landlord.id,
            name: landlord.full_name,
            ...(includeEmail ? { email: landlord.email } : {}),
            phone: landlord.phone,
            whatsapp_number: landlord.whatsapp_number,
            business_name: landlord.company_name,
            avatar_url: landlord.avatar_url,
            is_verified: landlord.is_verified,
            verification_status: landlord.verification_status,
            verification_badge: landlord.verification_badge,
          }
        : null

  return {
    id: listing.id,
    lister_role: listing.listerRole,
    lister,
    title: listing.title,
    slug: listing.slug,
    description: listing.description,
    classification: listing.classification,
    state,
    city,
    area: listing.area,
    address: listing.address,
    location_coordinates:
      listing.latitude !== null && listing.longitude !== null
        ? { latitude: listing.latitude, longitude: listing.longitude }
        : null,
    property_type: propertyType,
    pricing: {
      base_price: listing.basePrice,
      payment_frequency: listing.paymentFrequency,
      agency_fee: listing.agencyFee,
      legal_fee: listing.legalFee,
      caution_fee: listing.cautionFee,
      service_charge: listing.serviceCharge,
      total_initial_package: listing.totalInitialPackage,
    },
    specifications: {
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      toilets: listing.toilets,
      amenities: listing.amenities,
    },
    media: {
      images: listing.images,
      video_tour_url: listing.videoTourUrl,
    },
    status: {
      availability_status: listing.availabilityStatus,
      moderation_status: listing.moderationStatus,
      rejection_reason: listing.rejectionReason,
      reviewed_at: listing.reviewedAt,
      published_at: listing.publishedAt,
    },
    property_verification: {
      is_verified: listing.isPropertyVerified,
      status: listing.propertyVerificationStatus,
      badge: listing.propertyVerificationBadge,
      verified_at: listing.propertyVerifiedAt,
    },
    rating: {
      average_rating: listing.averageRating,
      review_count: listing.reviewCount,
    },
    created_at: listing.createdAt,
    updated_at: listing.updatedAt,
  }
}

/**
 * Create a new property listing (Agent or Landlord)
 */
export async function createPropertyListing(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  input: CreateListingInput
) {
  // 1. Verify that the lister is KYC-verified
  if (listerRole === LISTER_ROLES.AGENT) {
    const [agent] = await db
      .select({ isVerified: agentUsers.isVerified })
      .from(agentUsers)
      .where(eq(agentUsers.id, listerId))
      .limit(1)

    if (!agent || !agent.isVerified) {
      throw new ForbiddenError(
        'Only KYC-verified real estate agents can publish property listings. Please submit your verification documents first.'
      )
    }
  } else {
    const [landlord] = await db
      .select({ isVerified: landlordUsers.isVerified })
      .from(landlordUsers)
      .where(eq(landlordUsers.id, listerId))
      .limit(1)

    if (!landlord || !landlord.isVerified) {
      throw new ForbiddenError(
        'Only KYC-verified landlords can publish property listings. Please submit your verification documents first.'
      )
    }
  }

  // 2. Validate State & City
  const [targetState] = await db
    .select()
    .from(states)
    .where(and(eq(states.id, input.state_id), eq(states.isActive, true)))
    .limit(1)
  if (!targetState) {
    throw new ValidationError([
      { field: 'state_id', issue: 'Selected state is invalid or inactive.' },
    ])
  }

  const [targetCity] = await db
    .select()
    .from(cities)
    .where(
      and(
        eq(cities.id, input.city_id),
        eq(cities.stateId, input.state_id),
        eq(cities.isActive, true)
      )
    )
    .limit(1)
  if (!targetCity) {
    throw new ValidationError([
      {
        field: 'city_id',
        issue: 'Selected city is invalid, inactive, or not in the chosen state.',
      },
    ])
  }

  // 3. Validate Property Type
  const [targetType] = await db
    .select()
    .from(propertyTypes)
    .where(
      and(
        eq(propertyTypes.id, input.property_type_id),
        eq(propertyTypes.isActive, true)
      )
    )
    .limit(1)
  if (!targetType) {
    throw new ValidationError([
      {
        field: 'property_type_id',
        issue: 'Selected property type is invalid or inactive.',
      },
    ])
  }

  // 4. Calculate Total Initial Package
  const agencyFee = input.agency_fee ?? 0
  const legalFee = input.legal_fee ?? 0
  const cautionFee = input.caution_fee ?? 0
  const serviceCharge = input.service_charge ?? 0
  const totalInitialPackage =
    input.base_price + agencyFee + legalFee + cautionFee + serviceCharge

  // 5. Generate Slug
  const slug = generateListingSlug(input.title)

  const [created] = await db
    .insert(propertyListings)
    .values({
      listerRole,
      agentId: listerRole === LISTER_ROLES.AGENT ? listerId : null,
      landlordId: listerRole === LISTER_ROLES.LANDLORD ? listerId : null,
      title: input.title,
      slug,
      description: input.description,
      classification: input.classification,
      propertyTypeId: input.property_type_id,
      stateId: input.state_id,
      cityId: input.city_id,
      area: input.area,
      address: input.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      basePrice: input.base_price,
      paymentFrequency: input.payment_frequency,
      agencyFee,
      legalFee,
      cautionFee,
      serviceCharge,
      totalInitialPackage,
      bedrooms: input.bedrooms ?? targetType.defaultBedrooms ?? 1,
      bathrooms: input.bathrooms ?? 1,
      toilets: input.toilets ?? 1,
      amenities: input.amenities ?? [],
      images: input.images,
      videoTourUrl: input.video_tour_url ?? null,
      availabilityStatus: AVAILABILITY_STATUSES.AVAILABLE,
      moderationStatus: MODERATION_STATUSES.PENDING_REVIEW,
    })
    .returning()

  return formatListingResponse({
    listing: created,
    state: { id: targetState.id, name: targetState.name, slug: targetState.slug },
    city: { id: targetCity.id, name: targetCity.name, slug: targetCity.slug },
    propertyType: {
      id: targetType.id,
      name: targetType.name,
      slug: targetType.slug,
      category: targetType.category,
    },
  })
}

/**
 * List listings owned by the authenticated Agent or Landlord
 */
export async function listMyPropertyListings(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  query: PaginationQueryInput & {
    moderation_status?: string
    availability_status?: string
  }
) {
  const offset = (query.page - 1) * query.per_page
  const conditions = [
    listerRole === LISTER_ROLES.AGENT
      ? eq(propertyListings.agentId, listerId)
      : eq(propertyListings.landlordId, listerId),
  ]

  if (query.moderation_status) {
    conditions.push(eq(propertyListings.moderationStatus, query.moderation_status))
  }
  if (query.availability_status) {
    conditions.push(
      eq(propertyListings.availabilityStatus, query.availability_status)
    )
  }

  const whereClause = and(...conditions)

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
    })
    .from(propertyListings)
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(propertyTypes, eq(propertyListings.propertyTypeId, propertyTypes.id))
    .where(whereClause)
    .orderBy(desc(propertyListings.createdAt))
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(propertyListings)
    .where(whereClause)

  return {
    items: rows.map((row) => formatListingResponse(row)),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Get a single listing owned by the authenticated Agent or Landlord
 */
export async function getMyPropertyListingById(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string
) {
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
    })
    .from(propertyListings)
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(propertyTypes, eq(propertyListings.propertyTypeId, propertyTypes.id))
    .where(
      and(
        eq(propertyListings.id, listingId),
        listerRole === LISTER_ROLES.AGENT
          ? eq(propertyListings.agentId, listerId)
          : eq(propertyListings.landlordId, listerId)
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Property listing not found.')
  }

  return formatListingResponse(row)
}

/**
 * Update a listing owned by the authenticated Agent or Landlord
 * (resets `moderationStatus` to `'pending_review'` for re-approval)
 */
export async function updateMyPropertyListing(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string,
  input: UpdateListingInput
) {
  const [existing] = await db
    .select()
    .from(propertyListings)
    .where(
      and(
        eq(propertyListings.id, listingId),
        listerRole === LISTER_ROLES.AGENT
          ? eq(propertyListings.agentId, listerId)
          : eq(propertyListings.landlordId, listerId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Property listing not found.')
  }

  const updateFields: Partial<typeof propertyListings.$inferInsert> = {
    moderationStatus: MODERATION_STATUSES.PENDING_REVIEW,
    updatedAt: new Date().toISOString(),
  }

  if (input.title !== undefined) {
    updateFields.title = input.title
    updateFields.slug = generateListingSlug(input.title)
  }
  if (input.description !== undefined) updateFields.description = input.description
  if (input.classification !== undefined)
    updateFields.classification = input.classification
  if (input.property_type_id !== undefined)
    updateFields.propertyTypeId = input.property_type_id
  if (input.state_id !== undefined) updateFields.stateId = input.state_id
  if (input.city_id !== undefined) updateFields.cityId = input.city_id
  if (input.area !== undefined) updateFields.area = input.area
  if (input.address !== undefined) updateFields.address = input.address
  if (input.latitude !== undefined) updateFields.latitude = input.latitude
  if (input.longitude !== undefined) updateFields.longitude = input.longitude
  if (input.bedrooms !== undefined) updateFields.bedrooms = input.bedrooms
  if (input.bathrooms !== undefined) updateFields.bathrooms = input.bathrooms
  if (input.toilets !== undefined) updateFields.toilets = input.toilets
  if (input.amenities !== undefined) updateFields.amenities = input.amenities
  if (input.images !== undefined) updateFields.images = input.images
  if (input.video_tour_url !== undefined)
    updateFields.videoTourUrl = input.video_tour_url

  const basePrice = input.base_price ?? existing.basePrice
  const agencyFee = input.agency_fee ?? existing.agencyFee
  const legalFee = input.legal_fee ?? existing.legalFee
  const cautionFee = input.caution_fee ?? existing.cautionFee
  const serviceCharge = input.service_charge ?? existing.serviceCharge
  const paymentFrequency = input.payment_frequency ?? existing.paymentFrequency

  updateFields.basePrice = basePrice
  updateFields.agencyFee = agencyFee
  updateFields.legalFee = legalFee
  updateFields.cautionFee = cautionFee
  updateFields.serviceCharge = serviceCharge
  updateFields.paymentFrequency = paymentFrequency
  updateFields.totalInitialPackage =
    basePrice + agencyFee + legalFee + cautionFee + serviceCharge

  const [updated] = await db
    .update(propertyListings)
    .set(updateFields)
    .where(eq(propertyListings.id, listingId))
    .returning()

  return getMyPropertyListingById(db, listerRole, listerId, updated.id)
}

/**
 * Update listing availability status (does not require re-moderation)
 */
export async function updateMyListingAvailability(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string,
  input: UpdateListingAvailabilityInput
) {
  const [existing] = await db
    .select({ id: propertyListings.id })
    .from(propertyListings)
    .where(
      and(
        eq(propertyListings.id, listingId),
        listerRole === LISTER_ROLES.AGENT
          ? eq(propertyListings.agentId, listerId)
          : eq(propertyListings.landlordId, listerId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Property listing not found.')
  }

  const [updated] = await db
    .update(propertyListings)
    .set({
      availabilityStatus: input.availability_status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(propertyListings.id, listingId))
    .returning()

  return getMyPropertyListingById(db, listerRole, listerId, updated.id)
}

/**
 * Delete a listing owned by the authenticated Agent or Landlord
 */
export async function deleteMyPropertyListing(
  db: Database,
  listerRole: ListerRole,
  listerId: string,
  listingId: string
) {
  const [existing] = await db
    .select({ id: propertyListings.id })
    .from(propertyListings)
    .where(
      and(
        eq(propertyListings.id, listingId),
        listerRole === LISTER_ROLES.AGENT
          ? eq(propertyListings.agentId, listerId)
          : eq(propertyListings.landlordId, listerId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Property listing not found.')
  }

  await db
    .delete(propertyListings)
    .where(eq(propertyListings.id, listingId))

  return { message: 'Property listing deleted successfully.' }
}

/**
 * Search & filter approved, available public listings (Public Discovery)
 */
export async function searchPublicListings(
  db: Database,
  query: ListingSearchQueryInput,
  seekerId?: string
) {
  const offset = (query.page - 1) * query.per_page

  const conditions = [
    eq(propertyListings.moderationStatus, MODERATION_STATUSES.APPROVED),
    eq(propertyListings.availabilityStatus, AVAILABILITY_STATUSES.AVAILABLE),
    or(
      and(
        eq(propertyListings.listerRole, LISTER_ROLES.AGENT),
        eq(agentUsers.isSuspended, false)
      ),
      and(
        eq(propertyListings.listerRole, LISTER_ROLES.LANDLORD),
        eq(landlordUsers.isSuspended, false)
      )
    )!,
  ]

  if (query.state_id) {
    conditions.push(eq(propertyListings.stateId, query.state_id))
  }
  if (query.city_id) {
    conditions.push(eq(propertyListings.cityId, query.city_id))
  }
  if (query.city_slug) {
    conditions.push(eq(cities.slug, query.city_slug))
  }
  if (query.classification) {
    conditions.push(eq(propertyListings.classification, query.classification))
  }
  if (query.property_type_id) {
    conditions.push(eq(propertyListings.propertyTypeId, query.property_type_id))
  }
  if (query.property_type_slug) {
    conditions.push(eq(propertyTypes.slug, query.property_type_slug))
  }
  if (query.category) {
    conditions.push(eq(propertyTypes.category, query.category))
  }
  if (query.min_price !== undefined) {
    conditions.push(gte(propertyListings.basePrice, query.min_price))
  }
  if (query.max_price !== undefined) {
    conditions.push(lte(propertyListings.basePrice, query.max_price))
  }
  if (query.bedrooms !== undefined) {
    conditions.push(gte(propertyListings.bedrooms, query.bedrooms))
  }
  if (query.bathrooms !== undefined) {
    conditions.push(gte(propertyListings.bathrooms, query.bathrooms))
  }
  if (query.verified_only) {
    conditions.push(eq(propertyListings.isPropertyVerified, true))
  }
  if (query.q) {
    const term = `%${query.q}%`
    conditions.push(
      or(
        like(propertyListings.title, term),
        like(propertyListings.description, term),
        like(propertyListings.area, term),
        like(propertyListings.address, term)
      )!
    )
  }

  const whereClause = and(...conditions)

  let orderByClause = [desc(propertyListings.createdAt)]
  if (query.sort === 'price_asc') {
    orderByClause = [asc(propertyListings.basePrice)]
  } else if (query.sort === 'price_desc') {
    orderByClause = [desc(propertyListings.basePrice)]
  } else if (query.sort === 'rating_desc') {
    orderByClause = [
      desc(propertyListings.averageRating),
      desc(propertyListings.reviewCount),
      desc(propertyListings.createdAt),
    ]
  }

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
    .orderBy(...orderByClause)
    .limit(query.per_page)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(propertyListings)
    .innerJoin(states, eq(propertyListings.stateId, states.id))
    .innerJoin(cities, eq(propertyListings.cityId, cities.id))
    .innerJoin(propertyTypes, eq(propertyListings.propertyTypeId, propertyTypes.id))
    .leftJoin(agentUsers, eq(propertyListings.agentId, agentUsers.id))
    .leftJoin(landlordUsers, eq(propertyListings.landlordId, landlordUsers.id))
    .where(whereClause)

  const listingIds = rows.map((r) => r.listing.id)
  const { countsByListingId, favoritedSet } =
    await getFavoriteMetadataForListings(db, listingIds, seekerId)

  return {
    items: rows.map((row) => ({
      ...formatListingResponse(row),
      favorites_count: countsByListingId.get(row.listing.id) ?? 0,
      is_favorited: favoritedSet.has(row.listing.id),
    })),
    page: query.page,
    perPage: query.per_page,
    total: Number(countResult?.count ?? 0),
  }
}

/**
 * Get a single public property listing by ID or Slug
 */
export async function getPublicPropertyListing(
  db: Database,
  idOrSlug: string,
  seekerId?: string
) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug
    )

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
    .where(
      and(
        isUuid
          ? eq(propertyListings.id, idOrSlug)
          : eq(propertyListings.slug, idOrSlug),
        eq(propertyListings.moderationStatus, MODERATION_STATUSES.APPROVED),
        or(
          and(
            eq(propertyListings.listerRole, LISTER_ROLES.AGENT),
            eq(agentUsers.isSuspended, false)
          ),
          and(
            eq(propertyListings.listerRole, LISTER_ROLES.LANDLORD),
            eq(landlordUsers.isSuspended, false)
          )
        )!
      )
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Property listing not found or not currently available.')
  }

  const { countsByListingId, favoritedSet } =
    await getFavoriteMetadataForListings(db, [row.listing.id], seekerId)

  return {
    ...formatListingResponse(row),
    favorites_count: countsByListingId.get(row.listing.id) ?? 0,
    is_favorited: favoritedSet.has(row.listing.id),
  }
}

