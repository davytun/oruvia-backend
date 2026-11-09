import type { Context } from 'hono'
import { z } from 'zod'
import { AUTH_CONFIG, PAGINATION_DEFAULTS } from '../config/constants'
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

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters long.')
      .max(100, 'Full name must not exceed 100 characters.'),
    email: z
      .email('Please provide a valid email address.')
      .transform((val) => val.trim().toLowerCase()),
    password: z
      .string()
      .min(
        AUTH_CONFIG.MIN_PASSWORD_LENGTH,
        `Password must be at least ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters long.`
      )
      .max(
        AUTH_CONFIG.MAX_PASSWORD_LENGTH,
        `Password must not exceed ${AUTH_CONFIG.MAX_PASSWORD_LENGTH} characters.`
      ),
    phone: z.string().trim().min(7, 'Please provide a valid phone number.').optional(),
    role: z.enum(['seeker', 'agent', 'landlord']).default('seeker'),
    preferred_location: z.string().trim().max(120).optional(),
    agency_name: z.string().trim().max(120).optional(),
    license_number: z.string().trim().max(80).optional(),
    company_name: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(1000).optional(),
    whatsapp_number: z.string().trim().max(30).optional(),
  })
  .strict()

export const loginSchema = z
  .object({
    email: z
      .email('Please provide a valid email address.')
      .transform((val) => val.trim().toLowerCase()),
    password: z.string().min(1, 'Password is required.'),
  })
  .strict()

export const refreshTokenSchema = z
  .object({
    refresh_token: z.string().min(1, 'Refresh token is required.'),
  })
  .strict()

export const updateMeSchema = z
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

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: z
      .string()
      .min(
        AUTH_CONFIG.MIN_PASSWORD_LENGTH,
        `Password must be at least ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters long.`
      )
      .max(AUTH_CONFIG.MAX_PASSWORD_LENGTH),
  })
  .strict()

export const agentProfileSchema = z
  .object({
    agency_name: z.string().trim().max(120).optional(),
    license_number: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(1000).optional(),
    whatsapp_number: z.string().trim().max(30).optional(),
  })
  .strict()

export const landlordProfileSchema = z
  .object({
    company_name: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(1000).optional(),
    whatsapp_number: z.string().trim().max(30).optional(),
  })
  .strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type UpdateMeInput = z.infer<typeof updateMeSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type AgentProfileInput = z.infer<typeof agentProfileSchema>
export type LandlordProfileInput = z.infer<typeof landlordProfileSchema>
