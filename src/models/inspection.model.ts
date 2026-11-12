import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import {
  INSPECTION_FEE_STATUSES,
  INSPECTION_MODES,
  INSPECTION_STATUSES,
  LISTER_ROLES,
  type InspectionFeeStatus,
  type InspectionMode,
  type InspectionStatus,
  type ListerRole,
  type VirtualInspectionMethod,
} from '../config/constants'
import { idColumn, timestamps } from './common'
import { propertyListings } from './listing.model'
import { seekerUsers } from './seeker.model'

/**
 * Inspection Settings per Lister (Agent or Landlord)
 */
export const inspectionSettings = sqliteTable(
  'inspection_settings',
  {
    id: idColumn(),
    listerRole: text('lister_role').notNull().default(LISTER_ROLES.AGENT), // 'agent' | 'landlord'
    listerId: text('lister_id').notNull(),
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(30),
    maxBookingsPerSlot: integer('max_bookings_per_slot').notNull().default(1),
    minNoticeHours: integer('min_notice_hours').notNull().default(0),
    acceptsVirtual: integer('accepts_virtual', { mode: 'boolean' })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_inspection_settings_lister').on(
      table.listerRole,
      table.listerId
    ),
  ]
)

/**
 * Weekly Recurring Availability Windows for a Lister (WAT 0-6 days)
 */
export const listerAvailabilityWindows = sqliteTable(
  'lister_availability_windows',
  {
    id: idColumn(),
    listerRole: text('lister_role').notNull(),
    listerId: text('lister_id').notNull(),
    dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startTime: text('start_time').notNull(), // "09:00" (WAT, 24-hr format)
    endTime: text('end_time').notNull(), // "17:00" (WAT, 24-hr format)
    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    index('idx_lister_windows_lister_day').on(
      table.listerRole,
      table.listerId,
      table.dayOfWeek
    ),
  ]
)

/**
 * Specific Dates Blocked by a Lister (holidays, personal days)
 */
export const listerBlockedDates = sqliteTable(
  'lister_blocked_dates',
  {
    id: idColumn(),
    listerRole: text('lister_role').notNull(),
    listerId: text('lister_id').notNull(),
    date: text('date').notNull(), // "YYYY-MM-DD"
    reason: text('reason'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_lister_blocked_dates_lister_date').on(
      table.listerRole,
      table.listerId,
      table.date
    ),
  ]
)

/**
 * Inspection Bookings between Seekers and Listings/Listers
 */
export const inspectionBookings = sqliteTable(
  'inspection_bookings',
  {
    id: idColumn(),
    reference: text('reference').notNull().unique(), // e.g. "ORV-INS-7K2M9Q"
    listingId: text('listing_id')
      .notNull()
      .references(() => propertyListings.id, { onDelete: 'cascade' }),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => seekerUsers.id, { onDelete: 'cascade' }),
    listerRole: text('lister_role').notNull(), // 'agent' | 'landlord'
    listerId: text('lister_id').notNull(),

    // Inspection Mode & Virtual Details
    mode: text('mode').notNull().default(INSPECTION_MODES.PHYSICAL), // 'physical' | 'virtual'
    virtualMethod: text('virtual_method'), // 'live_video_call' | 'recorded_walkthrough'
    meetingLink: text('meeting_link'),
    recordedVideoUrl: text('recorded_video_url'),

    // Schedule & Duration
    scheduledAt: text('scheduled_at').notNull(), // ISO-8601 UTC
    durationMinutes: integer('duration_minutes').notNull().default(30),

    // State Machine
    status: text('status').notNull().default(INSPECTION_STATUSES.PENDING),
    statusBeforeReschedule: text('status_before_reschedule'),

    // Reschedule proposal fields
    proposedAt: text('proposed_at'),
    proposedBy: text('proposed_by'), // 'seeker' | 'lister'
    rescheduleReason: text('reschedule_reason'),

    // Communication Notes & Reasons
    seekerNote: text('seeker_note'),
    listerNote: text('lister_note'),
    declineReason: text('decline_reason'),
    cancelReason: text('cancel_reason'),
    cancelledBy: text('cancelled_by'), // 'seeker' | 'lister' | 'admin' | 'system'

    // Fee Snapshot & Offline Payment Status
    inspectionFee: integer('inspection_fee').notNull().default(0), // NGN
    feeStatus: text('fee_status')
      .notNull()
      .default(INSPECTION_FEE_STATUSES.NOT_REQUIRED), // 'not_required' | 'unpaid' | 'paid' | 'waived'

    // Timestamps
    reminderSentAt: text('reminder_sent_at'),
    confirmedAt: text('confirmed_at'),
    completedAt: text('completed_at'),
    cancelledAt: text('cancelled_at'),
    ...timestamps,
  },
  (table) => [
    index('idx_inspections_seeker_status').on(table.seekerId, table.status),
    index('idx_inspections_lister_status').on(
      table.listerRole,
      table.listerId,
      table.status
    ),
    index('idx_inspections_listing_id').on(table.listingId),
    index('idx_inspections_status_scheduled').on(
      table.status,
      table.scheduledAt
    ),
  ]
)

/**
 * Inspection Booking Events: Immutable Audit Log & Timeline
 */
export const inspectionBookingEvents = sqliteTable(
  'inspection_booking_events',
  {
    id: idColumn(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => inspectionBookings.id, { onDelete: 'cascade' }),
    actorType: text('actor_type').notNull(), // 'seeker' | 'agent' | 'landlord' | 'admin' | 'system'
    actorId: text('actor_id'),
    action: text('action').notNull(), // e.g. 'requested', 'confirmed', 'admin_override'
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    note: text('note'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_inspection_events_booking_created').on(
      table.bookingId,
      table.createdAt
    ),
  ]
)

export type InspectionSettings = typeof inspectionSettings.$inferSelect
export type NewInspectionSettings = typeof inspectionSettings.$inferInsert
export type ListerAvailabilityWindow =
  typeof listerAvailabilityWindows.$inferSelect
export type NewListerAvailabilityWindow =
  typeof listerAvailabilityWindows.$inferInsert
export type ListerBlockedDate = typeof listerBlockedDates.$inferSelect
export type NewListerBlockedDate = typeof listerBlockedDates.$inferInsert
export type InspectionBooking = typeof inspectionBookings.$inferSelect
export type NewInspectionBooking = typeof inspectionBookings.$inferInsert
export type InspectionBookingEvent =
  typeof inspectionBookingEvents.$inferSelect
export type NewInspectionBookingEvent =
  typeof inspectionBookingEvents.$inferInsert
