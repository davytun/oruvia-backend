import { and, desc, eq, sql } from 'drizzle-orm'
import type { NotificationType } from '../config/constants'
import type { Database } from '../database'
import { adminUsers, notifications, type Notification } from '../models'
import { NotFoundError } from '../utils/errors'
import { buildPaginationMeta, getPaginationOffset } from '../utils/response'
import type { NotificationListQueryInput } from '../utils/validators'

export type NotificationRecipientRole =
  | 'seeker'
  | 'agent'
  | 'landlord'
  | 'admin'

export interface CreateNotificationInput {
  recipientRole: NotificationRecipientRole
  recipientId: string
  type: NotificationType | string
  title: string
  message: string
  entityType?:
    | 'inquiry'
    | 'inspection'
    | 'listing'
    | 'kyc'
    | 'property_verification'
    | 'report'
  entityId?: string
  metadata?: Record<string, unknown>
}

function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function formatNotificationResponse(n: Notification) {
  return {
    id: n.id,
    recipient_role: n.recipientRole,
    recipient_id: n.recipientId,
    type: n.type,
    title: n.title,
    message: n.message,
    entity_type: n.entityType,
    entity_id: n.entityId,
    metadata: parseMetadata(n.metadata),
    is_read: n.isRead,
    read_at: n.readAt,
    created_at: n.createdAt,
  }
}

export async function createNotification(
  db: Database,
  input: CreateNotificationInput
) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(notifications).values({
    id,
    recipientRole: input.recipientRole,
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    isRead: false,
    readAt: null,
    createdAt: now,
  })

  return id
}

/**
 * Non-blocking helper so notification persistence errors never fail primary API flows.
 */
export async function safeCreateNotification(
  db: Database,
  input: CreateNotificationInput
) {
  try {
    await createNotification(db, input)
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err)
  }
}

export async function notifyAllActiveAdmins(
  db: Database,
  input: Omit<CreateNotificationInput, 'recipientRole' | 'recipientId'>
) {
  try {
    const activeAdmins = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.isSuspended, false))

    if (activeAdmins.length === 0) return

    const now = new Date().toISOString()
    await db.insert(notifications).values(
      activeAdmins.map((admin) => ({
        id: crypto.randomUUID(),
        recipientRole: 'admin' as const,
        recipientId: admin.id,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        isRead: false,
        readAt: null,
        createdAt: now,
      }))
    )
  } catch (err) {
    console.error('[NotificationService] Failed to notify admins:', err)
  }
}

export async function getUnreadNotificationCount(
  db: Database,
  recipientRole: NotificationRecipientRole,
  recipientId: string
): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientRole, recipientRole),
        eq(notifications.recipientId, recipientId),
        eq(notifications.isRead, false)
      )
    )
  return Number(count ?? 0)
}

export async function listNotifications(
  db: Database,
  recipientRole: NotificationRecipientRole,
  recipientId: string,
  query: NotificationListQueryInput
) {
  const conditions = [
    eq(notifications.recipientRole, recipientRole),
    eq(notifications.recipientId, recipientId),
  ]

  if (query.unread_only) {
    conditions.push(eq(notifications.isRead, false))
  }
  if (query.type) {
    conditions.push(eq(notifications.type, query.type))
  }

  const whereClause = and(...conditions)
  const { page, per_page, limit, offset } = getPaginationOffset(
    query.page,
    query.per_page
  )

  const [rows, [{ count }], unreadCount] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(whereClause),
    getUnreadNotificationCount(db, recipientRole, recipientId),
  ])

  return {
    items: rows.map(formatNotificationResponse),
    unread_count: unreadCount,
    pagination: buildPaginationMeta(page, per_page, Number(count)),
  }
}

export async function markNotificationAsRead(
  db: Database,
  recipientRole: NotificationRecipientRole,
  recipientId: string,
  notificationId: string
) {
  const [existing] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientRole, recipientRole),
        eq(notifications.recipientId, recipientId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Notification not found.')
  }

  if (!existing.isRead) {
    const now = new Date().toISOString()
    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(eq(notifications.id, notificationId))
  }

  const [updated] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1)

  return formatNotificationResponse(updated)
}

export async function markAllNotificationsAsRead(
  db: Database,
  recipientRole: NotificationRecipientRole,
  recipientId: string
) {
  const now = new Date().toISOString()
  await db
    .update(notifications)
    .set({ isRead: true, readAt: now })
    .where(
      and(
        eq(notifications.recipientRole, recipientRole),
        eq(notifications.recipientId, recipientId),
        eq(notifications.isRead, false)
      )
    )

  return { marked_all_read: true, read_at: now }
}

export async function deleteNotification(
  db: Database,
  recipientRole: NotificationRecipientRole,
  recipientId: string,
  notificationId: string
) {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientRole, recipientRole),
        eq(notifications.recipientId, recipientId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Notification not found.')
  }

  await db.delete(notifications).where(eq(notifications.id, notificationId))
  return { deleted: true, id: notificationId }
}

export async function clearReadNotifications(
  db: Database,
  recipientRole: NotificationRecipientRole,
  recipientId: string
) {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientRole, recipientRole),
        eq(notifications.recipientId, recipientId),
        eq(notifications.isRead, true)
      )
    )

  return { cleared_read: true }
}

