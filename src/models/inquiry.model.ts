import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { INQUIRY_STATUSES } from '../config/constants'
import { idColumn, timestamps } from './common'
import { propertyListings } from './listing.model'
import { seekerUsers } from './seeker.model'

/**
 * Property Inquiries (1 continuous conversation thread per Seeker + Listing)
 */
export const propertyInquiries = sqliteTable(
  'property_inquiries',
  {
    id: idColumn(),
    reference: text('reference').notNull().unique(), // e.g. "ORV-INQ-8M4P2K"
    listingId: text('listing_id')
      .notNull()
      .references(() => propertyListings.id, { onDelete: 'cascade' }),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => seekerUsers.id, { onDelete: 'cascade' }),
    listerRole: text('lister_role').notNull(), // 'agent' | 'landlord'
    listerId: text('lister_id').notNull(),
    subject: text('subject'),
    status: text('status').notNull().default(INQUIRY_STATUSES.OPEN), // 'open' | 'responded' | 'closed'
    lastMessagePreview: text('last_message_preview'),
    lastMessageAt: text('last_message_at').notNull(),
    lastSenderRole: text('last_sender_role').notNull(), // 'seeker' | 'agent' | 'landlord'
    seekerUnreadCount: integer('seeker_unread_count').notNull().default(0),
    listerUnreadCount: integer('lister_unread_count').notNull().default(0),
    closedBy: text('closed_by'), // 'seeker' | 'agent' | 'landlord'
    closedAt: text('closed_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_inquiries_seeker_listing').on(
      table.seekerId,
      table.listingId
    ),
    index('idx_inquiries_seeker_last').on(table.seekerId, table.lastMessageAt),
    index('idx_inquiries_lister_last').on(
      table.listerRole,
      table.listerId,
      table.lastMessageAt
    ),
    index('idx_inquiries_status').on(table.status),
  ]
)

/**
 * Messages inside a Property Inquiry conversation
 */
export const inquiryMessages = sqliteTable(
  'inquiry_messages',
  {
    id: idColumn(),
    inquiryId: text('inquiry_id')
      .notNull()
      .references(() => propertyInquiries.id, { onDelete: 'cascade' }),
    senderRole: text('sender_role').notNull(), // 'seeker' | 'agent' | 'landlord'
    senderId: text('sender_id').notNull(),
    body: text('body').notNull(),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: text('read_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_inquiry_messages_inquiry_created').on(
      table.inquiryId,
      table.createdAt
    ),
  ]
)

export type PropertyInquiry = typeof propertyInquiries.$inferSelect
export type NewPropertyInquiry = typeof propertyInquiries.$inferInsert
export type InquiryMessage = typeof inquiryMessages.$inferSelect
export type NewInquiryMessage = typeof inquiryMessages.$inferInsert

