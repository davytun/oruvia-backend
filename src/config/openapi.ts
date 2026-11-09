/**
 * OpenAPI 3.1 Specification for Oruvia API
 * Served at `/openapi.json` and rendered interactively at `/docs`
 */
function buildRoleAuthPaths(
  roleKey: 'seekers' | 'agents' | 'landlords',
  singularRole: 'seeker' | 'agent' | 'landlord',
  tagName: string,
  profileSchemaRef: string,
  extraRegisterProps: Record<string, unknown>,
  extraUpdateProps: Record<string, unknown>
) {
  const basePath = `/api/v1/${roleKey}`
  return {
    [`${basePath}/register`]: {
      post: {
        tags: [tagName],
        summary: `Register a new ${singularRole} account`,
        description: `Creates a dedicated \`${singularRole}_users\` account, sends a 6-digit verification code via React Email, and returns a role-scoped JWT access token.`,
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
                  ...extraRegisterProps,
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: `${singularRole} registered`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        [singularRole]: { $ref: profileSchemaRef },
                        access_token: {
                          type: 'string',
                          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                        expires_in: { type: 'integer', example: 86400 },
                      },
                    },
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
            description: 'Email already registered for this role',
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
    [`${basePath}/verify-email`]: {
      post: {
        tags: [tagName],
        summary: `Verify ${singularRole} email with 6-digit code`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ada@oruvia.ng',
                  },
                  code: { type: 'string', example: '482910' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Email verified successfully.',
                        },
                        [singularRole]: { $ref: profileSchemaRef },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    [`${basePath}/resend-verification-code`]: {
      post: {
        tags: [tagName],
        summary: `Resend ${singularRole} email verification code`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ada@oruvia.ng',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification code dispatched if unverified account exists',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    message: `If an unverified ${singularRole} account exists for this email, a new verification code has been sent.`,
                  },
                },
              },
            },
          },
        },
      },
    },
    [`${basePath}/login`]: {
      post: {
        tags: [tagName],
        summary: `Login to ${singularRole} account`,
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
                    data: {
                      type: 'object',
                      properties: {
                        [singularRole]: { $ref: profileSchemaRef },
                        access_token: {
                          type: 'string',
                          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                        expires_in: { type: 'integer', example: 86400 },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid email or password',
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
    [`${basePath}/forgot-password`]: {
      post: {
        tags: [tagName],
        summary: `Request ${singularRole} password reset code`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ada@oruvia.ng',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset code sent if account exists',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    message: `If a ${singularRole} account exists for this email, a password reset code has been sent.`,
                  },
                },
              },
            },
          },
        },
      },
    },
    [`${basePath}/reset-password`]: {
      post: {
        tags: [tagName],
        summary: `Reset ${singularRole} password with 6-digit code`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code', 'new_password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'ada@oruvia.ng',
                  },
                  code: { type: 'string', example: '482910' },
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
            description: 'Password reset and previous tokens invalidated',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: { message: 'Password reset successfully.' },
                },
              },
            },
          },
        },
      },
    },
    [`${basePath}/change-password`]: {
      post: {
        tags: [tagName],
        summary: `Change ${singularRole} password (authenticated)`,
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
            description: 'Password changed and old tokens invalidated',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: { message: 'Password changed successfully.' },
                },
              },
            },
          },
        },
      },
    },
    [`${basePath}/me`]: {
      get: {
        tags: [tagName],
        summary: `Get authenticated ${singularRole} profile`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: `${singularRole} profile`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: profileSchemaRef },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: [tagName],
        summary: `Update authenticated ${singularRole} profile`,
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
                  ...extraUpdateProps,
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: profileSchemaRef },
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

