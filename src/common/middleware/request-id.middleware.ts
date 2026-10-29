import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Only well-formed inbound IDs are trusted; anything else (too long, spaces,
// newlines, ...) is replaced so it can never be used for log injection.
export const VALID_INBOUND_ID = /^[A-Za-z0-9._-]{8,128}$/;

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.get(REQUEST_ID_HEADER);
  const requestId =
    inbound && VALID_INBOUND_ID.test(inbound) ? inbound : randomUUID();

  res.locals.requestId = requestId;
  (req as Request & { id?: string; _startTime?: number }).id = requestId;
  (req as Request & { id?: string; _startTime?: number })._startTime =
    performance.now();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function getRequestId(res: Response): string {
  return (res.locals?.requestId as string | undefined) ?? 'unknown';
}
