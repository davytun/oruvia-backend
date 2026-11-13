export const adminReviewPaths = {
  '/api/v1/admins/reviews': {
    get: {
      tags: ['Admin - Reviews'],
      summary: 'List all platform reviews (including hidden)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['published', 'hidden'] },
        },
        {
          name: 'target_type',
          in: 'query',
          schema: { type: 'string', enum: ['listing', 'lister'] },
        },
        {
          name: 'rating',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 5 },
        },
        {
          name: 'is_verified_inspection',
          in: 'query',
          schema: { type: 'string', enum: ['true', 'false'] },
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
        '200': { description: 'Paginated platform reviews' },
      },
    },
  },
  '/api/v1/admins/reviews/{id}/moderate': {
    patch: {
      tags: ['Admin - Reviews'],
      summary: 'Hide or restore a review and recompute target rating aggregates',
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
              required: ['action'],
              properties: {
                action: { type: 'string', enum: ['hide', 'restore'] },
                reason: { type: 'string', minLength: 3, maxLength: 500 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Review moderated' },
        '404': { description: 'Review not found' },
      },
    },
  },
  '/api/v1/admins/reviews/{id}': {
    delete: {
      tags: ['Admin - Reviews'],
      summary: 'Permanently delete a review and recompute target rating',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Review deleted permanently' },
        '404': { description: 'Review not found' },
      },
    },
  },
}

