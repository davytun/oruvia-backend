import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { REVIEW_STATUSES } from '../config/constants'
import { adminUsers } from './admin.model'
import { idColumn, timestamps } from './common'
import { propertyListings } from './listing.model'
import { seekerUsers } from './seeker.model'

export const reviews = sqliteTable(
  'reviews',
  {
    id: idColumn(),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => seekerUsers.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // 'listing' | 'lister'
    listingId: text('listing_id').references(() => propertyListings.id, {
      onDelete: 'cascade',
    }),
    listerType: text('lister_type'), // 'agent' | 'landlord'
    listerId: text('lister_id'),
    rating: integer('rating').notNull(), // 1..5
    comment: text('comment'),
    isVerifiedInspection: integer('is_verified_inspection', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    status: text('status').notNull().default(REVIEW_STATUSES.PUBLISHED), // 'published' | 'hidden'
    replyText: text('reply_text'),
    repliedAt: text('replied_at'),
    hiddenReason: text('hidden_reason'),
    moderatedBy: text('moderated_by').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    moderatedAt: text('moderated_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uq_reviews_seeker_listing')
      .on(table.seekerId, table.listingId)
      .where(sql`${table.targetType} = 'listing'`),
    uniqueIndex('uq_reviews_seeker_lister')
      .on(table.seekerId, table.listerType, table.listerId)
      .where(sql`${table.targetType} = 'lister'`),
    index('idx_reviews_listing_status').on(table.listingId, table.status),
    index('idx_reviews_lister_status').on(
      table.listerType,
      table.listerId,
      table.status
    ),
    index('idx_reviews_seeker').on(table.seekerId),
  ]
)

export type Review = typeof reviews.$inferSelect
export type NewReview = typeof reviews.$inferInsert

