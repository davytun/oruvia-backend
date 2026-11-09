import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn, timestamps } from './common'
import { users } from './user.model'

export const seekers = sqliteTable('seekers', {
  id: idColumn(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  preferredLocation: text('preferred_location'),
  ...timestamps,
})

export type Seeker = typeof seekers.$inferSelect
export type NewSeeker = typeof seekers.$inferInsert

