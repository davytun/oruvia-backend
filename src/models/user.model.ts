import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn, timestamps } from './common'

export const users = sqliteTable('users', {
  id: idColumn(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  emailVerifiedAt: text('email_verified_at'),
  isSuspended: integer('is_suspended', { mode: 'boolean' })
    .notNull()
    .default(false),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: text('locked_until'),
  lastLoginAt: text('last_login_at'),
  ...timestamps,
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

