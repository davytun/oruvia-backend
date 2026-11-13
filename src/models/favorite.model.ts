import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { idColumn } from './common'
import { propertyListings } from './listing.model'
import { seekerUsers } from './seeker.model'

/**
 * Saved / Favorite Property Listings for Seekers
 */
export const seekerFavorites = sqliteTable(
  'seeker_favorites',
  {
    id: idColumn(),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => seekerUsers.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => propertyListings.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_seeker_favorites_unique').on(
      table.seekerId,
      table.listingId
    ),
    index('idx_seeker_favorites_seeker_created').on(
      table.seekerId,
      table.createdAt
    ),
    index('idx_seeker_favorites_listing').on(table.listingId),
  ]
)

export type SeekerFavorite = typeof seekerFavorites.$inferSelect
export type NewSeekerFavorite = typeof seekerFavorites.$inferInsert
