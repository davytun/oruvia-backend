import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  ApiErrorDetail,
  ApiErrorResponse,
} from '../interfaces/api-response.interface.js';
import { getRequestId } from '../middleware/request-id.middleware.js';

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

const INTERNAL_MESSAGE = 'Internal server error';

// Nest's Express adapter rewrites body-parser `SyntaxError`s (invalid JSON) and
// `URIError`s into `BadRequestException(error.message)`, discarding the type.
// V8's JSON messages can quote part of the request body, so these are replaced
// with a fixed message before being returned or logged.
const PARSE_FAILURE_MESSAGE = /\bJSON\b|URI malformed/;

function defaultCode(statusCode: number): string {
  return HttpStatus[statusCode] ?? 'ERROR';
}

function statusPhrase(statusCode: number): string {
  const phrase = defaultCode(statusCode).toLowerCase().replaceAll('_', ' ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function fromHttpError(exception: unknown): NormalizedError | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined;
  const { status, statusCode } = exception as Record<string, unknown>;
  const code = typeof statusCode === 'number' ? statusCode : status;
  if (typeof code !== 'number' || code < 400 || code > 499) return undefined;

  return {
    statusCode: code,
    code: defaultCode(code),
    message: statusPhrase(code),
  };
}

function fromHttpException(exception: HttpException): NormalizedError {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return { statusCode, code: defaultCode(statusCode), message: response };
  }

  const body = response as Record<string, unknown>;
  let message = Array.isArray(body.message)
    ? body.message.join('; ')
    : typeof body.message === 'string'
      ? body.message
      : exception.message;

  if (
    statusCode === HttpStatus.TOO_MANY_REQUESTS &&
    message.includes('ThrottlerException')
  ) {
    message = 'Too many requests, please try again later.';
  }

  if (
    statusCode === HttpStatus.BAD_REQUEST &&
    typeof body.code !== 'string' &&
    PARSE_FAILURE_MESSAGE.test(message)
  ) {
    return {
      statusCode,
      code: 'MALFORMED_REQUEST',
      message: 'Malformed request',
    };
  }

  return {
    statusCode,
    code: typeof body.code === 'string' ? body.code : defaultCode(statusCode),
    message,
    details: Array.isArray(body.details)
      ? (body.details as ApiErrorDetail[])
      : undefined,
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = getRequestId(res);

    const error: NormalizedError =
      exception instanceof HttpException
        ? fromHttpException(exception)
        : (fromHttpError(exception) ?? {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            code: defaultCode(HttpStatus.INTERNAL_SERVER_ERROR),
            message: INTERNAL_MESSAGE,
          });

    this.log(exception, error, req, requestId);

    if (res.headersSent) return;

    const body: ApiErrorResponse = {
      success: false,
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId,
      timestamp: new Date().toISOString(),
    };
    res.status(error.statusCode).json(body);
  }

  private log(
    exception: unknown,
    error: NormalizedError,
    req: Request,
    requestId: string,
  ): void {
    const method = req.method;
    const path = req.path || (req.url ? req.url.split('?')[0] : '/');
    const clientIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const startTime = (req as Request & { _startTime?: number })._startTime;
    const durationMs =
      startTime !== undefined
        ? Math.round(performance.now() - startTime)
        : undefined;

    const summary = `[${requestId}] ${req.method} ${path} -> ${error.statusCode} ${error.code}`;

    if (error.statusCode < 500) {
      this.logger.warn(`${summary}: ${error.message}`);
      return;
    }

    // For 5xx, surface the underlying cause (e.g. the failed DB driver error).
    const cause =
      exception instanceof HttpException && exception.cause
        ? exception.cause
        : exception;
    const detail = cause instanceof Error ? cause.message : String(cause);
    const stack = cause instanceof Error ? cause.stack : undefined;
    this.logger.error(`${summary}: ${detail}`, stack);
  }
}
