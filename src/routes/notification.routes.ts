import { zValidator } from '@hono/zod-validator'
import { factory } from '../config/env'
import {
  clearReadNotificationsHandler,
  deleteNotificationHandler,
  getUnreadNotificationCountHandler,
  listNotificationsHandler,
  markAllNotificationsAsReadHandler,
  markNotificationAsReadHandler,
} from '../controllers/notification.controller'
import { notificationListQuerySchema, validationHook } from '../utils/validators'

/**
 * Reusable Notification Inbox Router
 * Mounted under `/seekers/notifications`, `/agents/notifications`,
 * `/landlords/notifications`, and `/admins/notifications` after their respective auth middleware.
 */
export function createNotificationRouter(authMiddleware: any) {
  const router = factory.createApp()

  router.use('*', authMiddleware)

  router.get(
    '/',
    zValidator('query', notificationListQuerySchema, validationHook),
    listNotificationsHandler
  )
  router.get('/unread-count', getUnreadNotificationCountHandler)
  router.post('/read-all', markAllNotificationsAsReadHandler)
  router.delete('/read', clearReadNotificationsHandler)
  router.patch('/:id/read', markNotificationAsReadHandler)
  router.delete('/:id', deleteNotificationHandler)

  return router
}

