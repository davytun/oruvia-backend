import type { Context } from 'hono'
import { z } from 'zod'
import {
  AUTH_CONFIG,
  AVAILABILITY_STATUSES,
  INQUIRY_STATUSES,
  INSPECTION_FEE_STATUSES,
  INSPECTION_MODES,
  INSPECTION_STATUSES,
  KYC_ID_TYPES,
  LANDLORD_PROOF_TYPES,
  LISTER_ROLES,
  LISTING_CLASSIFICATIONS,
  MODERATION_STATUSES,
  PAGINATION_DEFAULTS,
  PAYMENT_FREQUENCIES,
  PROPERTY_CATEGORIES,
  PROPERTY_VERIFICATION_BADGES,
  PROPERTY_VERIFICATION_DOC_TYPES,
  PROPERTY_VERIFICATION_METHODS,
  REVIEW_STATUSES,
  REVIEW_TARGET_TYPES,
  VERIFICATION_STATUSES,
  VIRTUAL_INSPECTION_METHODS,
} from '../config/constants'
import { sendError } from './response'

/**
 * Shared validation hook for `@hono/zod-validator`
 * Formats Zod validation issues into Oruvia's standard error response.
 */
export function validationHook(
  result: {
    success: boolean
    error?: { issues: Array<{ path: PropertyKey[]; message: string }> }
  },
  c: Context
) {
  if (!result.success && result.error) {
    const details = result.error.issues.map((item) => ({
      field: item.path.length > 0 ? item.path.map(String).join('.') : 'body',
      issue: item.message,
    }))

    return sendError(
      c,
      'The request entity contains invalid parameters.',
      400,
      'VALIDATION_FAILED',
      details
    )
  }
}

export const idParamSchema = z.object({
  id: z.string().min(1, 'Resource ID is required.'),
})

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(PAGINATION_DEFAULTS.PAGE),
  per_page: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.MAX_PER_PAGE)
    .default(PAGINATION_DEFAULTS.PER_PAGE),
})

const baseEmailField = z
  .email('Please provide a valid email address.')
  .transform((val) => val.trim().toLowerCase())

const basePasswordField = z
  .string()
  .min(
    AUTH_CONFIG.MIN_PASSWORD_LENGTH,
    `Password must be at least ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters long.`
  )
  .max(
    AUTH_CONFIG.MAX_PASSWORD_LENGTH,
    `Password must not exceed ${AUTH_CONFIG.MAX_PASSWORD_LENGTH} characters.`
  )

const otpCodeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Verification code must be a 6-digit number.')

export const registerSeekerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100, 'Full name must not exceed 100 characters.'),
    email: baseEmailField,
    password: basePasswordField,
    phone: z
      .string()
      .trim()
      .min(7, 'Please provide a valid phone number.')
      .optional(),
    preferred_location: z.string().trim().max(120).optional(),
  })
  .strict()

export const registerAgentSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100, 'Full name must not exceed 100 characters.'),
    email: baseEmailField,
    password: basePasswordField,
    phone: z
      .string()
      .trim()
      .min(7, 'Please provide a valid phone number.')
      .optional(),
    whatsapp_number: z.string().trim().max(30).optional(),
    agency_name: z.string().trim().max(120).optional(),
    license_number: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(1000).optional(),
  })
  .strict()

export const registerLandlordSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100, 'Full name must not exceed 100 characters.'),
    email: baseEmailField,
    password: basePasswordField,
    phone: z
      .string()
      .trim()
      .min(7, 'Please provide a valid phone number.')
      .optional(),
    whatsapp_number: z.string().trim().max(30).optional(),
    company_name: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(1000).optional(),
  })
  .strict()

export const verifyEmailSchema = z
  .object({
    email: baseEmailField,
    code: otpCodeField,
  })
  .strict()

export const resendVerificationCodeSchema = z
  .object({
    email: baseEmailField,
  })
  .strict()

export const loginSchema = z
  .object({
    email: baseEmailField,
    password: z.string().min(1, 'Password is required.'),
  })
  .strict()

export const forgotPasswordSchema = z
  .object({
    email: baseEmailField,
  })
  .strict()

export const resetPasswordSchema = z
  .object({
    email: baseEmailField,
    code: otpCodeField,
    new_password: basePasswordField,
  })
  .strict()

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: basePasswordField,
  })
  .strict()

