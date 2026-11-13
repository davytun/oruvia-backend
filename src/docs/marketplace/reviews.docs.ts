export const publicReviewPaths = {
  '/api/v1/listings/{id}/reviews': {
    get: {
      tags: ['Reviews - Public'],
      summary: 'Get published reviews and rating summary for a property listing',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        {
          name: 'rating',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 5 },
        },
        {
          name: 'verified_only',
          in: 'query',
          schema: { type: 'string', enum: ['true', 'false'] },
        },
        {
          name: 'sort',
          in: 'query',
          schema: { type: 'string', enum: ['newest', 'highest', 'lowest'] },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        {
          name: 'per_page',
          in: 'query',
          schema: { type: 'integer', default: 20 },
        },
      ],
      responses: {
        '200': { description: 'Listing reviews and rating breakdown' },
        '404': { description: 'Listing not found' },
      },
    },
  },
  '/api/v1/listers/{listerType}/{listerId}/reviews': {
    get: {
      tags: ['Reviews - Public'],
      summary:
        'Get published reviews and rating summary for an Agent or Landlord',
      parameters: [
        {
          name: 'listerType',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['agent', 'landlord'] },
        },
        {
          name: 'listerId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        {
          name: 'rating',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 5 },
        },
        {
          name: 'verified_only',
          in: 'query',
          schema: { type: 'string', enum: ['true', 'false'] },
        },
        {
          name: 'sort',
          in: 'query',
          schema: { type: 'string', enum: ['newest', 'highest', 'lowest'] },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        {
          name: 'per_page',
          in: 'query',
          schema: { type: 'integer', default: 20 },
        },
      ],
      responses: {
        '200': { description: 'Lister reviews and rating breakdown' },
        '404': { description: 'Lister not found' },
      },
    },
  },
}

export const seekerReviewPaths = {
  '/api/v1/seekers/reviews': {
    get: {
      tags: ['Reviews - Seekers'],
      summary: 'List reviews submitted by the authenticated Seeker',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        {
          name: 'per_page',
          in: 'query',
          schema: { type: 'integer', default: 20 },
        },
      ],
      responses: {
        '200': { description: 'Paginated list of Seeker reviews' },
      },
    },
    post: {
      tags: ['Reviews - Seekers'],
      summary:
        'Submit a review for a property listing or lister (requires prior inquiry or inspection)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['target_type', 'rating'],
              properties: {
                target_type: { type: 'string', enum: ['listing', 'lister'] },
                listing_id: { type: 'string' },
                lister_type: { type: 'string', enum: ['agent', 'landlord'] },
                lister_id: { type: 'string' },
                rating: { type: 'integer', minimum: 1, maximum: 5 },
                comment: { type: 'string', maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Review created' },
        '403': { description: 'Seeker has no prior inquiry/inspection' },
        '409': { description: 'Seeker already reviewed this target' },
      },
    },
  },
  '/api/v1/seekers/reviews/{id}': {
    patch: {
      tags: ['Reviews - Seekers'],
      summary: 'Update own review',
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
              properties: {
                rating: { type: 'integer', minimum: 1, maximum: 5 },
                comment: { type: 'string', nullable: true, maxLength: 1000 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Review updated' },
        '403': { description: 'Not review owner' },
        '404': { description: 'Review not found' },
      },
    },
    delete: {
      tags: ['Reviews - Seekers'],
      summary: 'Delete own review',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Review deleted' },
        '403': { description: 'Not review owner' },
        '404': { description: 'Review not found' },
      },
    },
  },
}

function buildListerReviewPaths(role: 'agents' | 'landlords', tag: string) {
  return {
    [`/api/v1/${role}/reviews`]: {
      get: {
        tags: [tag],
        summary: `List published reviews on this ${role === 'agents' ? 'Agent' : 'Landlord'}'s profile and listings`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'target_type',
            in: 'query',
            schema: { type: 'string', enum: ['listing', 'lister'] },
          },
          {
            name: 'has_reply',
            in: 'query',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'per_page',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          '200': { description: 'Paginated list of reviews' },
        },
      },
    },
    [`/api/v1/${role}/reviews/{id}/reply`]: {
      post: {
        tags: [tag],
        summary: 'Post or update a reply on a review',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reply_text'],
                properties: {
                  reply_text: { type: 'string', minLength: 1, maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reply saved' },
          '403': { description: 'Not target owner' },
          '404': { description: 'Review not found' },
        },
      },
      delete: {
        tags: [tag],
        summary: 'Delete own reply from a review',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Reply deleted' },
          '403': { description: 'Not target owner' },
          '404': { description: 'Review not found' },
        },
      },
    },
  }
}

export const agentReviewPaths = buildListerReviewPaths(
  'agents',
  'Reviews - Agents'
)
export const landlordReviewPaths = buildListerReviewPaths(
  'landlords',
  'Reviews - Landlords'
)

