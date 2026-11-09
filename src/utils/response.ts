import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { PAGINATION_DEFAULTS } from '../config/constants'
import type { ErrorCode, ErrorDetail } from './errors'

export interface PaginationMeta {
  page: number
  per_page: number
  total_records: number
  total_pages: number
}

export function buildPaginationMeta(
  page: number = PAGINATION_DEFAULTS.PAGE,
  perPage: number = PAGINATION_DEFAULTS.PER_PAGE,
  totalRecords: number = 0
): PaginationMeta {
  const safePage = Math.max(1, page)
  const safePerPage = Math.min(
    PAGINATION_DEFAULTS.MAX_PER_PAGE,
    Math.max(1, perPage)
  )
  const totalPages =
    totalRecords === 0 ? 0 : Math.ceil(totalRecords / safePerPage)

  return {
    page: safePage,
    per_page: safePerPage,
    total_records: totalRecords,
    total_pages: totalPages,
  }
}

export function getPaginationOffset(
  page: number = PAGINATION_DEFAULTS.PAGE,
  perPage: number = PAGINATION_DEFAULTS.PER_PAGE
) {
  const safePage = Math.max(1, page)
  const safePerPage = Math.min(
    PAGINATION_DEFAULTS.MAX_PER_PAGE,
    Math.max(1, perPage)
  )
  return {
    page: safePage,
    per_page: safePerPage,
    limit: safePerPage,
    offset: (safePage - 1) * safePerPage,
  }
}

export function sendSuccess(
  c: Context,
  data: unknown = null,
  statusCode: ContentfulStatusCode = 200
) {
  return c.json(
    {
      success: true,
      data,
    },
    statusCode
  )
}

export function sendCreated(c: Context, data: unknown = null) {
  return sendSuccess(c, data, 201)
}

export function sendPaginated(
  c: Context,
  data: unknown[],
  pagination: { page: number; per_page: number; total_records: number }
) {
  return c.json(
    {
      success: true,
      data,
      meta: buildPaginationMeta(
        pagination.page,
        pagination.per_page,
        pagination.total_records
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
  details?: ErrorDetail[]
) {
  return c.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    },
    statusCode
  )
}
