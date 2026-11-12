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

/**
 * Reusable OpenAPI path factory for Lister (Agent & Landlord) Inspection Scheduling & Booking Management
 */
export function buildListerInspectionPaths(
  role: 'agents' | 'landlords',
  tag: string
) {
  const prefix = `/api/v1/${role}`
  const singularRole = role === 'agents' ? 'Agent' : 'Landlord'

  return {
    [`${prefix}/inspection-settings`]: {
      get: {
        tags: [tag],
        summary: `Get inspection scheduling settings (${singularRole})`,
        description: `Returns slot durations, notice period, buffer times, max bookings per slot, and auto-confirmation settings.`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Inspection settings retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/InspectionSettings' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: [tag],
        summary: `Update inspection scheduling settings (${singularRole})`,
        description: `Configure minimum notice hours, max advance days, slot duration, buffer times, and max bookings per slot.`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  slot_duration_minutes: { type: 'integer', example: 30 },
                  buffer_minutes: { type: 'integer', example: 15 },
                  min_notice_hours: { type: 'integer', example: 2 },
                  max_advance_days: { type: 'integer', example: 14 },
                  max_bookings_per_slot: { type: 'integer', example: 1 },
                  auto_confirm: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inspection settings updated successfully' },
        },
      },
    },

    [`${prefix}/inspection-availability`]: {
      get: {
        tags: [tag],
        summary: `Get weekly recurring availability windows (${singularRole})`,
        description: `Returns recurring time slots for each day of the week (WAT UTC+1, e.g. Mon-Fri 09:00 - 17:00).`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Weekly availability windows retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ListerAvailabilityWindow' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: [tag],
        summary: `Set weekly recurring availability windows in bulk (${singularRole})`,
        description: `Replaces all weekly windows with new day-of-week slots (WAT 24-hr format, e.g. "09:00" to "17:00").`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['windows'],
                properties: {
                  windows: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['day_of_week', 'start_time', 'end_time'],
                      properties: {
                        day_of_week: { type: 'integer', minimum: 0, maximum: 6, example: 1 },
                        start_time: { type: 'string', example: '09:00' },
                        end_time: { type: 'string', example: '17:00' },
                        is_active: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Weekly availability windows saved successfully' },
        },
      },
    },

    [`${prefix}/inspection-blocked-dates`]: {
      get: {
        tags: [tag],
        summary: `Get blocked blackout dates (${singularRole})`,
        description: `Returns specific calendar dates blocked by the ${singularRole} (holidays, personal days).`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Blocked dates list retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ListerBlockedDate' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: [tag],
        summary: `Add a blocked blackout date (${singularRole})`,
        description: `Blocks out a specific calendar day in YYYY-MM-DD format with an optional reason.`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['date'],
                properties: {
                  date: { type: 'string', example: '2026-12-25' },
                  reason: { type: 'string', example: 'Christmas Day Public Holiday' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Blocked date added successfully' },
        },
      },
    },

    [`${prefix}/inspection-blocked-dates/{id}`]: {
      delete: {
        tags: [tag],
        summary: `Remove a blocked blackout date (${singularRole})`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Blocked date removed successfully' },
        },
      },
    },

    [`${prefix}/listings/{id}/inspection-options`]: {
      patch: {
        tags: [tag],
        summary: `Update listing inspection fee & allowed modes (${singularRole})`,
        description: `Set offline inspection fee in NGN and toggle physical/virtual inspection availability without resetting the listing to pending_review.`,
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
                properties: {
                  inspection_fee: { type: 'integer', minimum: 0, example: 5000 },
                  allows_physical_inspection: { type: 'boolean', example: true },
                  allows_virtual_inspection: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Listing inspection options updated successfully' },
        },
      },
    },

    [`${prefix}/inspections`]: {
      get: {
        tags: [tag],
        summary: `List inspection bookings for ${singularRole}`,
        description: `Retrieve paginated inspection bookings received across own listings, with status and listing filters.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'listing_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Paginated bookings retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/InspectionBooking' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        per_page: { type: 'integer' },
                        total: { type: 'integer' },
                        total_pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    [`${prefix}/inspections/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get inspection booking details & timeline (${singularRole})`,
        description: `Returns complete booking details including property snapshot, seeker contact details, and audit event timeline.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Booking details and timeline retrieved' },
          '404': { description: 'Booking not found' },
        },
      },
    },

    [`${prefix}/inspections/{id}/confirm`]: {
      post: {
        tags: [tag],
        summary: `Confirm pending inspection booking (${singularRole})`,
        description: `Confirms a requested inspection booking. Sends confirmation email with meeting details and WhatsApp coordination link to the seeker.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  note: { type: 'string', example: 'Looking forward to showing you the property at Ibara Estate.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inspection confirmed successfully' },
        },
      },
    },

    [`${prefix}/inspections/{id}/decline`]: {
      post: {
        tags: [tag],
        summary: `Decline pending inspection booking (${singularRole})`,
        description: `Declines a requested inspection booking with a mandatory reason.`,
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
                required: ['reason'],
                properties: {
                  reason: { type: 'string', example: 'The property is undergoing minor paint repairs this weekend.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inspection booking declined' },
        },
      },
    },

    [`${prefix}/inspections/{id}/reschedule`]: {
      post: {
        tags: [tag],
        summary: `Propose reschedule time to seeker (${singularRole})`,
        description: `Proposes an alternate date/time in ISO-8601 UTC. Booking status changes to reschedule_requested.`,
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
                required: ['proposed_at'],
                properties: {
                  proposed_at: { type: 'string', format: 'date-time', example: '2026-11-18T10:00:00.000Z' },
                  reason: { type: 'string', example: 'I will be at the court registry on Wednesday morning.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reschedule proposed successfully' },
        },
      },
    },

    [`${prefix}/inspections/{id}/reschedule/accept`]: {
      post: {
        tags: [tag],
        summary: `Accept seeker reschedule proposal (${singularRole})`,
        description: `Accepts the seeker proposed date/time. The booking scheduled time is updated and status returns to confirmed.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Reschedule proposal accepted; booking confirmed' },
        },
      },
    },

    [`${prefix}/inspections/{id}/reschedule/reject`]: {
      post: {
        tags: [tag],
        summary: `Reject seeker reschedule proposal (${singularRole})`,
        description: `Rejects the seeker proposed reschedule time, reverting booking status to its prior state.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Proposed time conflicts with another scheduled inspection.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reschedule rejected; previous status restored' },
        },
      },
    },

    [`${prefix}/inspections/{id}/cancel`]: {
      post: {
        tags: [tag],
        summary: `Cancel inspection booking (${singularRole})`,
        description: `Cancels a confirmed or pending inspection booking with a reason.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Property has been leased to an earlier applicant.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Booking cancelled successfully' },
        },
      },
    },

    [`${prefix}/inspections/{id}/virtual-details`]: {
      patch: {
        tags: [tag],
        summary: `Update virtual inspection meeting link or video (${singularRole})`,
        description: `Set live video meeting link (Google Meet / Zoom / WhatsApp video) or pre-recorded walkthrough video URL for virtual inspections.`,
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
                properties: {
                  virtual_method: { type: 'string', enum: ['live_video_call', 'recorded_walkthrough'] },
                  meeting_link: { type: 'string', example: 'https://meet.google.com/abc-defg-hij' },
                  recorded_video_url: { type: 'string', example: 'https://youtube.com/watch?v=walkthrough-demo' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Virtual inspection details updated' },
        },
      },
    },

    [`${prefix}/inspections/{id}/complete`]: {
      post: {
        tags: [tag],
        summary: `Mark inspection completed (${singularRole})`,
        description: `Marks a confirmed inspection as completed after the physical tour or virtual call.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Inspection marked completed successfully' },
        },
      },
    },

    [`${prefix}/inspections/{id}/no-show`]: {
      post: {
        tags: [tag],
        summary: `Mark seeker as no-show (${singularRole})`,
        description: `Marks an inspection where the seeker did not attend the scheduled appointment.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Inspection marked as no-show' },
        },
      },
    },

    [`${prefix}/inspections/{id}/fee`]: {
      patch: {
        tags: [tag],
        summary: `Update offline inspection fee payment status (${singularRole})`,
        description: `Record offline payment status for inspection fee: paid (collected at venue/bank transfer), waived, or unpaid.`,
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
                required: ['fee_status'],
                properties: {
                  fee_status: {
                    type: 'string',
                    enum: ['paid', 'waived', 'unpaid'],
                    example: 'paid',
                  },
                  note: { type: 'string', example: 'Paid via OPay transfer at inspection site.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inspection fee status updated successfully' },
        },
      },
    },
  }
}

export const agentInspectionPaths = buildListerInspectionPaths('agents', 'Inspections - Agents')
export const landlordInspectionPaths = buildListerInspectionPaths('landlords', 'Inspections - Landlords')
