import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'

export interface ErrorDetail {
  field: string
  issue: string
}

export class AppError extends Error {
  public readonly statusCode: ContentfulStatusCode
  public readonly code: ErrorCode
  public readonly details?: ErrorDetail[]

  constructor(
    message: string,
    statusCode: ContentfulStatusCode = 500,
    code: ErrorCode = 'INTERNAL_SERVER_ERROR',
    details?: ErrorDetail[]
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.', details?: ErrorDetail[]) {
    super(message, 400, 'BAD_REQUEST', details)
  }
}

export class ValidationError extends AppError {
  constructor(
    details?: ErrorDetail[],
    message = 'The request entity contains invalid parameters.'
  ) {
    super(message, 400, 'VALIDATION_FAILED', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.', details?: ErrorDetail[]) {
    super(message, 401, 'UNAUTHORIZED', details)
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action.',
    details?: ErrorDetail[]
  ) {
    super(message, 403, 'FORBIDDEN', details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details?: ErrorDetail[]) {
    super(`${resource} not found.`, 404, 'NOT_FOUND', details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists.', details?: ErrorDetail[]) {
    super(message, 409, 'CONFLICT', details)
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message = 'The request entity contains invalid parameters.',
    details?: ErrorDetail[]
  ) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details)
  }
}
