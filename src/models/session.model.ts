import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn, timestamps } from './common'
import { users } from './user.model'

export const sessions = sqliteTable(
  'sessions',
  {
    id: idColumn(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (table) => [index('idx_sessions_user').on(table.userId)]
)

export const verificationCodes = sqliteTable(
  'verification_codes',
  {
    id: idColumn(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // 'email_verify' | 'password_reset'
    codeHash: text('code_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: text('consumed_at'),
    ...timestamps,
  },
  (table) => [index('idx_verification_codes_user').on(table.userId)]
)

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type VerificationCode = typeof verificationCodes.$inferSelect
export type NewVerificationCode = typeof verificationCodes.$inferInsert

