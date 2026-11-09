import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { VERIFICATION_STATUSES } from '../config/constants'
import { idColumn, timestamps } from './common'

export const agentUsers = sqliteTable('agent_users', {
  id: idColumn(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  whatsappNumber: text('whatsapp_number'),
  agencyName: text('agency_name'),
  licenseNumber: text('license_number'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  isEmailVerified: integer('is_email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  emailVerifiedAt: text('email_verified_at'),
  isVerified: integer('is_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  verificationStatus: text('verification_status')
    .notNull()
    .default(VERIFICATION_STATUSES.UNVERIFIED),
  tokenVersion: integer('token_version').notNull().default(0),
  isSuspended: integer('is_suspended', { mode: 'boolean' })
    .notNull()
    .default(false),
  ...timestamps,
})

export const agentVerificationCodes = sqliteTable(
  'agent_verification_codes',
  {
    id: idColumn(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agentUsers.id, { onDelete: 'cascade' }),
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
    index('idx_agent_codes_agent_purpose').on(table.agentId, table.purpose),
  ]
)

export type AgentUser = typeof agentUsers.$inferSelect
export type NewAgentUser = typeof agentUsers.$inferInsert
export type AgentVerificationCode = typeof agentVerificationCodes.$inferSelect
