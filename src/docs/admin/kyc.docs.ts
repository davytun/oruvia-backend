/**
 * Admin KYC Verification OpenAPI Paths (`/api/v1/admins/kyc/*`)
 */
export const adminKycPaths = {
  '/api/v1/admins/kyc/agents': {
    get: {
      tags: ['Admin KYC Verification'],
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
          description:
            'Paginated list of agent KYC submissions with agent details',
        },
      },
    },
  },
  '/api/v1/admins/kyc/agents/{id}': {
    get: {
      tags: ['Admin KYC Verification'],
      summary: 'Get a single agent KYC submission by ID',
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
      responses: {
        '200': {
          description: 'Agent KYC submission details with document URLs',
        },
      },
    },
  },
  '/api/v1/admins/kyc/agents/{id}/review': {
    patch: {
      tags: ['Admin KYC Verification'],
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
      tags: ['Admin KYC Verification'],
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
  '/api/v1/admins/kyc/landlords/{id}': {
    get: {
      tags: ['Admin KYC Verification'],
      summary: 'Get a single landlord KYC submission by ID',
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
      responses: {
        '200': {
          description: 'Landlord KYC submission details with document URLs',
        },
      },
    },
  },
  '/api/v1/admins/kyc/landlords/{id}/review': {
    patch: {
      tags: ['Admin KYC Verification'],
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
                  example:
                    'Utility bill address does not match residential address.',
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
}

