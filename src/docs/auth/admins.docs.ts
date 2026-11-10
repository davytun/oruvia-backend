/**
 * Admins Auth, Profile, KYC Review & User Management OpenAPI Paths (`/api/v1/admins/*`)
 */
export const adminPaths = {
  '/api/v1/admins/login': {
    post: {
      tags: ['Admins'],
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
                      expires_in: { type: 'number', example: 604800 },
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
      tags: ['Admins'],
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
      tags: ['Admins'],
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
      tags: ['Admins'],
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
      tags: ['Admins'],
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
      tags: ['Admins'],
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
                  example: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
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
      tags: ['Admins'],
      summary: 'List all admin accounts (paginated)',
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
      tags: ['Admins'],
      summary: 'Create a new admin account (Admin-only)',
      description:
        'Following `docs/roles.md` ("Administrative privileges must not be granted through ordinary user actions"), only an authenticated Admin can provision another Admin account.',
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
  '/api/v1/admins/kyc/agents': {
    get: {
      tags: ['Admins'],
      summary: 'List agent KYC submissions (filterable by status)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
          },
          description: 'Optional status filter (e.g. `pending`)',
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
          description: 'Paginated list of agent KYC submissions with agent details',
        },
      },
    },
  },
  '/api/v1/admins/kyc/agents/{id}/review': {
    patch: {
      tags: ['Admins'],
      summary: 'Approve or reject an agent KYC submission',
      description:
        'Approving sets `is_verified = true`, `verification_status = approved`, activates the agent `verification_badge` (`verified_agent` or `licensed_agent`), and emails the agent. Rejecting requires `rejection_reason`, clears any badge, and emails the agent.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            example: '00000000-0000-4000-a000-000000000203',
          },
          description: 'Agent KYC submission ID',
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
                  enum: ['approved', 'rejected'],
                  example: 'approved',
                },
                rejection_reason: {
                  type: 'string',
                  description: 'Required when `status` is `rejected`',
                  example: 'The uploaded NIN image is blurry and unreadable.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Agent KYC reviewed and badge status updated',
        },
      },
    },
  },
  '/api/v1/admins/kyc/landlords': {
    get: {
      tags: ['Admins'],
      summary: 'List landlord KYC submissions (filterable by status)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
          },
          description: 'Optional status filter (e.g. `pending`)',
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
          description:
            'Paginated list of landlord KYC submissions with landlord details',
        },
      },
    },
  },
  '/api/v1/admins/kyc/landlords/{id}/review': {
    patch: {
      tags: ['Admins'],
      summary: 'Approve or reject a landlord KYC submission',
      description:
        'Approving sets `is_verified = true`, `verification_status = approved`, activates the landlord `verification_badge` (`verified_landlord` or `verified_owner`), and emails the landlord. Rejecting requires `rejection_reason`, clears any badge, and emails the landlord.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            example: '00000000-0000-4000-b000-000000000203',
          },
          description: 'Landlord KYC submission ID',
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
                  enum: ['approved', 'rejected'],
                  example: 'approved',
                },
                rejection_reason: {
                  type: 'string',
                  description: 'Required when `status` is `rejected`',
                  example: 'Utility bill address does not match residential address.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Landlord KYC reviewed and badge status updated',
        },
      },
    },
  },
  '/api/v1/admins/users/{role}': {
    get: {
      tags: ['Admins'],
      summary: 'List users by role (seekers, agents, or landlords)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'role',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['seekers', 'agents', 'landlords'],
            example: 'agents',
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
          description: 'Paginated list of users for the specified role',
        },
      },
    },
  },
  '/api/v1/admins/users/{role}/{id}/status': {
    patch: {
      tags: ['Admins'],
      summary: 'Suspend or unsuspend a seeker, agent, or landlord account',
      description:
        'Suspending an account (`is_suspended: true`) also increments `token_version` so any active JWT tokens for that user are immediately invalidated.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'role',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['seekers', 'agents', 'landlords'],
            example: 'seekers',
          },
        },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            example: '00000000-0000-4000-c000-000000000101',
          },
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
                is_suspended: { type: 'boolean', example: false },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'User suspension status updated',
        },
      },
    },
  },
}

