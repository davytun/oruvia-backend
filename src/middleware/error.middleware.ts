import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import type { AppEnv } from '../config/env'
import { AppError } from '../utils/errors'
import { sendError } from '../utils/response'

/**
 * Global 404 Not Found handler
 */
export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return sendError(
    c,
    `Route ${c.req.method} ${c.req.path} not found`,
    404,
    'NOT_FOUND'
  )
}

/**
 * Global Error handler for AppError, ZodError, HTTPException, and unexpected errors
 */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return sendError(c, err.message, err.statusCode, err.code, err.details)
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
    return sendError(c, 'Validation failed', 400, 'VALIDATION_ERROR', details)
  }

  if (err instanceof HTTPException) {
    return sendError(
      c,
      err.message || 'HTTP Error',
      err.status as ContentfulStatusCode,
      'BAD_REQUEST'
    )
  }

  console.error('[UnhandledError]', err)
  const isDev = c.env?.APP_ENV === 'development'
  return sendError(
    c,
    isDev && err instanceof Error ? err.message : 'Internal server error',
    500,
    'INTERNAL_SERVER_ERROR'
  )
}

