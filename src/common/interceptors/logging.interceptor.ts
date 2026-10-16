import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import { getRequestId } from '../middleware/request-id.middleware.js';

/**
 * Logs one line per successfully handled request with its duration. Failed
 * requests are logged once by `AllExceptionsFilter`, so nothing is duplicated.
 * Only method, path (no query string), status and request ID are recorded.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = performance.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Math.round(performance.now() - startedAt);
        this.logger.log(
          `[${getRequestId(res)}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`,
        );
      }),
    );
  }
}