export const updateSeekerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100)
      .optional(),
    phone: z.string().trim().min(7).nullable().optional(),
    avatar_url: z.url('Avatar URL must be a valid URL.').nullable().optional(),
    preferred_location: z.string().trim().max(120).nullable().optional(),
  })
  .strict()

export const updateAgentSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100)
      .optional(),
    phone: z.string().trim().min(7).nullable().optional(),
    whatsapp_number: z.string().trim().max(30).nullable().optional(),
    agency_name: z.string().trim().max(120).nullable().optional(),
    license_number: z.string().trim().max(80).nullable().optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
    avatar_url: z.url('Avatar URL must be a valid URL.').nullable().optional(),
  })
  .strict()

export const updateLandlordSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100)
      .optional(),
    phone: z.string().trim().min(7).nullable().optional(),
    whatsapp_number: z.string().trim().max(30).nullable().optional(),
    company_name: z.string().trim().max(120).nullable().optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
    avatar_url: z.url('Avatar URL must be a valid URL.').nullable().optional(),
  })
  .strict()

export const submitAgentKycFieldsSchema = z.object({
  id_type: z.enum(
    [
      KYC_ID_TYPES.NIN,
      KYC_ID_TYPES.INTERNATIONAL_PASSPORT,
      KYC_ID_TYPES.DRIVERS_LICENSE,
      KYC_ID_TYPES.VOTERS_CARD,
    ],
    {
      message:
        'id_type must be one of: nin, international_passport, drivers_license, voters_card.',
    }
  ),
  id_number: z
    .string()
    .trim()
    .min(3, 'ID number must be at least 3 characters long.')
    .max(60, 'ID number must not exceed 60 characters.'),
  agency_name: z.string().trim().max(120).optional(),
  license_number: z.string().trim().max(80).optional(),
  office_address: z
    .string()
    .trim()
    .min(5, 'Office address must be at least 5 characters long.')
    .max(250, 'Office address must not exceed 250 characters.'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters long.')
    .max(100),
  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters long.')
    .max(100),
})

export const submitLandlordKycFieldsSchema = z.object({
  id_type: z.enum(
    [
      KYC_ID_TYPES.NIN,
      KYC_ID_TYPES.INTERNATIONAL_PASSPORT,
      KYC_ID_TYPES.DRIVERS_LICENSE,
      KYC_ID_TYPES.VOTERS_CARD,
    ],
    {
      message:
        'id_type must be one of: nin, international_passport, drivers_license, voters_card.',
    }
  ),
  id_number: z
    .string()
    .trim()
    .min(3, 'ID number must be at least 3 characters long.')
    .max(60, 'ID number must not exceed 60 characters.'),
  proof_type: z.enum(
    [
      LANDLORD_PROOF_TYPES.UTILITY_BILL,
      LANDLORD_PROOF_TYPES.C_OF_O,
      LANDLORD_PROOF_TYPES.DEED_OF_ASSIGNMENT,
      LANDLORD_PROOF_TYPES.SURVEY_PLAN,
      LANDLORD_PROOF_TYPES.GOVERNORS_CONSENT,
    ],
    {
      message:
        'proof_type must be one of: utility_bill, c_of_o, deed_of_assignment, survey_plan, governors_consent.',
    }
  ),
  residential_address: z
    .string()
    .trim()
    .min(5, 'Residential address must be at least 5 characters long.')
    .max(250, 'Residential address must not exceed 250 characters.'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters long.')
    .max(100),
  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters long.')
    .max(100),
})

export const createAdminSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100, 'Full name must not exceed 100 characters.'),
    email: baseEmailField,
    password: basePasswordField,
    phone: z
      .string()
      .trim()
      .min(7, 'Please provide a valid phone number.')
      .optional(),
  })
  .strict()

export const updateAdminSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100)
      .optional(),
    phone: z.string().trim().min(7).nullable().optional(),
    avatar_url: z.url('Avatar URL must be a valid URL.').nullable().optional(),
  })
  .strict()

export const kycListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      VERIFICATION_STATUSES.PENDING,
      VERIFICATION_STATUSES.APPROVED,
      VERIFICATION_STATUSES.REJECTED,
    ])
    .optional(),
})

export const reviewKycSchema = z
  .object({
    status: z.enum(
      [VERIFICATION_STATUSES.APPROVED, VERIFICATION_STATUSES.REJECTED],
      {
        message: 'status must be either approved or rejected.',
      }
    ),
    rejection_reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.status === VERIFICATION_STATUSES.REJECTED &&
      (!data.rejection_reason || data.rejection_reason.length < 3)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['rejection_reason'],
        message: 'A rejection_reason is required when rejecting KYC.',
      })
    }
  })

