import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { VERIFICATION_STATUSES } from '../config/constants'
import { adminUsers } from './admin.model'
import { idColumn, timestamps } from './common'
import { propertyListings } from './listing.model'

/**
 * Listing-Level Property Verification Submissions (Document & Physical Site Inspection)
 */
export const propertyVerificationSubmissions = sqliteTable(
  'property_verification_submissions',
  {
    id: idColumn(),
    listingId: text('listing_id')
      .notNull()
      .references(() => propertyListings.id, { onDelete: 'cascade' }),
    listerRole: text('lister_role').notNull(), // 'agent' | 'landlord'
    listerId: text('lister_id').notNull(),
    verificationMethod: text('verification_method').notNull(), // 'document' | 'physical_inspection' | 'both'
    documentType: text('document_type'), // 'c_of_o' | 'deed_of_assignment' | 'survey_plan' | 'governors_consent' | 'tenancy_authority' | 'utility_bill'
    documentUrls: text('document_urls', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    siteContactName: text('site_contact_name'),
    siteContactPhone: text('site_contact_phone'),
    preferredInspectionDate: text('preferred_inspection_date'),
    notes: text('notes'),
    status: text('status').notNull().default(VERIFICATION_STATUSES.PENDING), // 'pending' | 'approved' | 'rejected'
    qualifiedBadge: text('qualified_badge'), // 'verified_property' | 'oruvia_inspected'
    rejectionReason: text('rejection_reason'),
    adminNotes: text('admin_notes'),
    reviewedByAdminId: text('reviewed_by_admin_id').references(
      () => adminUsers.id,
      { onDelete: 'set null' }
    ),
    submittedAt: text('submitted_at').notNull(),
    reviewedAt: text('reviewed_at'),
    ...timestamps,
  },
  (table) => [
    index('idx_prop_verif_listing').on(table.listingId),
    index('idx_prop_verif_status').on(table.status),
    index('idx_prop_verif_lister').on(table.listerRole, table.listerId),
  ]
)

export type PropertyVerificationSubmission =
  typeof propertyVerificationSubmissions.$inferSelect
export type NewPropertyVerificationSubmission =
  typeof propertyVerificationSubmissions.$inferInsert

