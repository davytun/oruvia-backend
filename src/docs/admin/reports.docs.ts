export const adminReportPaths = {
  '/api/v1/admins/reports': {
    get: {
      tags: ['Admin - Reports & Moderation'],
      summary: 'List all listing and user reports platform-wide',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'under_review', 'resolved', 'dismissed'],
          },
        },
        {
          name: 'target_type',
          in: 'query',
          schema: { type: 'string', enum: ['listing', 'user'] },
        },
        {
          name: 'reason',
          in: 'query',
          schema: {
            type: 'string',
            enum: [
              'scam_or_fraud',
              'misleading_info',
              'already_rented_or_sold',
              'duplicate_listing',
              'inappropriate_content',
              'harassment',
              'impersonation',
              'other',
            ],
          },
        },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        {
          name: 'per_page',
          in: 'query',
          schema: { type: 'integer', default: 20 },
        },
      ],
      responses: {
        '200': { description: 'Paginated list of reports' },
      },
    },
  },
  '/api/v1/admins/reports/{id}': {
    get: {
      tags: ['Admin - Reports & Moderation'],
      summary: 'Get full report details including reporter and target info',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Report details' },
        '404': { description: 'Report not found' },
      },
    },
  },
  '/api/v1/admins/reports/{id}/review': {
    patch: {
      tags: ['Admin - Reports & Moderation'],
      summary:
        'Review a report, update status, and optionally execute fraud/moderation enforcement',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['under_review', 'resolved', 'dismissed'],
                },
                action: {
                  type: 'string',
                  enum: [
                    'none',
                    'suspend_listing',
                    'suspend_user',
                    'suspend_user_and_listings',
                  ],
                },
                admin_notes: { type: 'string', minLength: 3, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Report reviewed and enforcement applied' },
        '404': { description: 'Report not found' },
      },
    },
  },
}