export const updateAdminSuspensionSchema = z
  .object({
    is_suspended: z.boolean({
      message: 'is_suspended must be a boolean.',
    }),
  })
  .strict()

export type CreateStateInput = z.infer<typeof createStateSchema>
export type UpdateStateInput = z.infer<typeof updateStateSchema>
export type CreateCityInput = z.infer<typeof createCitySchema>
export type UpdateCityInput = z.infer<typeof updateCitySchema>
export type CityListQueryInput = z.infer<typeof cityListQuerySchema>

export type CreatePropertyTypeInput = z.infer<typeof createPropertyTypeSchema>
export type UpdatePropertyTypeInput = z.infer<typeof updatePropertyTypeSchema>
export type PropertyTypeListQueryInput = z.infer<
  typeof propertyTypeListQuerySchema
>

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
export type UpdateListingAvailabilityInput = z.infer<
  typeof updateListingAvailabilitySchema
>
export type ReviewListingInput = z.infer<typeof reviewListingSchema>
export type ListingSearchQueryInput = z.infer<typeof listingSearchQuerySchema>
export type AdminListingListQueryInput = z.infer<
  typeof adminListingListQuerySchema
>

// Locations (States & Cities)
export const createStateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'State name must be at least 2 characters long.')
      .max(100),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(
        /^[a-z0-9-]+$/,
        'Slug must only contain lowercase letters, numbers, and hyphens.'
      )
      .optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const updateStateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const createCitySchema = z
  .object({
    state_id: z.string().min(1, 'State ID is required.'),
    name: z
      .string()
      .trim()
      .min(2, 'City name must be at least 2 characters long.')
      .max(100),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(
        /^[a-z0-9-]+$/,
        'Slug must only contain lowercase letters, numbers, and hyphens.'
      )
      .optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const updateCitySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const cityListQuerySchema = z.object({
  state_id: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
})

// Property Types
export const createPropertyTypeSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(
        /^[a-z0-9_]+$/,
        'Slug must only contain lowercase letters, numbers, and underscores.'
      ),
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long.')
      .max(100),
    category: z.enum([
      PROPERTY_CATEGORIES.RESIDENTIAL,
      PROPERTY_CATEGORIES.COMMERCIAL,
      PROPERTY_CATEGORIES.LAND,
    ]),
    description: z.string().trim().max(1000).optional(),
    default_bedrooms: z.number().int().min(0).max(50).optional(),
    display_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const updatePropertyTypeSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    category: z
      .enum([
        PROPERTY_CATEGORIES.RESIDENTIAL,
        PROPERTY_CATEGORIES.COMMERCIAL,
        PROPERTY_CATEGORIES.LAND,
      ])
      .optional(),
    description: z.string().trim().max(1000).optional(),
    default_bedrooms: z.number().int().min(0).max(50).optional(),
    display_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const propertyTypeListQuerySchema = z.object({
  category: z
    .enum([
      PROPERTY_CATEGORIES.RESIDENTIAL,
      PROPERTY_CATEGORIES.COMMERCIAL,
      PROPERTY_CATEGORIES.LAND,
    ])
    .optional(),
  is_active: z.enum(['true', 'false']).optional(),
})

// Listings
export const createListingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, 'Title must be at least 5 characters long.')
      .max(180),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters long.')
      .max(5000),
    classification: z.enum([
      LISTING_CLASSIFICATIONS.RENT,
      LISTING_CLASSIFICATIONS.SALE,
    ]),
    property_type_id: z.string().min(1, 'Property type is required.'),
    state_id: z.string().min(1, 'State is required.'),
    city_id: z.string().min(1, 'City is required.'),
    area: z
      .string()
      .trim()
      .min(2, 'Area / landmark must be at least 2 characters long.')
      .max(120),
    address: z
      .string()
      .trim()
      .min(3, 'Address must be at least 3 characters long.')
      .max(250),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    base_price: z
      .number()
      .int()
      .positive('Base price must be a positive amount in Naira.'),
    payment_frequency: z
      .enum([
        PAYMENT_FREQUENCIES.YEARLY,
        PAYMENT_FREQUENCIES.MONTHLY,
        PAYMENT_FREQUENCIES.ONE_TIME,
      ])
      .default(PAYMENT_FREQUENCIES.YEARLY),
    agency_fee: z.number().int().nonnegative().optional().default(0),
    legal_fee: z.number().int().nonnegative().optional().default(0),
    caution_fee: z.number().int().nonnegative().optional().default(0),
    service_charge: z.number().int().nonnegative().optional().default(0),
    bedrooms: z.number().int().min(0).max(50).optional().default(1),
    bathrooms: z.number().int().min(0).max(50).optional().default(1),
    toilets: z.number().int().min(0).max(50).optional().default(1),
    amenities: z.array(z.string().trim().min(1)).optional().default([]),
    images: z
      .array(z.string().url('Image must be a valid URL.'))
      .min(3, 'At least 3 property photos are required.')
      .max(10, 'A maximum of 10 photos are allowed.'),
    video_tour_url: z.string().url().nullable().optional(),
  })
  .strict()

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(5).max(180).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    classification: z
      .enum([LISTING_CLASSIFICATIONS.RENT, LISTING_CLASSIFICATIONS.SALE])
      .optional(),
    property_type_id: z.string().min(1).optional(),
    state_id: z.string().min(1).optional(),
    city_id: z.string().min(1).optional(),
    area: z.string().trim().min(2).max(120).optional(),
    address: z.string().trim().min(3).max(250).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    base_price: z.number().int().positive().optional(),
    payment_frequency: z
      .enum([
        PAYMENT_FREQUENCIES.YEARLY,
        PAYMENT_FREQUENCIES.MONTHLY,
        PAYMENT_FREQUENCIES.ONE_TIME,
      ])
      .optional(),
    agency_fee: z.number().int().nonnegative().optional(),
    legal_fee: z.number().int().nonnegative().optional(),
    caution_fee: z.number().int().nonnegative().optional(),
    service_charge: z.number().int().nonnegative().optional(),
    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(50).optional(),
    toilets: z.number().int().min(0).max(50).optional(),
    amenities: z.array(z.string().trim().min(1)).optional(),
    images: z.array(z.string().url()).min(3).max(10).optional(),
    video_tour_url: z.string().url().nullable().optional(),
  })
  .strict()

