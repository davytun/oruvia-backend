/**
 * OpenAPI 3.1 Specification for Oruvia API
 * Served at `/openapi.json` and rendered interactively at `/docs`
 */
export function buildOpenApiSpec(serverUrl = 'http://localhost:8787') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Oruvia API',
      version: '1.0.0',
      description:
        'Oruvia Proptech & Real Estate Marketplace API — Connecting property seekers with verified landlords and real estate agents across Nigeria.\n\n**Tagline:** Oruvia: Your path to a roof.',
    },
    servers: [
      {
        url: serverUrl,
        description: 'API Server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service status and health check endpoints',
      },
      {
        name: 'Auth',
        description:
          'Registration, login, token refresh, and session logout endpoints',
      },
      {
        name: 'Account & Role Profiles',
        description:
          'Authenticated user profile and dedicated role table management (Seeker, Agent, Landlord)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Pass the `access_token` returned from `/api/v1/auth/login` or `/api/v1/auth/register`.',
        },
      },
      schemas: {
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_FAILED' },
                message: {
                  type: 'string',
                  example: 'The request entity contains invalid parameters.',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string', example: 'email' },
                      issue: {
                        type: 'string',
                        example:
                          'The email address provided is already registered.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        StandardErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: {
                  type: 'string',
                  example: 'Invalid email or password.',
                },
              },
            },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'd8528bf2-8a42-4b02-9a59-349b241f3f19',
            },
            full_name: { type: 'string', example: 'Ada Okafor' },
            email: { type: 'string', example: 'ada@oruvia.ng' },
            phone: {
              type: ['string', 'null'],
              example: '+2348012345678',
            },
            avatar_url: { type: ['string', 'null'], example: null },
            email_verified_at: { type: ['string', 'null'], example: null },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-11-09T14:47:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-11-09T14:47:00.000Z',
            },
            profiles: {
              type: 'object',
              properties: {
                seeker: {
                  type: ['object', 'null'],
                  properties: {
                    id: {
                      type: 'string',
                      example: '7c12a102-119b-48ea-89bc-02f1b2411c11',
                    },
                    preferred_location: {
                      type: ['string', 'null'],
                      example: 'Abeokuta, Ogun',
                    },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
                agent: {
                  type: ['object', 'null'],
                  properties: {
                    id: {
                      type: 'string',
                      example: '2a91b304-552c-41d0-991a-84c2e1099b22',
                    },
                    agency_name: {
                      type: ['string', 'null'],
                      example: 'Okafor Realty',
                    },
                    license_number: {
                      type: ['string', 'null'],
                      example: 'OG-AG-2026-019',
                    },
                    bio: { type: ['string', 'null'] },
                    whatsapp_number: {
                      type: ['string', 'null'],
                      example: '+2348011112222',
                    },
                    is_verified: { type: 'boolean', example: false },
                    verification_status: {
                      type: 'string',
                      example: 'unverified',
                    },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
                landlord: {
                  type: ['object', 'null'],
                  properties: {
                    id: {
                      type: 'string',
                      example: '9f44d120-883a-47e2-a11c-55b90123c441',
                    },
                    company_name: {
                      type: ['string', 'null'],
                      example: 'Okafor Estates',
                    },
                    bio: { type: ['string', 'null'] },
                    whatsapp_number: {
                      type: ['string', 'null'],
                      example: '+2348011112222',
                    },
                    is_verified: { type: 'boolean', example: false },
                    verification_status: {
                      type: 'string',
                      example: 'unverified',
                    },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
                admin: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
        AuthSuccessData: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/UserProfile' },
            access_token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refresh_token: {
              type: 'string',
              example: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c...',
            },
            expires_in: { type: 'integer', example: 900 },
          },
        },
      },
    },
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Returns service health and environment status.',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      service: 'Oruvia',
                      tagline: 'Oruvia: Your path to a roof.',
                      environment: 'development',
                      status: 'healthy',
                      timestamp: '2026-11-09T14:40:52.798Z',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new account',
          description:
            'Creates a `users` record and a `seekers` record. If `role` is `"agent"` or `"landlord"`, also creates the corresponding row in `agents` or `landlords`.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['full_name', 'email', 'password'],
                  properties: {
                    full_name: { type: 'string', example: 'Ada Okafor' },
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'ada@oruvia.ng',
                    },
                    password: {
                      type: 'string',
                      minLength: 8,
                      example: 'Password123!',
                    },
                    phone: { type: 'string', example: '+2348012345678' },
                    role: {
                      type: 'string',
                      enum: ['seeker', 'agent', 'landlord'],
                      default: 'seeker',
                    },
                    preferred_location: {
                      type: 'string',
                      example: 'Abeokuta, Ogun',
                    },
                    agency_name: { type: 'string', example: 'Okafor Realty' },
                    license_number: {
                      type: 'string',
                      example: 'OG-AG-2026-019',
                    },
                    company_name: { type: 'string', example: 'Okafor Estates' },
                    bio: { type: 'string' },
                    whatsapp_number: {
                      type: 'string',
                      example: '+2348011112222',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Account registered',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/AuthSuccessData' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation failed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ValidationErrorResponse',
                  },
                },
              },
            },
            '409': {
              description: 'Email already registered',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ValidationErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'ada@oruvia.ng',
                    },
                    password: { type: 'string', example: 'Password123!' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/AuthSuccessData' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StandardErrorResponse',
                  },
                },
              },
            },
            '403': {
              description: 'Account suspended or temporarily locked',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StandardErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description:
            'Rotates the refresh token and returns a new access token and refresh token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refresh_token'],
                  properties: {
                    refresh_token: {
                      type: 'string',
                      example: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c...',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Tokens rotated',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: {
                      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                      refresh_token: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d...',
                      expires_in: 900,
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid or expired refresh token',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StandardErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout current session',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Session revoked',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: { logged_out: true },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StandardErrorResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/me': {
        get: {
          tags: ['Account & Role Profiles'],
          summary: 'Get current user and role profiles',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Current user profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/UserProfile' },
                    },
                  },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Account & Role Profiles'],
          summary: 'Update user and seeker profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    full_name: { type: 'string', example: 'Adaeze Okafor' },
                    phone: {
                      type: ['string', 'null'],
                      example: '+2348099998888',
                    },
                    avatar_url: {
                      type: ['string', 'null'],
                      example: 'https://cdn.oruvia.ng/avatars/ada.png',
                    },
                    preferred_location: {
                      type: ['string', 'null'],
                      example: 'Ikeja, Lagos',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Profile updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/UserProfile' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/me/password': {
        patch: {
          tags: ['Account & Role Profiles'],
          summary: 'Change password',
          description:
            'Verifies `current_password`, updates password hash, and revokes all other active sessions.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['current_password', 'new_password'],
                  properties: {
                    current_password: {
                      type: 'string',
                      example: 'Password123!',
                    },
                    new_password: {
                      type: 'string',
                      minLength: 8,
                      example: 'NewStrongPassword456!',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Password updated',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    data: { updated: true },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/me/agent': {
        post: {
          tags: ['Account & Role Profiles'],
          summary: 'Activate Agent profile (Seeker becoming an Agent)',
          description:
            'Creates a dedicated row in the `agents` table for the authenticated user without removing their `seekers` record.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agency_name: { type: 'string', example: 'Okafor Realty' },
                    license_number: {
                      type: 'string',
                      example: 'OG-AG-2026-019',
                    },
                    bio: {
                      type: 'string',
                      example: 'Licensed residential agent in Ogun State.',
                    },
                    whatsapp_number: {
                      type: 'string',
                      example: '+2348011112222',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Agent profile created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/UserProfile' },
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Agent profile already exists',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ValidationErrorResponse',
                  },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Account & Role Profiles'],
          summary: 'Update Agent profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agency_name: { type: 'string', example: 'Okafor Realty' },
                    license_number: {
                      type: 'string',
                      example: 'OG-AG-2026-019',
                    },
                    bio: { type: 'string' },
                    whatsapp_number: {
                      type: 'string',
                      example: '+2348011112222',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent profile updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/UserProfile' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/me/landlord': {
        post: {
          tags: ['Account & Role Profiles'],
          summary: 'Activate Landlord profile (Seeker becoming a Landlord)',
          description:
            'Creates a dedicated row in the `landlords` table for the authenticated user without removing their `seekers` record.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_name: { type: 'string', example: 'Okafor Estates' },
                    bio: {
                      type: 'string',
                      example: 'Direct property owner across Abeokuta.',
                    },
                    whatsapp_number: {
                      type: 'string',
                      example: '+2348011112222',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Landlord profile created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/UserProfile' },
                    },
                  },
                },
              },
            },
            '409': {
              description: 'Landlord profile already exists',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ValidationErrorResponse',
                  },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Account & Role Profiles'],
          summary: 'Update Landlord profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_name: { type: 'string', example: 'Okafor Estates' },
                    bio: { type: 'string' },
                    whatsapp_number: {
                      type: 'string',
                      example: '+2348011112222',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Landlord profile updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/UserProfile' },
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
}

