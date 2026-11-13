function buildReporterPaths(
  role: 'seekers' | 'agents' | 'landlords',
  tag: string
) {
  return {
    [`/api/v1/${role}/reports`]: {
      get: {
        tags: [tag],
        summary: 'List reports submitted by the authenticated user',
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
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          {
            name: 'per_page',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          '200': { description: 'Paginated list of submitted reports' },
        },
      },
      post: {
        tags: [tag],
        summary: 'Report a suspicious property listing or user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['target_type', 'reason'],
                properties: {
                  target_type: { type: 'string', enum: ['listing', 'user'] },
                  listing_id: { type: 'string' },
                  target_user_role: {
                    type: 'string',
                    enum: ['seeker', 'agent', 'landlord'],
                  },
                  target_user_id: { type: 'string' },
                  reason: {
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
                  description: { type: 'string', minLength: 5, maxLength: 1500 },
                  evidence_urls: {
                    type: 'array',
                    maxItems: 5,
                    items: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Report submitted' },
          '403': { description: 'Cannot report own listing or account' },
          '409': { description: 'Open report already exists for this target' },
        },
      },
    },
  }
}

export const seekerReportPaths = buildReporterPaths(
  'seekers',
  'Reports - Seekers'
)
export const agentReportPaths = buildReporterPaths(
  'agents',
  'Reports - Agents'
)
export const landlordReportPaths = buildReporterPaths(
  'landlords',
  'Reports - Landlords'
)

