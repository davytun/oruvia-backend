import type { Context } from 'hono'
import { z } from 'zod'
import {
  AUTH_CONFIG,
  KYC_ID_TYPES,
  LANDLORD_PROOF_TYPES,
  PAGINATION_DEFAULTS,
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
