import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import {
  AVAILABILITY_STATUSES,
  LISTER_ROLES,
  LISTING_CLASSIFICATIONS,
  MODERATION_STATUSES,
  PAYMENT_FREQUENCIES,
  PROPERTY_CATEGORIES,
  VERIFICATION_STATUSES,
} from '../config/constants'
import { adminUsers } from './admin.model'
import { agentUsers } from './agent.model'
import { idColumn, timestamps } from './common'
import { landlordUsers } from './landlord.model'

/**
 * Supported States for geographic discovery (Admin-managed)
 */
export const states = sqliteTable('states', {
  id: idColumn(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' })
    .notNull()
    .default(true),
  ...timestamps,
})

/**
 * Supported Cities within States (Admin-managed)
 */
export const cities = sqliteTable(
  'cities',
  {
    id: idColumn(),
    stateId: text('state_id')
      .notNull()
      .references(() => states.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    index('idx_cities_state_id').on(table.stateId),
    uniqueIndex('idx_cities_state_slug').on(table.stateId, table.slug),
  ]
)

/**
 * Authentic Nigerian Property Types catalog (Admin-managed)
 */
export const propertyTypes = sqliteTable(
  'property_types',
  {
    id: idColumn(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    category: text('category').notNull().default(PROPERTY_CATEGORIES.RESIDENTIAL), // 'residential' | 'commercial' | 'land'
    description: text('description'),
    defaultBedrooms: integer('default_bedrooms'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    index('idx_property_types_category').on(table.category),
    index('idx_property_types_order').on(table.displayOrder),
  ]
)

/**
 * Property Listings (created by verified Agents & Landlords, moderated by Admins)
 */
export const propertyListings = sqliteTable(
  'property_listings',
  {
    id: idColumn(),
    listerRole: text('lister_role').notNull().default(LISTER_ROLES.AGENT), // 'agent' | 'landlord'
    agentId: text('agent_id').references(() => agentUsers.id, {
      onDelete: 'cascade',
    }),
    landlordId: text('landlord_id').references(() => landlordUsers.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    classification: text('classification')
      .notNull()
      .default(LISTING_CLASSIFICATIONS.RENT), // 'rent' | 'sale'
    propertyTypeId: text('property_type_id')
      .notNull()
      .references(() => propertyTypes.id),
    stateId: text('state_id')
      .notNull()
      .references(() => states.id),
    cityId: text('city_id')
      .notNull()
      .references(() => cities.id),
    area: text('area').notNull(),
    address: text('address').notNull(),
    latitude: real('latitude'),
    longitude: real('longitude'),

    // Nigerian Pricing & Fee Transparency
    basePrice: integer('base_price').notNull(),
    paymentFrequency: text('payment_frequency')
      .notNull()
      .default(PAYMENT_FREQUENCIES.YEARLY), // 'yearly' | 'monthly' | 'one_time'
    agencyFee: integer('agency_fee').notNull().default(0),
    legalFee: integer('legal_fee').notNull().default(0),
    cautionFee: integer('caution_fee').notNull().default(0),
    serviceCharge: integer('service_charge').notNull().default(0),
    totalInitialPackage: integer('total_initial_package').notNull(),

    // Specifications
    bedrooms: integer('bedrooms').notNull().default(1),
    bathrooms: integer('bathrooms').notNull().default(1),
    toilets: integer('toilets').notNull().default(1),
    amenities: text('amenities', { mode: 'json' })
      .$type<string[]>()
      .notNull(),
    images: text('images', { mode: 'json' })
      .$type<string[]>()
      .notNull(),
    videoTourUrl: text('video_tour_url'),

    // Inspection Options
    inspectionFee: integer('inspection_fee').notNull().default(0),
    allowsPhysicalInspection: integer('allows_physical_inspection', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),
    allowsVirtualInspection: integer('allows_virtual_inspection', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),

    // Status & Moderation
    availabilityStatus: text('availability_status')
      .notNull()
      .default(AVAILABILITY_STATUSES.AVAILABLE), // 'available' | 'rented' | 'sold' | 'unavailable'
    moderationStatus: text('moderation_status')
      .notNull()
      .default(MODERATION_STATUSES.PENDING_REVIEW), // 'pending_review' | 'approved' | 'rejected' | 'suspended'
    rejectionReason: text('rejection_reason'),
    reviewedByAdminId: text('reviewed_by_admin_id').references(
      () => adminUsers.id,
      { onDelete: 'set null' }
    ),
    reviewedAt: text('reviewed_at'),
    publishedAt: text('published_at'),

    // Listing-Level Property Verification
    isPropertyVerified: integer('is_property_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    propertyVerificationStatus: text('property_verification_status')
      .notNull()
      .default(VERIFICATION_STATUSES.UNVERIFIED), // 'unverified' | 'pending' | 'approved' | 'rejected'
    propertyVerificationBadge: text('property_verification_badge'), // 'verified_property' | 'oruvia_inspected'
    propertyVerifiedAt: text('property_verified_at'),

    // Aggregate Reviews & Ratings
    averageRating: real('average_rating').notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),

    ...timestamps,
  },
  (table) => [
    index('idx_listings_agent_id').on(table.agentId),
    index('idx_listings_landlord_id').on(table.landlordId),
    index('idx_listings_state_city').on(table.stateId, table.cityId),
    index('idx_listings_type').on(table.propertyTypeId),
    index('idx_listings_moderation_avail').on(
      table.moderationStatus,
      table.availabilityStatus
    ),
    index('idx_listings_base_price').on(table.basePrice),
    index('idx_listings_property_verified').on(table.isPropertyVerified),
  ]
)

export type State = typeof states.$inferSelect
export type NewState = typeof states.$inferInsert
export type City = typeof cities.$inferSelect
export type NewCity = typeof cities.$inferInsert
export type PropertyType = typeof propertyTypes.$inferSelect
export type NewPropertyType = typeof propertyTypes.$inferInsert
export type PropertyListing = typeof propertyListings.$inferSelect
export type NewPropertyListing = typeof propertyListings.$inferInsert

