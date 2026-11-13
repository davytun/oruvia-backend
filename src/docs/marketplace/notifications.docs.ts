function buildNotificationPaths(
  role: 'seekers' | 'agents' | 'landlords' | 'admins',
  tag: string
) {
  const base = `/api/v1/${role}/notifications`
  return {
    [base]: {
      get: {
        tags: [tag],
        summary: 'List notifications for the authenticated user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'unread_only',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          {
            name: 'per_page',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated notifications with unread_count',
          },
        },
      },
    },
    [`${base}/unread-count`]: {
      get: {
        tags: [tag],
        summary: 'Get unread notification count',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Unread notification count' },
        },
      },
    },
    [`${base}/read-all`]: {
      post: {
        tags: [tag],
        summary: 'Mark all unread notifications as read',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'All notifications marked as read' },
        },
      },
    },
    [`${base}/read`]: {
      delete: {
        tags: [tag],
        summary: 'Clear all read notifications',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Read notifications cleared' },
        },
      },
    },
    [`${base}/{id}/read`]: {
      patch: {
        tags: [tag],
        summary: 'Mark a single notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Notification marked as read' },
          '404': { description: 'Notification not found' },
        },
      },
    },
    [`${base}/{id}`]: {
      delete: {
        tags: [tag],
        summary: 'Delete a single notification',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Notification deleted' },
          '404': { description: 'Notification not found' },
        },
      },
    },
  }
}

export const seekerNotificationPaths = buildNotificationPaths(
  'seekers',
  'Notifications - Seekers'
)
export const agentNotificationPaths = buildNotificationPaths(
  'agents',
  'Notifications - Agents'
)
export const landlordNotificationPaths = buildNotificationPaths(
  'landlords',
  'Notifications - Landlords'
)
export const adminNotificationPaths = buildNotificationPaths(
  'admins',
  'Admin - Notifications'
)

