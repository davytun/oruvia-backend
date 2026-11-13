import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { REPORT_STATUSES } from '../config/constants'
import { adminUsers } from './admin.model'
import { idColumn, timestamps } from './common'
import { propertyListings } from './listing.model'

export const reports = sqliteTable(
  'reports',
  {
    id: idColumn(),
    reporterRole: text('reporter_role').notNull(), // 'seeker' | 'agent' | 'landlord'
    reporterId: text('reporter_id').notNull(),
    targetType: text('target_type').notNull(), // 'listing' | 'user'
    listingId: text('listing_id').references(() => propertyListings.id, {
      onDelete: 'cascade',
    }),
    targetUserRole: text('target_user_role'), // 'seeker' | 'agent' | 'landlord'
    targetUserId: text('target_user_id'),
    reason: text('reason').notNull(),
    description: text('description'),
    evidenceUrls: text('evidence_urls'), // JSON array of URLs
    status: text('status').notNull().default(REPORT_STATUSES.PENDING), // 'pending' | 'under_review' | 'resolved' | 'dismissed'
    actionTaken: text('action_taken'), // 'none' | 'suspend_listing' | 'suspend_user' | 'suspend_user_and_listings'
    adminNotes: text('admin_notes'),
    reviewedByAdminId: text('reviewed_by_admin_id').references(
      () => adminUsers.id,
      { onDelete: 'set null' }
    ),
    reviewedAt: text('reviewed_at'),
    ...timestamps,
  },
  (table) => [
    index('idx_reports_reporter').on(table.reporterRole, table.reporterId),
    index('idx_reports_status').on(table.status),
    index('idx_reports_listing').on(table.listingId),
    index('idx_reports_target_user').on(
      table.targetUserRole,
      table.targetUserId
    ),
  ]
)

export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert

