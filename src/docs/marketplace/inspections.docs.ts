/**
 * OpenAPI 3.1 documentation for Inspection Bookings & Scheduling (Public, Seeker, Agent & Landlord)
 */
export const inspectionPaths = {
  // Public slots
  '/api/v1/listings/{idOrSlug}/inspection-slots': {
    get: {
      tags: ['Inspections - Public Slots'],
      summary: 'Get available inspection slots for a listing',
      description:
        'Calculates real-time bookable inspection slots based on the lister weekly windows, blocked dates, minimum notice hours, and existing confirmed bookings. Slot times are presented in both WAT (West Africa Time, UTC+1) and UTC ISO-8601.',
      parameters: [
        {
          name: 'idOrSlug',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: 'executive-room-and-parlour-self-contain-ibara-01',
        },
        {
          name: 'from',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Start date filter (defaults to tomorrow or +2h)',
        },
        {
          name: 'to',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'End date filter (defaults to +7 days, max 14 days)',
        },
      ],
      responses: {
        '200': {
          description: 'Available inspection slots calculated successfully',
        },
        '400': { description: 'Listing unavailable or invalid date range' },
        '404': { description: 'Listing not found' },
      },
    },
  },

  // Seeker bookings
  '/api/v1/seekers/inspections': {
    post: {
      tags: ['Inspections - Seekers'],
      summary: 'Request a property inspection',
      description:
        'Logged-in property seeker with a verified email requests a physical or virtual inspection for an approved property.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['listing_id', 'mode', 'scheduled_at'],
              properties: {
                listing_id: { type: 'string', format: 'uuid' },
                mode: { type: 'string', enum: ['physical', 'virtual'], example: 'physical' },
                virtual_method: {
                  type: 'string',
                  enum: ['live_video_call', 'recorded_walkthrough'],
                  example: 'live_video_call',
                },
                scheduled_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-11-16T09:30:00.000Z',
                },
                note: {
                  type: 'string',
                  example: 'I would like to inspect the property in the morning.',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Inspection requested successfully' },
        '400': { description: 'Validation failed or slot unavailable' },
        '403': { description: 'Email verification required or account suspended' },
        '404': { description: 'Listing not found' },
      },
    },
    get: {
      tags: ['Inspections - Seekers'],
      summary: 'List my inspection bookings',
      description: 'Retrieve paginated inspection bookings requested by the logged-in seeker.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'listing_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Seeker bookings retrieved successfully' },
      },
    },
  },

  '/api/v1/seekers/inspections/{id}': {
    get: {
      tags: ['Inspections - Seekers'],
      summary: 'Get inspection booking details & timeline',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': { description: 'Booking details with audit timeline' },
        '404': { description: 'Booking not found' },
      },
    },
  },

  '/api/v1/seekers/inspections/{id}/reschedule': {
    post: {
      tags: ['Inspections - Seekers'],
      summary: 'Propose a reschedule time to the lister',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['proposed_at'],
              properties: {
                proposed_at: { type: 'string', format: 'date-time' },
                reason: { type: 'string', example: 'Rescheduling due to work conflict.' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Reschedule proposed successfully' },
        '400': { description: 'Invalid time or booking status' },
      },
    },
  },

  '/api/v1/seekers/inspections/{id}/reschedule/accept': {
    post: {
      tags: ['Inspections - Seekers'],
      summary: 'Accept lister reschedule proposal',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': { description: 'Reschedule accepted; booking confirmed' },
      },
    },
  },

  '/api/v1/seekers/inspections/{id}/reschedule/reject': {
    post: {
      tags: ['Inspections - Seekers'],
      summary: 'Reject lister reschedule proposal',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { reason: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Reschedule rejected; previous status restored' },
      },
    },
  },

  '/api/v1/seekers/inspections/{id}/cancel': {
    post: {
      tags: ['Inspections - Seekers'],
      summary: 'Cancel an inspection booking',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { reason: { type: 'string', example: 'Found another apartment.' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Booking cancelled successfully' },
      },
    },
  },
}