export const updateListingAvailabilitySchema = z
  .object({
    availability_status: z.enum(
      [
        AVAILABILITY_STATUSES.AVAILABLE,
        AVAILABILITY_STATUSES.RENTED,
        AVAILABILITY_STATUSES.SOLD,
        AVAILABILITY_STATUSES.UNAVAILABLE,
      ],
      {
        message:
          'availability_status must be one of: available, rented, sold, unavailable.',
      }
    ),
  })
  .strict()

export const reviewListingSchema = z
  .object({
    status: z.enum(
      [
        MODERATION_STATUSES.APPROVED,
        MODERATION_STATUSES.REJECTED,
        MODERATION_STATUSES.SUSPENDED,
      ],
      {
        message: 'status must be one of: approved, rejected, suspended.',
      }
    ),
    rejection_reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      (data.status === MODERATION_STATUSES.REJECTED ||
        data.status === MODERATION_STATUSES.SUSPENDED) &&
      (!data.rejection_reason || data.rejection_reason.length < 3)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['rejection_reason'],
        message:
          'A rejection_reason is required when rejecting or suspending a listing.',
      })
    }
  })

export const listingSearchQuerySchema = paginationQuerySchema.extend({
  state_id: z.string().optional(),
  city_id: z.string().optional(),
  city_slug: z.string().optional(),
  classification: z
    .enum([LISTING_CLASSIFICATIONS.RENT, LISTING_CLASSIFICATIONS.SALE])
    .optional(),
  property_type_id: z.string().optional(),
  property_type_slug: z.string().optional(),
  category: z
    .enum([
      PROPERTY_CATEGORIES.RESIDENTIAL,
      PROPERTY_CATEGORIES.COMMERCIAL,
      PROPERTY_CATEGORIES.LAND,
    ])
    .optional(),
  min_price: z.coerce.number().int().nonnegative().optional(),
  max_price: z.coerce.number().int().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().optional(),
  verified_only: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z
    .enum(['newest', 'price_asc', 'price_desc', 'rating_desc'])
    .default('newest'),
})

export const adminListingListQuerySchema = paginationQuerySchema.extend({
  moderation_status: z
    .enum([
      MODERATION_STATUSES.PENDING_REVIEW,
      MODERATION_STATUSES.APPROVED,
      MODERATION_STATUSES.REJECTED,
      MODERATION_STATUSES.SUSPENDED,
    ])
    .optional(),
  availability_status: z
    .enum([
      AVAILABILITY_STATUSES.AVAILABLE,
      AVAILABILITY_STATUSES.RENTED,
      AVAILABILITY_STATUSES.SOLD,
      AVAILABILITY_STATUSES.UNAVAILABLE,
    ])
    .optional(),
  city_id: z.string().optional(),
  lister_role: z.enum([LISTER_ROLES.AGENT, LISTER_ROLES.LANDLORD]).optional(),
})

