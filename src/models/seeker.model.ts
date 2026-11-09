import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn, timestamps } from './common'

export const seekerUsers = sqliteTable('seeker_users', {
  id: idColumn(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  preferredLocation: text('preferred_location'),
  isEmailVerified: integer('is_email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  emailVerifiedAt: text('email_verified_at'),
  tokenVersion: integer('token_version').notNull().default(0),
  isSuspended: integer('is_suspended', { mode: 'boolean' })
    .notNull()
    .default(false),
  ...timestamps,
})

export const seekerVerificationCodes = sqliteTable(
  'seeker_verification_codes',
  {
    id: idColumn(),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => seekerUsers.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    purpose: text('purpose').notNull(), // 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
    expiresAt: text('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    usedAt: text('used_at'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index('idx_seeker_codes_seeker_purpose').on(table.seekerId, table.purpose),
  ]
)

export type SeekerUser = typeof seekerUsers.$inferSelect
export type NewSeekerUser = typeof seekerUsers.$inferInsert
export type SeekerVerificationCode =
  typeof seekerVerificationCodes.$inferSelect
