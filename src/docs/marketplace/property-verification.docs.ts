/**
 * OpenAPI 3.1 documentation for Listing-Level Property Verification (Agents & Landlords)
 */
export function buildListerPropertyVerificationPaths(
  role: 'agents' | 'landlords',
  tag: string
) {
  const prefix = `/api/v1/${role}`
  const singularRole = role === 'agents' ? 'Agent' : 'Landlord'

  return {
    [`${prefix}/listings/{id}/verification/upload`]: {
      post: {
        tags: [tag],
        summary: `Upload property verification documents (${singularRole})`,
        description:
          'Upload property title/ownership documents (C of O, Deed of Assignment, Survey Plan, Governor’s Consent, Tenancy Authority, Utility Bill) as `multipart/form-data` under field `documents` to receive Cloudinary URLs.',
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
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['documents'],
                properties: {
                  documents: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Documents uploaded successfully' },
        },
      },
    },

    [`${prefix}/listings/{id}/verification`]: {
      post: {
        tags: [tag],
        summary: `Submit property verification request (${singularRole})`,
        description:
          'Submit property title documents and/or request physical site inspection verification for a listing to earn a `verified_property` or `oruvia_inspected` badge. Does not reset `moderation_status`.',
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
                required: ['verification_method'],
                properties: {
                  verification_method: {
                    type: 'string',
                    enum: ['document', 'physical_inspection', 'both'],
                    example: 'both',
                  },
                  document_type: {
                    type: 'string',
                    enum: [
                      'c_of_o',
                      'deed_of_assignment',
                      'survey_plan',
                      'governors_consent',
                      'tenancy_authority',
                      'utility_bill',
                    ],
                    example: 'c_of_o',
                  },
                  document_urls: {
                    type: 'array',
                    items: { type: 'string', format: 'uri' },
                    example: [
                      'https://res.cloudinary.com/oruvia-demo/image/upload/v1/oruvia/property-verifications/sample_c_of_o.pdf',
                    ],
                  },
                  site_contact_name: { type: 'string', example: 'Tunde Adeyemi' },
                  site_contact_phone: { type: 'string', example: '+2348021112233' },
                  preferred_inspection_date: {
                    type: 'string',
                    example: '2026-11-20',
                  },
                  notes: {
                    type: 'string',
                    example: 'Caretaker is available 10am-4pm on weekdays.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Property verification request submitted' },
          '409': { description: 'Already verified or pending review' },
        },
      },
      get: {
        tags: [tag],
        summary: `Get listing property verification status & history (${singularRole})`,
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
          '200': { description: 'Property verification status and history' },
        },
      },
    },
  }
}

export const agentPropertyVerificationPaths =
  buildListerPropertyVerificationPaths('agents', 'Agent Listings')

export const landlordPropertyVerificationPaths =
  buildListerPropertyVerificationPaths('landlords', 'Landlord Listings')

