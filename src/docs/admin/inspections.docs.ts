/**
 * OpenAPI 3.1 documentation for Admin Inspection Booking Moderation & Management
 */
export const adminInspectionPaths = {
  '/api/v1/admins/inspections': {
    get: {
      tags: ['Admin - Inspection Moderation'],
      summary: 'List all inspection bookings platform-wide',
      description: 'Filter and inspect inspection bookings across all Seekers, Agents, and Landlords.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'lister_role', in: 'query', schema: { type: 'string', enum: ['agent', 'landlord'] } },
        { name: 'listing_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'seeker_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Paginated platform inspection bookings' },
      },
    },
  },

  '/api/v1/admins/inspections/{id}': {
    get: {
      tags: ['Admin - Inspection Moderation'],
      summary: 'Get complete inspection details & audit timeline',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': { description: 'Detailed booking with both parties, property, and audit timeline' },
        '404': { description: 'Inspection booking not found' },
      },
    },
  },

  '/api/v1/admins/inspections/{id}/cancel': {
    post: {
      tags: ['Admin - Inspection Moderation'],
      summary: 'Admin cancel an inspection booking',
      description: 'Cancels the booking, notifies both parties with the admin reason, and logs the action.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string', example: 'Dispute resolved; property unavailable.' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Inspection cancelled by administrator' },
      },
    },
  },

  '/api/v1/admins/inspections/{id}/reschedule': {
    post: {
      tags: ['Admin - Inspection Moderation'],
      summary: 'Admin directly reschedule an inspection',
      description: 'Directly changes the scheduled date & time without requiring proposal acceptance. Notifies both parties.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['scheduled_at', 'reason'],
              properties: {
                scheduled_at: { type: 'string', format: 'date-time' },
                reason: { type: 'string', example: 'Parties agreed to reschedule via support desk.' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Inspection rescheduled by administrator' },
      },
    },
  },

  '/api/v1/admins/inspections/{id}/status': {
    patch: {
      tags: ['Admin - Inspection Moderation'],
      summary: 'Admin status override',
      description: 'Force override booking status for manual dispute resolution.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status', 'reason'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show', 'expired'],
                },
                reason: { type: 'string', example: 'Verified offline physical inspection completed.' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Inspection status overridden by administrator' },
      },
    },
  },

  '/api/v1/admins/inspections/{id}/fee': {
    patch: {
      tags: ['Admin - Inspection Moderation'],
      summary: 'Admin fee status override',
      description: 'Force override offline inspection fee status (e.g. mark paid or waived).',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fee_status', 'reason'],
              properties: {
                fee_status: { type: 'string', enum: ['not_required', 'unpaid', 'paid', 'waived'] },
                reason: { type: 'string', example: 'Offline cash payment receipt verified.' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Inspection fee status overridden by administrator' },
      },
    },
  },
}