export type RegisterSeekerInput = z.infer<typeof registerSeekerSchema>
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>
export type RegisterLandlordInput = z.infer<typeof registerLandlordSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResendVerificationCodeInput = z.infer<
  typeof resendVerificationCodeSchema
>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateSeekerInput = z.infer<typeof updateSeekerSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
export type UpdateLandlordInput = z.infer<typeof updateLandlordSchema>
export type SubmitAgentKycFieldsInput = z.infer<
  typeof submitAgentKycFieldsSchema
>
export type SubmitLandlordKycFieldsInput = z.infer<
  typeof submitLandlordKycFieldsSchema
>
export type CreateAdminInput = z.infer<typeof createAdminSchema>
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>
export type KycListQueryInput = z.infer<typeof kycListQuerySchema>
export type ReviewKycInput = z.infer<typeof reviewKycSchema>
export type UpdateAdminSuspensionInput = z.infer<
  typeof updateAdminSuspensionSchema
>
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>

// =============================================================================
// Inspection Booking & Scheduling Validation Schemas
// =============================================================================

export const updateInspectionSettingsSchema = z.object({
  slot_duration_minutes: z
    .number()
    .int()
    .min(15, 'Slot duration must be at least 15 minutes.')
    .max(180, 'Slot duration cannot exceed 180 minutes.')
    .optional(),
  max_bookings_per_slot: z
    .number()
    .int()
    .min(1, 'Max bookings per slot must be at least 1.')
    .max(20, 'Max bookings per slot cannot exceed 20.')
    .optional(),
  min_notice_hours: z
    .number()
    .int()
    .min(0, 'Minimum notice hours cannot be negative.')
    .max(168, 'Minimum notice hours cannot exceed 168 (7 days).')
    .optional(),
  accepts_virtual: z.boolean().optional(),
})

export const availabilityWindowItemSchema = z.object({
  day_of_week: z
    .number()
    .int()
    .min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday).')
    .max(6, 'Day of week must be between 0 and 6.'),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:MM format (24-hour).'),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:MM format (24-hour).'),
  is_active: z.boolean().default(true),
})

export const setAvailabilityWindowsSchema = z.object({
  windows: z
    .array(availabilityWindowItemSchema)
    .max(28, 'Cannot specify more than 28 time windows.'),
})

export const createBlockedDateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  reason: z.string().trim().max(255).optional(),
})

export const updateListingInspectionOptionsSchema = z.object({
  inspection_fee: z
    .number()
    .int()
    .min(0, 'Inspection fee cannot be negative.')
    .optional(),
  allows_physical_inspection: z.boolean().optional(),
  allows_virtual_inspection: z.boolean().optional(),
})

export const createInspectionBookingSchema = z.object({
  listing_id: z.string().min(1, 'Listing ID is required.'),
  mode: z.enum([INSPECTION_MODES.PHYSICAL, INSPECTION_MODES.VIRTUAL]),
  virtual_method: z
    .enum([
      VIRTUAL_INSPECTION_METHODS.LIVE_VIDEO_CALL,
      VIRTUAL_INSPECTION_METHODS.RECORDED_WALKTHROUGH,
    ])
    .optional(),
  scheduled_at: z
    .string()
    .min(1, 'Scheduled date & time is required.')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduled_at must be a valid ISO-8601 date string.',
    }),
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters.').optional(),
})

export const confirmInspectionBookingSchema = z.object({
  meeting_link: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  recorded_video_url: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  lister_note: z.string().trim().max(500).optional(),
})

export const declineInspectionBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Decline reason must be at least 3 characters long.')
    .max(500, 'Decline reason cannot exceed 500 characters.'),
})

export const proposeRescheduleSchema = z.object({
  proposed_at: z
    .string()
    .min(1, 'Proposed date & time is required.')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'proposed_at must be a valid ISO-8601 date string.',
    }),
  reason: z.string().trim().max(500).optional(),
})

