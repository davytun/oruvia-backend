import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { VERIFICATION_STATUSES } from '../config/constants'
import { idColumn, timestamps } from './common'
import { users } from './user.model'

export const agents = sqliteTable('agents', {
  id: idColumn(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  agencyName: text('agency_name'),
  licenseNumber: text('license_number'),
  bio: text('bio'),
  whatsappNumber: text('whatsapp_number'),
  isVerified: integer('is_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  verificationStatus: text('verification_status')
    .notNull()
    .default(VERIFICATION_STATUSES.UNVERIFIED),
  ...timestamps,
})

export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert

