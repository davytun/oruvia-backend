import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn, timestamps } from './common'
import { users } from './user.model'

export const admins = sqliteTable('admins', {
  id: idColumn(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export type Admin = typeof admins.$inferSelect
export type NewAdmin = typeof admins.$inferInsert

