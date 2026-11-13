/**
 * OpenAPI 3.1 documentation for Admin Read-Only Inquiry Oversight
 */
export const adminInquiryPaths = {
  '/api/v1/admins/inquiries': {
    get: {
      tags: ['Admin - Inquiry Oversight'],
      summary: 'List platform-wide property inquiries (read-only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['open', 'responded', 'closed'] },
        },
        { name: 'listing_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        {
          name: 'lister_role',
          in: 'query',
          schema: { type: 'string', enum: ['agent', 'landlord'] },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Platform-wide inquiries retrieved' },
      },
    },
  },

  '/api/v1/admins/inquiries/{id}': {
    get: {
      tags: ['Admin - Inquiry Oversight'],
      summary: 'View full inquiry conversation & messages (read-only)',
      description:
        'Returns full conversation details and message history for moderation oversight without altering participant read receipts.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': { description: 'Inquiry conversation retrieved' },
        '404': { description: 'Inquiry conversation not found' },
      },
    },
  },
}

