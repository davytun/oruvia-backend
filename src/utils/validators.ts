import type { Context } from 'hono'
import { z } from 'zod'
import { PAGINATION_DEFAULTS } from '../config/constants'
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
      field: item.path.map(String).join('.'),
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
