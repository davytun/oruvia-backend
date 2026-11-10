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
            is_verified: { type: 'boolean', example: true },
            verification_status: { type: 'string', example: 'approved' },
            verification_badge: {
              type: ['string', 'null'],
              enum: ['verified_agent', 'licensed_agent', null],
              example: 'licensed_agent',
            },
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
            is_email_verified: { type: 'boolean', example: true },
            email_verified_at: { type: ['string', 'null'], example: null },
            is_verified: { type: 'boolean', example: true },
            verification_status: { type: 'string', example: 'approved' },
            verification_badge: {
              type: ['string', 'null'],
              enum: ['verified_landlord', 'verified_owner', null],
              example: 'verified_owner',
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        AgentKycStatusResponse: {
          type: 'object',
          properties: {
            is_verified: { type: 'boolean', example: false },
            verification_status: {
              type: 'string',
              enum: ['unverified', 'pending', 'approved', 'rejected'],
              example: 'pending',
            },
            verification_badge: {
              type: ['string', 'null'],
              enum: ['verified_agent', 'licensed_agent', null],
              example: null,
            },
            kyc_submission: {
              type: ['object', 'null'],
              properties: {
                id: { type: 'string' },
                agent_id: { type: 'string' },
                id_type: {
                  type: 'string',
                  enum: [
                    'nin',
                    'international_passport',
                    'drivers_license',
                    'voters_card',
                  ],
                  example: 'nin',
                },
                id_number: { type: 'string', example: '48291038475' },
                id_document_url: { type: 'string' },
                selfie_url: { type: 'string' },
                agency_name: { type: ['string', 'null'] },
                license_number: { type: ['string', 'null'] },
                license_document_url: { type: ['string', 'null'] },
                office_address: { type: 'string' },
                city: { type: 'string', example: 'Abeokuta' },
                state: { type: 'string', example: 'Ogun' },
                status: { type: 'string', example: 'pending' },
                qualified_badge: {
                  type: 'string',
                  enum: ['verified_agent', 'licensed_agent'],
                  example: 'licensed_agent',
                },
                rejection_reason: { type: ['string', 'null'] },
                submitted_at: { type: 'string', format: 'date-time' },
                reviewed_at: { type: ['string', 'null'], format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        LandlordKycStatusResponse: {
          type: 'object',
          properties: {
            is_verified: { type: 'boolean', example: false },
            verification_status: {
              type: 'string',
              enum: ['unverified', 'pending', 'approved', 'rejected'],
              example: 'pending',
            },
            verification_badge: {
              type: ['string', 'null'],
              enum: ['verified_landlord', 'verified_owner', null],
              example: null,
            },
            kyc_submission: {
              type: ['object', 'null'],
              properties: {
                id: { type: 'string' },
                landlord_id: { type: 'string' },
                id_type: {
                  type: 'string',
                  enum: [
                    'nin',
                    'international_passport',
                    'drivers_license',
                    'voters_card',
                  ],
                  example: 'nin',
                },
                id_number: { type: 'string', example: '61928374650' },
                id_document_url: { type: 'string' },
                selfie_url: { type: 'string' },
                proof_type: {
                  type: 'string',
                  enum: [
                    'utility_bill',
                    'c_of_o',
                    'deed_of_assignment',
                    'survey_plan',
                    'governors_consent',
                  ],
                  example: 'c_of_o',
                },
                proof_document_url: { type: 'string' },
                residential_address: { type: 'string' },
                city: { type: 'string', example: 'Abeokuta' },
                state: { type: 'string', example: 'Ogun' },
                status: { type: 'string', example: 'pending' },
                qualified_badge: {
                  type: 'string',
                  enum: ['verified_landlord', 'verified_owner'],
                  example: 'verified_owner',
                },
                rejection_reason: { type: ['string', 'null'] },
                submitted_at: { type: 'string', format: 'date-time' },
                reviewed_at: { type: ['string', 'null'], format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
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
      '/api/v1/agents/kyc': {
        get: {
          tags: ['Agents Auth & Profile'],
          summary: 'Get authenticated agent KYC status & badge info',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Agent KYC status and submission record',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/AgentKycStatusResponse',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Agents Auth & Profile'],
          summary: 'Submit agent KYC documents (multipart/form-data)',
          description:
            'Uploads government ID (`id_document`), live selfie (`selfie`), and optional agency CAC/license (`license_document`) to Cloudinary. Computes `qualified_badge` (`verified_agent` or `licensed_agent`) and sets `verification_status` to `pending`.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: [
                    'id_type',
                    'id_number',
                    'office_address',
                    'city',
                    'state',
                    'id_document',
                    'selfie',
                  ],
                  properties: {
                    id_type: {
                      type: 'string',
                      enum: [
                        'nin',
                        'international_passport',
                        'drivers_license',
                        'voters_card',
                      ],
                      example: 'nin',
                    },
                    id_number: { type: 'string', example: '48291038475' },
                    agency_name: {
                      type: 'string',
                      example: 'Crown Roof Realty Limited',
                    },
                    license_number: {
                      type: 'string',
                      example: 'OG-RE-2026-0481',
                    },
                    office_address: {
                      type: 'string',
                      example: '14 Presidential Boulevard, Ibara',
                    },
                    city: { type: 'string', example: 'Abeokuta' },
                    state: { type: 'string', example: 'Ogun' },
                    id_document: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'Government ID image or PDF (max 5 MB: JPEG, PNG, WebP, PDF)',
                    },
                    selfie: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'Clear portrait/selfie photo (max 5 MB: JPEG, PNG, WebP)',
                    },
                    license_document: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'Optional CAC certificate or real estate license document (qualifies for `licensed_agent` badge)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Agent KYC submitted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/AgentKycStatusResponse',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/landlords/kyc': {
        get: {
          tags: ['Landlords Auth & Profile'],
          summary: 'Get authenticated landlord KYC status & badge info',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Landlord KYC status and submission record',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/LandlordKycStatusResponse',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Landlords Auth & Profile'],
          summary: 'Submit landlord KYC documents (multipart/form-data)',
          description:
            'Uploads government ID (`id_document`), live selfie (`selfie`), and proof of address/ownership (`proof_document`) to Cloudinary. Computes `qualified_badge` (`verified_landlord` for `utility_bill`, or `verified_owner` for title documents) and sets `verification_status` to `pending`.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: [
                    'id_type',
                    'id_number',
                    'proof_type',
                    'residential_address',
                    'city',
                    'state',
                    'id_document',
                    'selfie',
                    'proof_document',
                  ],
                  properties: {
                    id_type: {
                      type: 'string',
                      enum: [
                        'nin',
                        'international_passport',
                        'drivers_license',
                        'voters_card',
                      ],
                      example: 'international_passport',
                    },
                    id_number: { type: 'string', example: 'B04928173' },
                    proof_type: {
                      type: 'string',
                      enum: [
                        'utility_bill',
                        'c_of_o',
                        'deed_of_assignment',
                        'survey_plan',
                        'governors_consent',
                      ],
                      example: 'c_of_o',
                    },
                    residential_address: {
                      type: 'string',
                      example: 'Plot 8, Kemta Idi-Aba GRA',
                    },
                    city: { type: 'string', example: 'Abeokuta' },
                    state: { type: 'string', example: 'Ogun' },
                    id_document: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'Government ID image or PDF (max 5 MB: JPEG, PNG, WebP, PDF)',
                    },
                    selfie: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'Clear portrait/selfie photo (max 5 MB: JPEG, PNG, WebP)',
                    },
                    proof_document: {
                      type: 'string',
                      format: 'binary',
                      description:
                        'Utility bill (`verified_landlord`) or property title document (`verified_owner`) (max 5 MB: JPEG, PNG, WebP, PDF)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Landlord KYC submitted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/LandlordKycStatusResponse',
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
  }
}
