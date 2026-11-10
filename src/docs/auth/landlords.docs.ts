import { buildRoleAuthPaths } from './shared'

/**
 * Landlords Auth, Profile & KYC OpenAPI Paths (`/api/v1/landlords/*`)
 */
export const landlordPaths = {
  ...buildRoleAuthPaths(
    'landlords',
    'landlord',
    'Landlords',
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
    },
    'landlord.verified@oruvia.ng'
  ),
  '/api/v1/landlords/kyc': {
    get: {
      tags: ['Landlords'],
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
      tags: ['Landlords'],
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
}

