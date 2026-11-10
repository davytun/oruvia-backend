/**
 * Shared OpenAPI 3.1 Component Schemas
 */
export const openApiSchemas = {
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
                  example: 'The email address provided is already registered.',
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
        example: '00000000-0000-4000-c000-000000000101',
      },
      account_type: { type: 'string', example: 'seeker' },
      full_name: { type: 'string', example: 'Adebayo Olanrewaju' },
      email: { type: 'string', example: 'seeker.demo@oruvia.ng' },
      phone: { type: ['string', 'null'], example: '+2348091112233' },
      avatar_url: { type: ['string', 'null'], example: null },
      preferred_location: {
        type: ['string', 'null'],
        example: 'Abeokuta, Ogun',
      },
      is_email_verified: { type: 'boolean', example: true },
      email_verified_at: {
        type: ['string', 'null'],
        example: '2026-11-10T08:00:00.000Z',
      },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  AgentProfile: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '00000000-0000-4000-a000-000000000101',
      },
      account_type: { type: 'string', example: 'agent' },
      full_name: { type: 'string', example: 'Tunde Adeyemi' },
      email: { type: 'string', example: 'agent.verified@oruvia.ng' },
      phone: { type: ['string', 'null'], example: '+2348021112233' },
      whatsapp_number: {
        type: ['string', 'null'],
        example: '+2348021112233',
      },
      agency_name: {
        type: ['string', 'null'],
        example: 'Crown Roof Realty Limited',
      },
      license_number: {
        type: ['string', 'null'],
        example: 'OG-RE-2026-0481',
      },
      bio: { type: ['string', 'null'] },
      avatar_url: { type: ['string', 'null'], example: null },
      is_email_verified: { type: 'boolean', example: true },
      email_verified_at: {
        type: ['string', 'null'],
        example: '2026-11-10T08:00:00.000Z',
      },
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
        example: '00000000-0000-4000-b000-000000000101',
      },
      account_type: { type: 'string', example: 'landlord' },
      full_name: { type: 'string', example: 'Chief Olusegun Balogun' },
      email: { type: 'string', example: 'landlord.verified@oruvia.ng' },
      phone: { type: ['string', 'null'], example: '+2348057778899' },
      whatsapp_number: {
        type: ['string', 'null'],
        example: '+2348057778899',
      },
      company_name: {
        type: ['string', 'null'],
        example: 'Balogun Properties & Courts',
      },
      bio: { type: ['string', 'null'] },
      avatar_url: { type: ['string', 'null'], example: null },
      is_email_verified: { type: 'boolean', example: true },
      email_verified_at: {
        type: ['string', 'null'],
        example: '2026-11-10T08:00:00.000Z',
      },
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
  AdminProfile: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '00000000-0000-4000-d000-000000000101',
      },
      account_type: { type: 'string', example: 'admin' },
      role: {
        type: 'string',
        enum: ['super_admin', 'admin'],
        example: 'super_admin',
      },
      full_name: { type: 'string', example: 'Oruvia Super Admin' },
      email: { type: 'string', example: 'admin@oruvia.ng' },
      phone: { type: ['string', 'null'], example: '+2348010000000' },
      avatar_url: { type: ['string', 'null'], example: null },
      is_suspended: { type: 'boolean', example: false },
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
            example: 'international_passport',
          },
          id_number: { type: 'string', example: 'B04928173' },
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
}

