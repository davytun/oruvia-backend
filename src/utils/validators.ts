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
    const formattedErrors = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }))

    return sendError(
      c,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      formattedErrors
    )
  }
}

export const idParamSchema = z.object({
  id: z.string().min(1, 'Resource ID is required'),
})

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(PAGINATION_DEFAULTS.PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.MAX_LIMIT)
    .default(PAGINATION_DEFAULTS.LIMIT),
})
