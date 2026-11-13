/**
 * OpenAPI 3.1 documentation for Inquiries, Messaging & Real-Time WebSockets
 */
export const seekerInquiryPaths = {
  '/api/v1/seekers/inquiries': {
    post: {
      tags: ['Inquiries - Seekers'],
      summary: 'Start or continue a property inquiry',
      description:
        'Logged-in Seeker with a verified email starts an inquiry conversation for an approved available property (or appends to the existing conversation thread for that property, auto-reopening if closed). Broadcasts real-time `new_message` over WebSockets and sends an email notification to the lister.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['listing_id', 'message'],
              properties: {
                listing_id: { type: 'string', format: 'uuid' },
                subject: {
                  type: 'string',
                  example: 'Availability & Payment Terms',
                },
                message: {
                  type: 'string',
                  example:
                    'Good afternoon! Is this mini-flat still available and is borehole water steady?',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Inquiry created and message sent' },
        '200': { description: 'Follow-up message appended to existing inquiry' },
        '403': { description: 'Email verification required' },
        '404': { description: 'Listing not found or not approved' },
      },
    },
    get: {
      tags: ['Inquiries - Seekers'],
      summary: 'List my inquiry conversations',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['open', 'responded', 'closed'] },
        },
        { name: 'listing_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'unread_only', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Seeker inquiry conversations retrieved' },
      },
    },
  },

  '/api/v1/seekers/inquiries/unread-count': {
    get: {
      tags: ['Inquiries - Seekers'],
      summary: 'Get total unread messages count for Seeker',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Total unread count returned' },
      },
    },
  },

  '/api/v1/seekers/inquiries/{id}': {
    get: {
      tags: ['Inquiries - Seekers'],
      summary: 'Get inquiry conversation & messages (auto-marks read)',
      description:
        'Returns full conversation details, WhatsApp fallback link, WebSocket path, and messages. Automatically marks unread lister messages as read and broadcasts `messages_read` over WebSocket. Pass `?after=<iso>` for incremental sync after WebSocket reconnect.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'after', in: 'query', schema: { type: 'string', format: 'date-time' } },
      ],
      responses: {
        '200': { description: 'Conversation and messages retrieved' },
        '404': { description: 'Inquiry conversation not found' },
      },
    },
  },

  '/api/v1/seekers/inquiries/{id}/messages': {
    post: {
      tags: ['Inquiries - Seekers'],
      summary: 'Send a follow-up message in an inquiry',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['message'],
              properties: {
                message: {
                  type: 'string',
                  example: 'Thank you! Can we schedule an inspection for Friday morning?',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Message sent and pushed via WebSocket' },
      },
    },
  },

  '/api/v1/seekers/inquiries/{id}/close': {
    post: {
      tags: ['Inquiries - Seekers'],
      summary: 'Close an inquiry conversation',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': { description: 'Inquiry closed' },
      },
    },
  },

  '/api/v1/inquiries/{id}/ws': {
    get: {
      tags: ['Inquiries - Real-Time WebSocket'],
      summary: 'Connect to real-time WebSocket room for an inquiry',
      description:
        'Upgrades HTTP connection to a Cloudflare Durable Object WebSocket room (`InquiryRoom`) for instant `new_message`, `typing`, `messages_read`, `presence`, and `inquiry_closed` events. Pass JWT via `?token=<jwt>` query param (for browser `new WebSocket()`) or `Authorization: Bearer <jwt>` header.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'token', in: 'query', schema: { type: 'string' }, description: 'JWT Access Token' },
      ],
      responses: {
        '101': { description: 'Switching Protocols (WebSocket connected)' },
        '401': { description: 'Missing or invalid token' },
        '403': { description: 'Not a participant in this inquiry' },
        '426': { description: 'Upgrade: websocket header required' },
      },
    },
  },
}

export function buildListerInquiryPaths(
  role: 'agents' | 'landlords',
  tag: string
) {
  const prefix = `/api/v1/${role}`
  const singularRole = role === 'agents' ? 'Agent' : 'Landlord'

  return {
    [`${prefix}/inquiries`]: {
      get: {
        tags: [tag],
        summary: `List incoming property inquiries (${singularRole})`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['open', 'responded', 'closed'] },
          },
          { name: 'listing_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'unread_only', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Incoming inquiry conversations retrieved' },
        },
      },
    },

    [`${prefix}/inquiries/unread-count`]: {
      get: {
        tags: [tag],
        summary: `Get total unread messages count (${singularRole})`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Total unread count returned' },
        },
      },
    },

    [`${prefix}/inquiries/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get inquiry conversation & messages (${singularRole})`,
        description:
          'Returns full conversation, seeker contact, WhatsApp fallback link, WebSocket path, and messages. Marks unread seeker messages as read and broadcasts `messages_read` over WebSocket.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'after', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': { description: 'Conversation and messages retrieved' },
          '404': { description: 'Inquiry conversation not found' },
        },
      },
    },

    [`${prefix}/inquiries/{id}/messages`]: {
      post: {
        tags: [tag],
        summary: `Reply to a Seeker inquiry (${singularRole})`,
        description:
          'Sends a reply, automatically transitions inquiry status from `open` to `responded`, pushes `new_message` over WebSocket, and sends an email notification to the Seeker.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: {
                    type: 'string',
                    example:
                      'Yes, the apartment is still available! Borehole water and prepaid meter are both active.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Reply sent and pushed via WebSocket' },
        },
      },
    },

    [`${prefix}/inquiries/{id}/close`]: {
      post: {
        tags: [tag],
        summary: `Close an inquiry conversation (${singularRole})`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Inquiry closed' },
        },
      },
    },
  }
}

export const agentInquiryPaths = buildListerInquiryPaths(
  'agents',
  'Inquiries - Agents'
)
export const landlordInquiryPaths = buildListerInquiryPaths(
  'landlords',
  'Inquiries - Landlords'
)