export function buildOpenApiSpec(serverUrl = 'https://api.oruvia.workers.dev') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Oruvia API',
      version: '1.0.0',
      description:
        'Oruvia Proptech & Real Estate Marketplace API — Connecting property seekers with verified landlords and real estate agents across Nigeria.\n\nEach role (**Seekers**, **Agents**, **Landlords**) has its own standalone database table and direct authentication endpoints.\n\n**Tagline:** Oruvia: Your path to a roof.',
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
        name: 'Seekers Auth & Profile',
        description:
          'Direct registration, email verification, login, password reset, and profile endpoints for Property Seekers (`/api/v1/seekers/*`)',
      },
      {
        name: 'Agents Auth & Profile',
        description:
          'Direct registration, email verification, login, password reset, and profile endpoints for Real Estate Agents (`/api/v1/agents/*`)',
      },
      {
        name: 'Landlords Auth & Profile',
        description:
          'Direct registration, email verification, login, password reset, and profile endpoints for Landlords (`/api/v1/landlords/*`)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Pass the role-scoped `access_token` returned from `/register` or `/login`.',
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
        SeekerProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '7c12a102-119b-48ea-89bc-02f1b2411c11',
            },
            account_type: { type: 'string', example: 'seeker' },
            full_name: { type: 'string', example: 'Ada Okafor' },
            email: { type: 'string', example: 'ada@oruvia.ng' },
            phone: { type: ['string', 'null'], example: '+2348012345678' },
            avatar_url: { type: ['string', 'null'], example: null },
            preferred_location: {
              type: ['string', 'null'],
              example: 'Abeokuta, Ogun',
            },
            is_email_verified: { type: 'boolean', example: false },
            email_verified_at: { type: ['string', 'null'], example: null },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        AgentProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '2a91b304-552c-41d0-991a-84c2e1099b22',
            },
            account_type: { type: 'string', example: 'agent' },
            full_name: { type: 'string', example: 'Tunde Bakare' },
            email: { type: 'string', example: 'tunde@oruvia.ng' },
            phone: { type: ['string', 'null'], example: '+2348022223333' },
            whatsapp_number: {
              type: ['string', 'null'],
              example: '+2348022223333',
            },
            agency_name: {
              type: ['string', 'null'],
              example: 'Bakare Realty',
            },
            license_number: {
              type: ['string', 'null'],
              example: 'OG-AG-2026-019',
            },
            bio: { type: ['string', 'null'] },
            avatar_url: { type: ['string', 'null'], example: null },
            is_email_verified: { type: 'boolean', example: false },
            email_verified_at: { type: ['string', 'null'], example: null },
            is_verified: { type: 'boolean', example: false },
            verification_status: { type: 'string', example: 'unverified' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        LandlordProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '9f44d120-883a-47e2-a11c-55b90123c441',
            },
            account_type: { type: 'string', example: 'landlord' },
            full_name: { type: 'string', example: 'Chidi Nwosu' },
            email: { type: 'string', example: 'chidi@oruvia.ng' },
            phone: { type: ['string', 'null'], example: '+2348033334444' },
            whatsapp_number: {
              type: ['string', 'null'],
              example: '+2348033334444',
            },
            company_name: {
              type: ['string', 'null'],
              example: 'Nwosu Estates',
            },
            bio: { type: ['string', 'null'] },
            avatar_url: { type: ['string', 'null'], example: null },
            is_email_verified: { type: 'boolean', example: false },
            email_verified_at: { type: ['string', 'null'], example: null },
            is_verified: { type: 'boolean', example: false },
            verification_status: { type: 'string', example: 'unverified' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
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
                      environment: 'production',
                      status: 'healthy',
                      timestamp: '2026-11-09T15:23:48.790Z',
                    },
                  },
                },
              },
            },
          },
        },
      },
      ...buildRoleAuthPaths(
        'seekers',
        'seeker',
        'Seekers Auth & Profile',
        '#/components/schemas/SeekerProfile',
        {
          preferred_location: {
            type: 'string',
            example: 'Abeokuta, Ogun',
          },
        },
        {
          preferred_location: {
            type: ['string', 'null'],
            example: 'Ikeja, Lagos',
          },
        }
      ),
      ...buildRoleAuthPaths(
        'agents',
        'agent',
        'Agents Auth & Profile',
        '#/components/schemas/AgentProfile',
        {
          whatsapp_number: { type: 'string', example: '+2348022223333' },
          agency_name: { type: 'string', example: 'Bakare Realty' },
          license_number: { type: 'string', example: 'OG-AG-2026-019' },
          bio: {
            type: 'string',
            example: 'Licensed residential agent in Ogun State.',
          },
        },
        {
          whatsapp_number: {
            type: ['string', 'null'],
            example: '+2348022223333',
          },
          agency_name: {
            type: ['string', 'null'],
            example: 'Bakare Realty',
          },
          license_number: {
            type: ['string', 'null'],
            example: 'OG-AG-2026-019',
          },
          bio: { type: ['string', 'null'] },
        }
      ),
      ...buildRoleAuthPaths(
        'landlords',
        'landlord',
        'Landlords Auth & Profile',
        '#/components/schemas/LandlordProfile',
        {
          whatsapp_number: { type: 'string', example: '+2348033334444' },
          company_name: { type: 'string', example: 'Nwosu Estates' },
          bio: {
            type: 'string',
            example: 'Direct property owner across Abeokuta.',
          },
        },
        {
          whatsapp_number: {
            type: ['string', 'null'],
            example: '+2348033334444',
          },
          company_name: {
            type: ['string', 'null'],
            example: 'Nwosu Estates',
          },
          bio: { type: ['string', 'null'] },
        }
      ),
    },
  }
}
