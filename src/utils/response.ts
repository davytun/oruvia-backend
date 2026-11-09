import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { PAGINATION_DEFAULTS } from '../config/constants'
import type { ErrorCode } from './errors'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function buildPaginationMeta(
  page: number = PAGINATION_DEFAULTS.PAGE,
  limit: number = PAGINATION_DEFAULTS.LIMIT,
  total: number = 0
): PaginationMeta {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, limit)
  )
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))

  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  }
}

export function getPaginationOffset(
  page: number = PAGINATION_DEFAULTS.PAGE,
  limit: number = PAGINATION_DEFAULTS.LIMIT
) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, limit)
  )
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  }
}

export function sendSuccess(
  c: Context,
  data: unknown = null,
  message = 'Success',
  statusCode: ContentfulStatusCode = 200
) {
  return c.json(
    {
      success: true,
      message,
      data,
    },
    statusCode
  )
}

export function sendCreated(
  c: Context,
  data: unknown = null,
  message = 'Resource created successfully'
) {
  return sendSuccess(c, data, message, 201)
}

export function sendPaginated(
  c: Context,
  data: unknown[],
  pagination: { page: number; limit: number; total: number },
  message = 'Success'
) {
  return c.json(
    {
      success: true,
      message,
      data,
      meta: buildPaginationMeta(
        pagination.page,
        pagination.limit,
        pagination.total
      ),
    },
    200
  )
}

export function sendError(
  c: Context,
  message: string,
  statusCode: ContentfulStatusCode = 500,
  code: ErrorCode | string = 'INTERNAL_SERVER_ERROR',
  details?: unknown
) {
  return c.json(
    {
      success: false,
      message,
      error: {
        code,
        ...(details !== undefined ? { details } : {}),
      },
    },
    statusCode
  )
}
