/**
 * Public Locations & Property Types OpenAPI Paths
 */
export const publicCatalogPaths = {
  '/api/v1/locations': {
    get: {
      tags: ['Catalog & Discovery'],
      summary: 'List active States and their active Cities for location discovery',
      description:
        'Returns all active States with nested active Cities (e.g. Ogun State with Abeokuta and Sagamu). Used for location dropdowns and filters.',
      responses: {
        '200': {
          description: 'List of active States with their Cities',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/StateWithCities' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/property-types': {
    get: {
      tags: ['Catalog & Discovery'],
      summary: 'List active Nigerian Property Types',
      description:
        'Returns the authentic Nigerian housing catalog (Self-Contain, Mini Flat, 2-Bedroom Flat, Duplex, Bungalow, etc.), optionally filtered by category (`residential`, `commercial`, `land`).',
      parameters: [
        {
          name: 'category',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['residential', 'commercial', 'land'],
          },
          description: 'Filter by property category',
        },
      ],
      responses: {
        '200': {
          description: 'List of active Nigerian property types',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PropertyType' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
