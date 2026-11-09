import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn, timestamps } from './common'

export const adminUsers = sqliteTable('admin_users', {
  id: idColumn(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  tokenVersion: integer('token_version').notNull().default(0),
  ...timestamps,
})

export type AdminUser = typeof adminUsers.$inferSelect
export type NewAdminUser = typeof adminUsers.$inferInsert
