import type { Context } from 'hono'
import type { AppEnv } from '../config/env'
import {
  clearReadNotifications,
  deleteNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationRecipientRole,
} from '../services/notification.service'
import { sendSuccess } from '../utils/response'
import { notificationListQuerySchema } from '../utils/validators'

export async function listNotificationsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const query = notificationListQuerySchema.parse(c.req.query())
  const result = await listNotifications(
    db,
    user.accountType as NotificationRecipientRole,
    user.id,
    query
  )
  return sendSuccess(c, {
    unread_count: result.unread_count,
    notifications: result.items,
    pagination: result.pagination,
  })
}

export async function getUnreadNotificationCountHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const unread_count = await getUnreadNotificationCount(
    db,
    user.accountType as NotificationRecipientRole,
    user.id
  )
  return sendSuccess(c, { unread_count })
}

export async function markNotificationAsReadHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const notificationId = c.req.param('id')!
  const notification = await markNotificationAsRead(
    db,
    user.accountType as NotificationRecipientRole,
    user.id,
    notificationId
  )
  return sendSuccess(c, { notification })
}

export async function markAllNotificationsAsReadHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const result = await markAllNotificationsAsRead(
    db,
    user.accountType as NotificationRecipientRole,
    user.id
  )
  return sendSuccess(c, result)
}

export async function clearReadNotificationsHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const result = await clearReadNotifications(
    db,
    user.accountType as NotificationRecipientRole,
    user.id
  )
  return sendSuccess(c, result)
}

export async function deleteNotificationHandler(c: Context<AppEnv>) {
  const db = c.get('db')
  const user = c.get('user')!
  const notificationId = c.req.param('id')!
  const result = await deleteNotification(
    db,
    user.accountType as NotificationRecipientRole,
    user.id,
    notificationId
  )
  return sendSuccess(c, result)
}

