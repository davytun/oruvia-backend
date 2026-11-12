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
  State: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '00000000-0000-4000-e000-000000000001' },
      name: { type: 'string', example: 'Ogun' },
      slug: { type: 'string', example: 'ogun' },
      is_active: { type: 'boolean', example: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  City: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '00000000-0000-4000-e000-000000000011' },
      state_id: {
        type: 'string',
        example: '00000000-0000-4000-e000-000000000001',
      },
      name: { type: 'string', example: 'Abeokuta' },
      slug: { type: 'string', example: 'abeokuta' },
      is_active: { type: 'boolean', example: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  StateWithCities: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '00000000-0000-4000-e000-000000000001' },
      name: { type: 'string', example: 'Ogun' },
      slug: { type: 'string', example: 'ogun' },
      is_active: { type: 'boolean', example: true },
      cities: {
        type: 'array',
        items: { $ref: '#/components/schemas/City' },
      },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  PropertyType: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '00000000-0000-4000-f000-000000000004' },
      slug: { type: 'string', example: 'room_and_parlour_self_contain' },
      name: {
        type: 'string',
        example: 'Room & Parlour Self-Contain (Mini Flat)',
      },
      category: {
        type: 'string',
        enum: ['residential', 'commercial', 'land'],
        example: 'residential',
      },
      description: {
        type: ['string', 'null'],
        example:
          'A sitting room/parlour plus a separate bedroom with private bathroom and kitchen.',
      },
      default_bedrooms: { type: ['number', 'null'], example: 1 },
      display_order: { type: 'number', example: 4 },
      is_active: { type: 'boolean', example: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  PropertyListing: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '00000000-0000-4000-1000-000000000001' },
      lister_role: {
        type: 'string',
        enum: ['agent', 'landlord'],
        example: 'agent',
      },
      lister: {
        type: ['object', 'null'],
        properties: {
          role: { type: 'string', example: 'agent' },
          id: { type: 'string' },
          name: { type: 'string', example: 'Tunde Adeyemi' },
          email: { type: 'string', example: 'agent.verified@oruvia.ng' },
          phone: { type: ['string', 'null'], example: '+2348021112233' },
          whatsapp_number: {
            type: ['string', 'null'],
            example: '+2348021112233',
          },
          business_name: {
            type: ['string', 'null'],
            example: 'Crown Roof Realty Limited',
          },
          avatar_url: { type: ['string', 'null'] },
          is_verified: { type: 'boolean', example: true },
          verification_status: { type: 'string', example: 'approved' },
          verification_badge: {
            type: ['string', 'null'],
            example: 'licensed_agent',
          },
        },
      },
      title: {
        type: 'string',
        example:
          'Executive Room & Parlour Self-Contain at Ibara Housing Estate',
      },
      slug: {
        type: 'string',
        example: 'executive-room-and-parlour-self-contain-ibara-01',
      },
      description: { type: 'string' },
      classification: {
        type: 'string',
        enum: ['rent', 'sale'],
        example: 'rent',
      },
      state: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Ogun' },
          slug: { type: 'string', example: 'ogun' },
        },
      },
      city: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Abeokuta' },
          slug: { type: 'string', example: 'abeokuta' },
        },
      },
      area: { type: 'string', example: 'Ibara Housing Estate' },
      address: {
        type: 'string',
        example: '12 Presidential Boulevard, Ibara',
      },
      location_coordinates: {
        type: ['object', 'null'],
        properties: {
          latitude: { type: 'number', example: 7.1475 },
          longitude: { type: 'number', example: 3.3619 },
        },
      },
      property_type: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: {
            type: 'string',
            example: 'Room & Parlour Self-Contain (Mini Flat)',
          },
          slug: { type: 'string', example: 'room_and_parlour_self_contain' },
          category: { type: 'string', example: 'residential' },
        },
      },
      pricing: {
        type: 'object',
        properties: {
          base_price: { type: 'number', example: 350000 },
          payment_frequency: {
            type: 'string',
            enum: ['yearly', 'monthly', 'one_time'],
            example: 'yearly',
          },
          agency_fee: { type: 'number', example: 35000 },
          legal_fee: { type: 'number', example: 35000 },
          caution_fee: { type: 'number', example: 30000 },
          service_charge: { type: 'number', example: 20000 },
          total_initial_package: { type: 'number', example: 470000 },
        },
      },
      specifications: {
        type: 'object',
        properties: {
          bedrooms: { type: 'number', example: 1 },
          bathrooms: { type: 'number', example: 1 },
          toilets: { type: 'number', example: 1 },
          amenities: {
            type: 'array',
            items: { type: 'string' },
            example: [
              'Prepaid Meter',
              'Running Water (Borehole)',
              'POP Ceiling',
            ],
          },
        },
      },
      media: {
        type: 'object',
        properties: {
          images: {
            type: 'array',
            items: { type: 'string' },
            example: [
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            ],
          },
          video_tour_url: {
            type: ['string', 'null'],
            example: 'https://www.youtube.com/watch?v=sample-tour-ibara',
          },
        },
      },
      status: {
        type: 'object',
        properties: {
          availability_status: {
            type: 'string',
            enum: ['available', 'rented', 'sold', 'unavailable'],
            example: 'available',
          },
          moderation_status: {
            type: 'string',
            enum: ['pending_review', 'approved', 'rejected', 'suspended'],
            example: 'approved',
          },
          rejection_reason: { type: ['string', 'null'] },
          reviewed_at: { type: ['string', 'null'], format: 'date-time' },
          published_at: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  InspectionSettings: {
    type: 'object',
    properties: {
      slot_duration_minutes: { type: 'integer', example: 30 },
      max_bookings_per_slot: { type: 'integer', example: 1 },
      min_notice_hours: { type: 'integer', example: 2 },
      accepts_virtual: { type: 'boolean', example: true },
    },
  },

  ListerAvailabilityWindow: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      day_of_week: { type: 'integer', example: 1, description: '0=Sun, 1=Mon, ..., 6=Sat' },
      start_time: { type: 'string', example: '09:00', description: 'WAT 24-hr format' },
      end_time: { type: 'string', example: '17:00', description: 'WAT 24-hr format' },
      is_active: { type: 'boolean', example: true },
    },
  },

  ListerBlockedDate: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      date: { type: 'string', example: '2026-11-20', description: 'YYYY-MM-DD' },
      reason: { type: ['string', 'null'], example: 'Travelling' },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  InspectionBooking: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      reference: { type: 'string', example: 'ORV-INS-7K2M9Q' },
      listing: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Executive Room & Parlour Self-Contain at Ibara Housing Estate' },
          slug: { type: 'string', example: 'executive-room-and-parlour-self-contain-ibara-01' },
          area: { type: 'string', example: 'Ibara Housing Estate' },
          address: { type: 'string', example: '12 Presidential Boulevard, Ibara' },
          images: { type: 'array', items: { type: 'string' } },
        },
      },
      seeker: {
        type: ['object', 'null'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          full_name: { type: 'string', example: 'Babatunde Fashola' },
          email: { type: 'string', example: 'seeker@oruvia.ng' },
          phone: { type: ['string', 'null'], example: '+2348011223344' },
        },
      },
      lister: {
        type: ['object', 'null'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['agent', 'landlord'], example: 'agent' },
          name: { type: 'string', example: 'Tunde Adeyemi' },
          email: { type: 'string', example: 'agent.verified@oruvia.ng' },
          phone: { type: ['string', 'null'], example: '+2348021112233' },
          whatsapp: { type: ['string', 'null'], example: '+2348021112233' },
          agency_name: { type: ['string', 'null'], example: 'Crown Roof Realty Limited' },
        },
      },
      mode: { type: 'string', enum: ['physical', 'virtual'], example: 'physical' },
      virtual_method: { type: ['string', 'null'], enum: ['live_video_call', 'recorded_walkthrough', null], example: null },
      meeting_link: { type: ['string', 'null'], example: null },
      recorded_video_url: { type: ['string', 'null'], example: null },
      scheduled_at: { type: 'string', format: 'date-time', example: '2026-11-16T09:30:00.000Z' },
      scheduled_at_wat: { type: 'string', example: 'Monday, 16 Nov 2026 at 10:30 AM' },
      duration_minutes: { type: 'integer', example: 30 },
      status: {
        type: 'string',
        enum: [
          'pending',
          'confirmed',
          'declined',
          'reschedule_requested',
          'cancelled',
          'completed',
          'no_show',
          'expired',
        ],
        example: 'confirmed',
      },
      proposed_at: { type: ['string', 'null'], format: 'date-time' },
      proposed_by: { type: ['string', 'null'], enum: ['seeker', 'lister', null] },
      reschedule_reason: { type: ['string', 'null'] },
      seeker_note: { type: ['string', 'null'], example: 'I will be coming with my spouse.' },
      lister_note: { type: ['string', 'null'] },
      decline_reason: { type: ['string', 'null'] },
      cancel_reason: { type: ['string', 'null'] },
      cancelled_by: { type: ['string', 'null'], enum: ['seeker', 'lister', 'admin', 'system', null] },
      inspection_fee: { type: 'integer', example: 0, description: 'NGN' },
      fee_status: { type: 'string', enum: ['not_required', 'unpaid', 'paid', 'waived'], example: 'not_required' },
      confirmed_at: { type: ['string', 'null'], format: 'date-time' },
      completed_at: { type: ['string', 'null'], format: 'date-time' },
      cancelled_at: { type: ['string', 'null'], format: 'date-time' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  InspectionBookingEvent: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      actor_type: { type: 'string', enum: ['seeker', 'agent', 'landlord', 'admin', 'system'], example: 'seeker' },
      action: { type: 'string', example: 'requested' },
      from_status: { type: ['string', 'null'] },
      to_status: { type: ['string', 'null'] },
      note: { type: ['string', 'null'] },
      metadata: { type: ['object', 'null'] },
      created_at: { type: 'string', format: 'date-time' },
    },
  },
}

