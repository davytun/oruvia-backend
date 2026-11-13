/**
 * OpenAPI 3.1 documentation for Admin Listing-Level Property Verification Review
 */
export const adminPropertyVerificationPaths = {
  '/api/v1/admins/property-verifications': {
    get: {
      tags: ['Admin - Property Verification'],
      summary: 'List property verification submissions',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        },
        {
          name: 'verification_method',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['document', 'physical_inspection', 'both'],
          },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Property verification submissions retrieved' },
      },
    },
  },

  '/api/v1/admins/property-verifications/{id}': {
    get: {
      tags: ['Admin - Property Verification'],
      summary: 'Get property verification submission details',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': { description: 'Submission details retrieved' },
        '404': { description: 'Submission not found' },
      },
    },
  },

  '/api/v1/admins/property-verifications/{id}/review': {
    patch: {
      tags: ['Admin - Property Verification'],
      summary: 'Approve or reject a property verification submission',
      description:
        'Approving sets `is_property_verified = true` and grants `verified_property` or `oruvia_inspected` badge on the listing. Rejecting requires a `rejection_reason`. Sends an email notification to the lister.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: {
                  type: 'string',
                  enum: ['approved', 'rejected'],
                  example: 'approved',
                },
                badge: {
                  type: 'string',
                  enum: ['verified_property', 'oruvia_inspected'],
                  example: 'oruvia_inspected',
                },
                rejection_reason: {
                  type: 'string',
                  example: 'Uploaded C of O scan is blurry and illegible.',
                },
                admin_notes: {
                  type: 'string',
                  example: 'Field officer confirmed property address and C of O.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Property verification reviewed' },
        '409': { description: 'Submission already reviewed' },
      },
    },
  },
}

