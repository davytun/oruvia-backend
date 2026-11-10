import { buildRoleAuthPaths } from './shared'

/**
 * Agents Auth, Profile & KYC OpenAPI Paths (`/api/v1/agents/*`)
 */
export const agentPaths = {
  ...buildRoleAuthPaths(
    'agents',
    'agent',
    'Agents',
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
    },
    'agent.verified@oruvia.ng'
  ),
  '/api/v1/agents/kyc': {
    get: {
      tags: ['Agents'],
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
      tags: ['Agents'],
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
}
