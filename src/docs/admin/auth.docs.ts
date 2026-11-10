/**
 * Admin Auth, Profile & Super Admin Management OpenAPI Paths (`/api/v1/admins/*`)
 */
export const adminAuthPaths = {
  '/api/v1/admins/login': {
    post: {
      tags: ['Admin Auth & Management'],
      summary: 'Authenticate admin and return JWT access token',
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
                  example: 'admin@oruvia.ng',
                },
                password: {
                  type: 'string',
                  example: 'Password123!',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Admin authenticated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/AdminProfile' },
                      access_token: { type: 'string' },
                      token_type: { type: 'string', example: 'Bearer' },
                      expires_in: { type: 'number', example: 86400 },
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
  '/api/v1/admins/forgot-password': {
    post: {
      tags: ['Admin Auth & Management'],
      summary: 'Request a 6-digit password reset code for an admin account',
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
                  example: 'admin@oruvia.ng',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Password reset code sent if account exists',
        },
      },
    },
  },
  '/api/v1/admins/reset-password': {
    post: {
      tags: ['Admin Auth & Management'],
      summary: 'Reset admin password with 6-digit code & revoke active tokens',
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
                  example: 'admin@oruvia.ng',
                },
                code: { type: 'string', example: '482910' },
                new_password: { type: 'string', example: 'NewPassword123!' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Admin password reset and new JWT returned',
        },
      },
    },
  },
  '/api/v1/admins/change-password': {
    post: {
      tags: ['Admin Auth & Management'],
      summary: 'Change authenticated admin password & revoke older tokens',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['current_password', 'new_password'],
              properties: {
                current_password: { type: 'string', example: 'Password123!' },
                new_password: { type: 'string', example: 'NewPassword123!' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Password changed and rotated JWT returned',
        },
      },
    },
  },
  '/api/v1/admins/me': {
    get: {
      tags: ['Admin Auth & Management'],
      summary: 'Get authenticated admin profile',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Admin profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/AdminProfile' },
                },
              },
            },
          },
        },
      },
    },
    patch: {
      tags: ['Admin Auth & Management'],
      summary: 'Update authenticated admin profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                full_name: { type: 'string', example: 'Oruvia Super Admin' },
                phone: { type: ['string', 'null'], example: '+2348010000000' },
                avatar_url: {
                  type: ['string', 'null'],
                  example:
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated admin profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/AdminProfile' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/admins': {
    get: {
      tags: ['Admin Auth & Management'],
      summary: 'List all admin accounts (Super Admin only)',
      security: [{ bearerAuth: [] }],
      parameters: [
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
          description: 'Paginated list of admin accounts',
        },
      },
    },
    post: {
      tags: ['Admin Auth & Management'],
      summary: 'Create a new admin account (Super Admin only)',
      description:
        'Only an authenticated `super_admin` can create new `admin` accounts.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['full_name', 'email', 'password'],
              properties: {
                full_name: { type: 'string', example: 'Chidinma Okafor' },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'chidinma.admin@oruvia.ng',
                },
                password: { type: 'string', example: 'Password123!' },
                phone: { type: 'string', example: '+2348090001122' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'New admin account created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/AdminProfile' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/admins/{id}/status': {
    patch: {
      tags: ['Admin Auth & Management'],
      summary: 'Suspend or unsuspend an admin account (Super Admin only)',
      description:
        'Only a `super_admin` can suspend or unsuspend a regular `admin` account. Suspending immediately increments `token_version` to revoke active sessions.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Admin account ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['is_suspended'],
              properties: {
                is_suspended: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Admin suspension status updated',
        },
      },
    },
  },
}

