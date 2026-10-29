import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
import type { ApiSuccessResponse } from '../interfaces/api-response.interface.js';
import { getRequestId } from '../middleware/request-id.middleware.js';

// Statuses that must not carry a body.
const BODYLESS_STATUSES = new Set([204, 205, 304]);

function isRawPayload(data: unknown): boolean {
  return (
    data instanceof StreamableFile ||
    Buffer.isBuffer(data) ||
    (typeof data === 'object' &&
      data !== null &&
      typeof (data as { pipe?: unknown }).pipe === 'function')
  );
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (
          res.headersSent ||
          BODYLESS_STATUSES.has(res.statusCode) ||
          isRawPayload(data)
        ) {
          return data;
        }

        const body: ApiSuccessResponse = {
          success: true,
          data: data ?? null,
          requestId: getRequestId(res),
        };
        return body;
      }),
    );
  }
}