export const rejectRescheduleSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const cancelInspectionBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const updateVirtualDetailsSchema = z.object({
  virtual_method: z
    .enum([
      VIRTUAL_INSPECTION_METHODS.LIVE_VIDEO_CALL,
      VIRTUAL_INSPECTION_METHODS.RECORDED_WALKTHROUGH,
    ])
    .optional(),
  meeting_link: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  recorded_video_url: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
})

export const updateInspectionFeeStatusSchema = z.object({
  fee_status: z.enum([
    INSPECTION_FEE_STATUSES.PAID,
    INSPECTION_FEE_STATUSES.WAIVED,
    INSPECTION_FEE_STATUSES.UNPAID,
  ]),
  note: z.string().trim().max(255).optional(),
})

export const adminRescheduleInspectionSchema = z.object({
  scheduled_at: z
    .string()
    .min(1, 'Scheduled date & time is required.')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduled_at must be a valid ISO-8601 date string.',
    }),
  reason: z
    .string()
    .trim()
    .min(3, 'Reschedule reason is required for administrative audit.')
    .max(500),
})

export const adminOverrideInspectionStatusSchema = z.object({
  status: z.enum([
    INSPECTION_STATUSES.PENDING,
    INSPECTION_STATUSES.CONFIRMED,
    INSPECTION_STATUSES.DECLINED,
    INSPECTION_STATUSES.CANCELLED,
    INSPECTION_STATUSES.COMPLETED,
    INSPECTION_STATUSES.NO_SHOW,
    INSPECTION_STATUSES.EXPIRED,
  ]),
  reason: z
    .string()
    .trim()
    .min(3, 'Override reason is required for administrative audit.')
    .max(500),
})

export const adminOverrideFeeStatusSchema = z.object({
  fee_status: z.enum([
    INSPECTION_FEE_STATUSES.NOT_REQUIRED,
    INSPECTION_FEE_STATUSES.UNPAID,
    INSPECTION_FEE_STATUSES.PAID,
    INSPECTION_FEE_STATUSES.WAIVED,
  ]),
  reason: z
    .string()
    .trim()
    .min(3, 'Reason is required for administrative audit.')
    .max(500),
})

export const adminCancelInspectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason is required for administrative audit.')
    .max(500),
})

export const inspectionBookingQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  listing_id: z.string().optional(),
})

export const adminInspectionQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  lister_role: z.enum([LISTER_ROLES.AGENT, LISTER_ROLES.LANDLORD]).optional(),
  listing_id: z.string().optional(),
  seeker_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const inspectionSlotsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export type UpdateInspectionSettingsInput = z.infer<
  typeof updateInspectionSettingsSchema
>
export type SetAvailabilityWindowsInput = z.infer<
  typeof setAvailabilityWindowsSchema
>
export type CreateBlockedDateInput = z.infer<typeof createBlockedDateSchema>
export type UpdateListingInspectionOptionsInput = z.infer<
  typeof updateListingInspectionOptionsSchema
>
export type CreateInspectionBookingInput = z.infer<
  typeof createInspectionBookingSchema
>
export type ConfirmInspectionBookingInput = z.infer<
  typeof confirmInspectionBookingSchema
>
export type DeclineInspectionBookingInput = z.infer<
  typeof declineInspectionBookingSchema
>
export type ProposeRescheduleInput = z.infer<typeof proposeRescheduleSchema>
export type RejectRescheduleInput = z.infer<typeof rejectRescheduleSchema>
export type CancelInspectionBookingInput = z.infer<
  typeof cancelInspectionBookingSchema
>
export type UpdateVirtualDetailsInput = z.infer<
  typeof updateVirtualDetailsSchema
>
export type UpdateInspectionFeeStatusInput = z.infer<
  typeof updateInspectionFeeStatusSchema
>
export type AdminRescheduleInspectionInput = z.infer<
  typeof adminRescheduleInspectionSchema
>
export type AdminOverrideInspectionStatusInput = z.infer<
  typeof adminOverrideInspectionStatusSchema
>
export type AdminOverrideFeeStatusInput = z.infer<
  typeof adminOverrideFeeStatusSchema
>
export type AdminCancelInspectionInput = z.infer<
  typeof adminCancelInspectionSchema
>
export type InspectionBookingQueryInput = z.infer<
  typeof inspectionBookingQuerySchema
>
export type AdminInspectionQueryInput = z.infer<
  typeof adminInspectionQuerySchema
>
export type InspectionSlotsQueryInput = z.infer<
  typeof inspectionSlotsQuerySchema
>

// ============================================================================
// FAVORITES & SAVED PROPERTIES VALIDATION
// ============================================================================

