/**
 * Admin Locations & Nigerian Property Types OpenAPI Paths
 */
export const adminCatalogPaths = {
  '/api/v1/admins/locations/states': {
    get: {
      tags: ['Admin Locations & House Types'],
      summary: 'List all States (including inactive)',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'List of all states' },
      },
    },
    post: {
      tags: ['Admin Locations & House Types'],
      summary: 'Add a new State for geographic expansion',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', example: 'Lagos' },
                slug: { type: 'string', example: 'lagos' },
                is_active: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'State added' },
      },
    },
  },
  '/api/v1/admins/locations/states/{id}': {
    patch: {
      tags: ['Admin Locations & House Types'],
      summary: 'Update or activate/deactivate a State',
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
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                is_active: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'State updated' },
      },
    },
  },
  '/api/v1/admins/locations/cities': {
    get: {
      tags: ['Admin Locations & House Types'],
      summary: 'List all Cities (optionally filtered by state_id)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'state_id',
          in: 'query',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': { description: 'List of cities' },
      },
    },
    post: {
      tags: ['Admin Locations & House Types'],
      summary: 'Add a new City under a State',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['state_id', 'name'],
              properties: {
                state_id: {
                  type: 'string',
                  example: '00000000-0000-4000-e000-000000000001',
                },
                name: { type: 'string', example: 'Mowe' },
                slug: { type: 'string', example: 'mowe' },
                is_active: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'City added' },
      },
    },
  },
  '/api/v1/admins/locations/cities/{id}': {
    patch: {
      tags: ['Admin Locations & House Types'],
      summary: 'Update or activate/deactivate a City',
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
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
                is_active: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'City updated' },
      },
    },
  },
  '/api/v1/admins/property-types': {
    get: {
      tags: ['Admin Locations & House Types'],
      summary: 'List all Nigerian Property Types (including inactive)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'category',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['residential', 'commercial', 'land'],
          },
        },
      ],
      responses: {
        '200': { description: 'List of property types' },
      },
    },
    post: {
      tags: ['Admin Locations & House Types'],
      summary: 'Add a new Nigerian Property Type to the catalog',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['slug', 'name', 'category'],
              properties: {
                slug: { type: 'string', example: 'five_bedroom_duplex' },
                name: { type: 'string', example: '5-Bedroom Fully Detached Duplex' },
                category: {
                  type: 'string',
                  enum: ['residential', 'commercial', 'land'],
                  example: 'residential',
                },
                description: { type: 'string' },
                default_bedrooms: { type: 'number', example: 5 },
                display_order: { type: 'number', example: 12 },
                is_active: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Property type created' },
      },
    },
  },
  '/api/v1/admins/property-types/{id}': {
    patch: {
      tags: ['Admin Locations & House Types'],
      summary: 'Update or activate/deactivate a Property Type',
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
              properties: {
                name: { type: 'string' },
                category: {
                  type: 'string',
                  enum: ['residential', 'commercial', 'land'],
                },
                description: { type: 'string' },
                default_bedrooms: { type: 'number' },
                display_order: { type: 'number' },
                is_active: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Property type updated' },
      },
    },
  },
}

