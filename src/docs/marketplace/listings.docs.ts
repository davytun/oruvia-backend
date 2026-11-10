/**
 * Public Search & Agent / Landlord Listing Management OpenAPI Paths
 */
export const publicListingPaths = {
  '/api/v1/listings': {
    get: {
      tags: ['Listings Discovery'],
      summary: 'Search & filter approved available property listings',
      description:
        'Discovers properties across active cities in Nigeria with Nigerian pricing breakdown (base rent, agency fee, legal agreement, caution fee, service charge, and total initial package). Only approved, available listings are returned.',
      parameters: [
        {
          name: 'city_slug',
          in: 'query',
          schema: { type: 'string', example: 'abeokuta' },
          description: 'Filter by city slug (e.g. `abeokuta`, `sagamu`)',
        },
        {
          name: 'property_type_slug',
          in: 'query',
          schema: { type: 'string', example: 'room_and_parlour_self_contain' },
          description: 'Filter by property type slug',
        },
        {
          name: 'classification',
          in: 'query',
          schema: { type: 'string', enum: ['rent', 'sale'] },
          description: 'Filter by classification (`rent` or `sale`)',
        },
        {
          name: 'category',
          in: 'query',
          schema: { type: 'string', enum: ['residential', 'commercial', 'land'] },
          description: 'Filter by property category',
        },
        {
          name: 'min_price',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Minimum base price in NGN',
        },
        {
          name: 'max_price',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Maximum base price in NGN',
        },
        {
          name: 'bedrooms',
          in: 'query',
          schema: { type: 'integer' },
          description: 'Minimum number of bedrooms',
        },
        {
          name: 'q',
          in: 'query',
          schema: { type: 'string' },
          description: 'Search keyword (title, description, area, address)',
        },
        {
          name: 'sort',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['newest', 'price_asc', 'price_desc'],
            default: 'newest',
          },
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
          description: 'Paginated list of approved property listings',
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
  '/api/v1/listings/{idOrSlug}': {
    get: {
      tags: ['Listings Discovery'],
      summary: 'Get single property listing details by ID or Slug',
      parameters: [
        {
          name: 'idOrSlug',
          in: 'path',
          required: true,
          schema: { type: 'string', example: 'executive-room-and-parlour-self-contain-ibara-01' },
          description: 'Listing UUID or URL-friendly slug',
        },
      ],
      responses: {
        '200': {
          description: 'Listing details with lister profile & verification badge',
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
}

function buildListerListingPaths(role: 'agents' | 'landlords', tag: string) {
  const prefix = `/api/v1/${role}/listings`
  return {
    [`${prefix}/media`]: {
      post: {
        tags: [tag],
        summary: `Upload property listing photos (and optional video tour) to Cloudinary`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Property photos (max 5 MB each, JPEG/PNG/WebP)',
                  },
                  video: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional video tour file (max 5 MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Uploaded Cloudinary URLs for property media',
          },
        },
      },
    },
    [`${prefix}`]: {
      get: {
        tags: [tag],
        summary: `List own property listings (${role})`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'moderation_status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending_review', 'approved', 'rejected', 'suspended'],
            },
          },
          {
            name: 'availability_status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['available', 'rented', 'sold', 'unavailable'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of own property listings',
          },
        },
      },
      post: {
        tags: [tag],
        summary: `Create a new property listing (Requires verified KYC)`,
        description:
          'Publishes a new listing with full Nigerian fee breakdown (`base_price`, `agency_fee`, `legal_fee`, `caution_fee`, `service_charge` -> `total_initial_package`) and 3–10 photos. Enters `moderation_status = pending_review` for Admin approval.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'title',
                  'description',
                  'classification',
                  'property_type_id',
                  'state_id',
                  'city_id',
                  'area',
                  'address',
                  'base_price',
                  'images',
                ],
                properties: {
                  title: {
                    type: 'string',
                    example: 'Executive Room & Parlour Self-Contain at Ibara Housing Estate',
                  },
                  description: {
                    type: 'string',
                    example: 'Newly renovated mini flat with POP ceiling, private prepaid meter, and constant water.',
                  },
                  classification: {
                    type: 'string',
                    enum: ['rent', 'sale'],
                    example: 'rent',
                  },
                  property_type_id: {
                    type: 'string',
                    example: '00000000-0000-4000-f000-000000000004',
                  },
                  state_id: {
                    type: 'string',
                    example: '00000000-0000-4000-e000-000000000001',
                  },
                  city_id: {
                    type: 'string',
                    example: '00000000-0000-4000-e000-000000000011',
                  },
                  area: { type: 'string', example: 'Ibara Housing Estate' },
                  address: { type: 'string', example: '12 Presidential Boulevard, Ibara' },
                  latitude: { type: 'number', example: 7.1475 },
                  longitude: { type: 'number', example: 3.3619 },
                  base_price: { type: 'integer', example: 350000 },
                  payment_frequency: {
                    type: 'string',
                    enum: ['yearly', 'monthly', 'one_time'],
                    example: 'yearly',
                  },
                  agency_fee: { type: 'integer', example: 35000 },
                  legal_fee: { type: 'integer', example: 35000 },
                  caution_fee: { type: 'integer', example: 30000 },
                  service_charge: { type: 'integer', example: 20000 },
                  bedrooms: { type: 'integer', example: 1 },
                  bathrooms: { type: 'integer', example: 1 },
                  toilets: { type: 'integer', example: 1 },
                  amenities: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['Prepaid Meter', 'Running Water (Borehole)', 'POP Ceiling'],
                  },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
                      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
                      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
                    ],
                  },
                  video_tour_url: {
                    type: 'string',
                    example: 'https://www.youtube.com/watch?v=sample-tour-ibara',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Property listing created in pending_review status',
          },
        },
      },
    },
    [`${prefix}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get single own listing by ID (${role})`,
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
          '200': { description: 'Own listing details' },
        },
      },
      patch: {
        tags: [tag],
        summary: `Update own listing (${role})`,
        description:
          'Editing listing specifications or fees automatically resets `moderation_status` to `pending_review` for re-approval.',
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
          '200': { description: 'Updated listing details' },
        },
      },
      delete: {
        tags: [tag],
        summary: `Delete own listing (${role})`,
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
          '200': { description: 'Listing deleted' },
        },
      },
    },
    [`${prefix}/{id}/availability`]: {
      patch: {
        tags: [tag],
        summary: `Update listing availability status (${role})`,
        description:
          'Mark property as `available`, `rented`, `sold`, or `unavailable` without triggering re-moderation.',
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
                required: ['availability_status'],
                properties: {
                  availability_status: {
                    type: 'string',
                    enum: ['available', 'rented', 'sold', 'unavailable'],
                    example: 'rented',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Availability status updated' },
        },
      },
    },
  }
}

export const agentListingPaths = buildListerListingPaths('agents', 'Agent Listings')
export const landlordListingPaths = buildListerListingPaths('landlords', 'Landlord Listings')