export const saveFavoriteSchema = z.object({
  listing_id: z.string().uuid('Listing ID must be a valid UUID.'),
})

export const favoritesQuerySchema = paginationQuerySchema.extend({
  availability_status: z
    .enum([
      AVAILABILITY_STATUSES.AVAILABLE,
      AVAILABILITY_STATUSES.RENTED,
      AVAILABILITY_STATUSES.SOLD,
      AVAILABILITY_STATUSES.UNAVAILABLE,
    ])
    .optional(),
})

export type SaveFavoriteInput = z.infer<typeof saveFavoriteSchema>
export type FavoritesQueryInput = z.infer<typeof favoritesQuerySchema>

// ============================================================================
// INQUIRIES & MESSAGING VALIDATION
// ============================================================================

export const createInquirySchema = z.object({
  listing_id: z.string().uuid('Listing ID must be a valid UUID.'),
  subject: z
    .string()
    .trim()
    .max(150, 'Subject cannot exceed 150 characters.')
    .optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message cannot exceed 2000 characters.'),
})

export const sendInquiryMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message cannot exceed 2000 characters.'),
})

export const inquiryListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      INQUIRY_STATUSES.OPEN,
      INQUIRY_STATUSES.RESPONDED,
      INQUIRY_STATUSES.CLOSED,
    ])
    .optional(),
  listing_id: z.string().uuid('Listing ID must be a valid UUID.').optional(),
  unread_only: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export const inquiryDetailQuerySchema = z.object({
  after: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'after must be a valid ISO-8601 timestamp.',
    })
    .optional(),
})

export const adminInquiryQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      INQUIRY_STATUSES.OPEN,
      INQUIRY_STATUSES.RESPONDED,
      INQUIRY_STATUSES.CLOSED,
    ])
    .optional(),
  listing_id: z.string().uuid('Listing ID must be a valid UUID.').optional(),
  lister_role: z.enum([LISTER_ROLES.AGENT, LISTER_ROLES.LANDLORD]).optional(),
})

export type CreateInquiryInput = z.infer<typeof createInquirySchema>
export type SendInquiryMessageInput = z.infer<typeof sendInquiryMessageSchema>
export type InquiryListQueryInput = z.infer<typeof inquiryListQuerySchema>
export type InquiryDetailQueryInput = z.infer<typeof inquiryDetailQuerySchema>
export type AdminInquiryQueryInput = z.infer<typeof adminInquiryQuerySchema>

// ============================================================================
// LISTING-LEVEL PROPERTY VERIFICATION VALIDATION
// ============================================================================

export const submitPropertyVerificationSchema = z
  .object({
    verification_method: z.enum([
      PROPERTY_VERIFICATION_METHODS.DOCUMENT,
      PROPERTY_VERIFICATION_METHODS.PHYSICAL_INSPECTION,
      PROPERTY_VERIFICATION_METHODS.BOTH,
    ]),
    document_type: z
      .enum([
        PROPERTY_VERIFICATION_DOC_TYPES.C_OF_O,
        PROPERTY_VERIFICATION_DOC_TYPES.DEED_OF_ASSIGNMENT,
        PROPERTY_VERIFICATION_DOC_TYPES.SURVEY_PLAN,
        PROPERTY_VERIFICATION_DOC_TYPES.GOVERNORS_CONSENT,
        PROPERTY_VERIFICATION_DOC_TYPES.TENANCY_AUTHORITY,
        PROPERTY_VERIFICATION_DOC_TYPES.UTILITY_BILL,
      ])
      .optional(),
    document_urls: z
      .array(z.string().url('Each document_url must be a valid URL.'))
      .max(10, 'Maximum 10 documents allowed per submission.')
      .optional(),
    site_contact_name: z.string().trim().min(2).max(100).optional(),
    site_contact_phone: z.string().trim().min(7).max(20).optional(),
    preferred_inspection_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'preferred_inspection_date must be YYYY-MM-DD.')
      .optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const needsDoc =
      data.verification_method === PROPERTY_VERIFICATION_METHODS.DOCUMENT ||
      data.verification_method === PROPERTY_VERIFICATION_METHODS.BOTH
    const needsPhysical =
      data.verification_method ===
        PROPERTY_VERIFICATION_METHODS.PHYSICAL_INSPECTION ||
      data.verification_method === PROPERTY_VERIFICATION_METHODS.BOTH

    if (needsDoc) {
      if (!data.document_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['document_type'],
          message: 'document_type is required for document verification.',
        })
      }
      if (!data.document_urls || data.document_urls.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['document_urls'],
          message:
            'At least one uploaded document URL is required for document verification.',
        })
      }
    }

    if (needsPhysical && !data.site_contact_phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['site_contact_phone'],
        message:
          'site_contact_phone is required for physical site inspection verification.',
      })
    }
  })

