/**
 * Shared builder for role-scoped Auth & Profile OpenAPI paths
 */
export function buildRoleAuthPaths(
  roleKey: 'seekers' | 'agents' | 'landlords',
  singularRole: 'seeker' | 'agent' | 'landlord',
  tagName: string,
  profileSchemaRef: string,
  extraRegisterProps: Record<string, unknown>,
  extraUpdateProps: Record<string, unknown>,
  defaultLoginEmail = 'seeker.demo@oruvia.ng'
) {
  const basePath = `/api/v1/${roleKey}`

  return {
    [`${basePath}/register`]: {
      post: {
        tags: [tagName],
        summary: `Register a new ${singularRole} account`,
        description: `Creates a standalone ${singularRole} record, sends a 6-digit verification code via email, and returns a 24-hour JWT access token.`,
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
            description: `${singularRole} registered successfully`,
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
                  $ref: '#/components/schemas/StandardErrorResponse',
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
                  code: {
                    type: 'string',
                    pattern: '^\\d{6}$',
                    example: '482910',
                  },
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
          '400': {
            description: 'Invalid or expired verification code',
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
                    example: defaultLoginEmail,
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
                    example: defaultLoginEmail,
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
                    example: defaultLoginEmail,
                  },
                  code: {
                    type: 'string',
                    pattern: '^\\d{6}$',
                    example: '482910',
                  },
                  new_password: {
                    type: 'string',
                    minLength: 8,
                    example: 'NewStrongPass123!',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset and old tokens invalidated',
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
        summary: `Change authenticated ${singularRole} password`,
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
                    example: 'UpdatedPass456!',
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

