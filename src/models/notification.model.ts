import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { idColumn } from './common'

export const notifications = sqliteTable(
  'notifications',
  {
    id: idColumn(),
    recipientRole: text('recipient_role').notNull(), // 'seeker' | 'agent' | 'landlord' | 'admin'
    recipientId: text('recipient_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    entityType: text('entity_type'), // 'inquiry' | 'inspection' | 'listing' | 'kyc' | 'property_verification' | 'report'
    entityId: text('entity_id'),
    metadata: text('metadata'), // JSON object
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: text('read_at'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index('idx_notifications_recipient_created').on(
      table.recipientRole,
      table.recipientId,
      table.createdAt
    ),
    index('idx_notifications_recipient_unread').on(
      table.recipientRole,
      table.recipientId,
      table.isRead
    ),
  ]
)

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