export const adminPropertyVerificationQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      VERIFICATION_STATUSES.PENDING,
      VERIFICATION_STATUSES.APPROVED,
      VERIFICATION_STATUSES.REJECTED,
    ])
    .optional(),
  verification_method: z
    .enum([
      PROPERTY_VERIFICATION_METHODS.DOCUMENT,
      PROPERTY_VERIFICATION_METHODS.PHYSICAL_INSPECTION,
      PROPERTY_VERIFICATION_METHODS.BOTH,
    ])
    .optional(),
})

export const adminReviewPropertyVerificationSchema = z
  .object({
    decision: z.enum([
      VERIFICATION_STATUSES.APPROVED,
      VERIFICATION_STATUSES.REJECTED,
    ]),
    badge: z
      .enum([
        PROPERTY_VERIFICATION_BADGES.VERIFIED_PROPERTY,
        PROPERTY_VERIFICATION_BADGES.ORUVIA_INSPECTED,
      ])
      .optional(),
    rejection_reason: z.string().trim().min(5).max(500).optional(),
    admin_notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.decision === VERIFICATION_STATUSES.REJECTED &&
      !data.rejection_reason
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejection_reason'],
        message: 'rejection_reason is required when rejecting a submission.',
      })
    }
  })

export type SubmitPropertyVerificationInput = z.infer<
  typeof submitPropertyVerificationSchema
>
export type AdminPropertyVerificationQueryInput = z.infer<
  typeof adminPropertyVerificationQuerySchema
>
export type AdminReviewPropertyVerificationInput = z.infer<
  typeof adminReviewPropertyVerificationSchema
>

export const createReviewSchema = z
  .object({
    target_type: z.enum([
      REVIEW_TARGET_TYPES.LISTING,
      REVIEW_TARGET_TYPES.LISTER,
    ]),
    listing_id: z.string().trim().min(1).optional(),
    lister_type: z
      .enum([LISTER_ROLES.AGENT, LISTER_ROLES.LANDLORD])
      .optional(),
    lister_id: z.string().trim().min(1).optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.target_type === REVIEW_TARGET_TYPES.LISTING && !data.listing_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['listing_id'],
        message: 'listing_id is required when target_type is listing.',
      })
    }
    if (data.target_type === REVIEW_TARGET_TYPES.LISTER) {
      if (!data.lister_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lister_type'],
          message: 'lister_type is required when target_type is lister.',
        })
      }
      if (!data.lister_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lister_id'],
          message: 'lister_id is required when target_type is lister.',
        })
      }
    }
  })

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .refine(
    (data) => data.rating !== undefined || data.comment !== undefined,
    'Provide at least one field (rating or comment) to update.'
  )

export const replyToReviewSchema = z.object({
  reply_text: z.string().trim().min(1).max(1000),
})

export const publicReviewListQuerySchema = paginationQuerySchema.extend({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verified_only: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort: z.enum(['newest', 'highest', 'lowest']).default('newest'),
})

export const listerReviewListQuerySchema = paginationQuerySchema.extend({
  target_type: z
    .enum([REVIEW_TARGET_TYPES.LISTING, REVIEW_TARGET_TYPES.LISTER])
    .optional(),
  has_reply: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

export const adminReviewListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([REVIEW_STATUSES.PUBLISHED, REVIEW_STATUSES.HIDDEN])
    .optional(),
  target_type: z
    .enum([REVIEW_TARGET_TYPES.LISTING, REVIEW_TARGET_TYPES.LISTER])
    .optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  is_verified_inspection: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().trim().optional(),
})

export const adminModerateReviewSchema = z.object({
  action: z.enum(['hide', 'restore']),
  reason: z.string().trim().min(3).max(500).optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>
export type PublicReviewListQueryInput = z.infer<
  typeof publicReviewListQuerySchema
>
export type ListerReviewListQueryInput = z.infer<
  typeof listerReviewListQuerySchema
>
export type AdminReviewListQueryInput = z.infer<
  typeof adminReviewListQuerySchema
>
export type AdminModerateReviewInput = z.infer<typeof adminModerateReviewSchema>
