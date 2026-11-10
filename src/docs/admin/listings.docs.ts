/**
 * Admin Property Listing Moderation OpenAPI Paths
 */
export const adminListingPaths = {
  '/api/v1/admins/listings': {
    get: {
      tags: ['Admin Listing Moderation'],
      summary: 'List all Property Listings for review and moderation',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'moderation_status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending_review', 'approved', 'rejected', 'suspended'],
          },
          description: 'Filter by moderation status (e.g. `pending_review`)',
        },
        {
          name: 'availability_status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['available', 'rented', 'sold', 'unavailable'],
          },
        },
        {
          name: 'city_id',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'lister_role',
          in: 'query',
          schema: { type: 'string', enum: ['agent', 'landlord'] },
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
        '200': {
          description: 'Paginated list of property listings with full lister details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PropertyListing' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/admins/listings/{id}': {
    get: {
      tags: ['Admin Listing Moderation'],
      summary: 'Inspect a single Property Listing with lister & KYC verification badge info',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Listing ID',
        },
      ],
      responses: {
        '200': {
          description: 'Listing details for moderation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/PropertyListing' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/admins/listings/{id}/review': {
    patch: {
      tags: ['Admin Listing Moderation'],
      summary: 'Approve, reject, or suspend a Property Listing',
      description:
        'Approving a listing makes it visible on public marketplace search and records `published_at`. Rejecting or suspending requires a `rejection_reason` and immediately removes it from public search. Lister receives an automated notification email.',
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
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['approved', 'rejected', 'suspended'],
                  example: 'approved',
                },
                rejection_reason: {
                  type: 'string',
                  example: 'The uploaded photos appear misleading or unclear.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Listing moderation status updated',
        },
      },
    },
  },
}

