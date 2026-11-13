/**
 * OpenAPI 3.1 documentation for Seeker Favorites & Saved Properties
 */
export const favoritePaths = {
  '/api/v1/seekers/favorites': {
    get: {
      tags: ['Favorites'],
      summary: 'List saved / favorite properties',
      description:
        'Retrieve paginated property listings saved by the logged-in Seeker (newest first). Saved properties remain visible even if their availability changes to `rented`, `sold`, or `unavailable` so you know when a shortlisted home is taken.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'availability_status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['available', 'rented', 'sold', 'unavailable'],
          },
          description: 'Optional filter by current availability status',
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
          description: 'Saved properties retrieved successfully',
        },
        '401': { description: 'Missing or invalid Seeker Bearer token' },
      },
    },
    post: {
      tags: ['Favorites'],
      summary: 'Save a property listing to favorites',
      description:
        'Idempotently bookmark an approved property listing to the Seeker’s saved list.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['listing_id'],
              properties: {
                listing_id: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Property saved to favorites',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/FavoriteActionResponse' },
                },
              },
            },
          },
        },
        '401': { description: 'Missing or invalid Seeker Bearer token' },
        '404': { description: 'Property listing not found or not available' },
      },
    },
  },

  '/api/v1/seekers/favorites/toggle': {
    post: {
      tags: ['Favorites'],
      summary: 'Toggle save/unsave for a property listing',
      description:
        'Saves the listing if not yet saved, or removes it from favorites if already saved.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['listing_id'],
              properties: {
                listing_id: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Favorite status toggled successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/FavoriteActionResponse' },
                },
              },
            },
          },
        },
        '401': { description: 'Missing or invalid Seeker Bearer token' },
        '404': { description: 'Property listing not found or not available' },
      },
    },
  },

  '/api/v1/seekers/favorites/{listingId}': {
    delete: {
      tags: ['Favorites'],
      summary: 'Remove a property listing from favorites',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'listingId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': { description: 'Property removed from favorites' },
        '401': { description: 'Missing or invalid Seeker Bearer token' },
        '404': { description: 'Property listing is not in your favorites' },
      },
    },
  },
}
