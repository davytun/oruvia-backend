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

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startTime =
      (req as Request & { _startTime?: number })._startTime ??
      performance.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Math.round(performance.now() - startTime);
        const requestId = getRequestId(res);
        const method = req.method;
        const path = req.path || (req.url ? req.url.split('?')[0] : '/');
        const statusCode = res.statusCode;
        const clientIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

        const summary = `[${requestId}] ${method} ${path} ${statusCode} ${ms}ms`;
        this.logger.log(summary);
      }),
    );
  }
}
