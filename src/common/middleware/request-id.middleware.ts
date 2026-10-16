import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Only well-formed inbound IDs are trusted; anything else (too long, spaces,
// newlines, ...) is replaced so it can never be used for log injection.
const VALID_INBOUND_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Assigns every request a correlation ID. A valid `X-Request-Id` supplied by a
 * gateway/client is reused so traces line up across services; otherwise a UUID
 * is generated. The ID is echoed in the response header and stored in
 * `res.locals` for logs, interceptors and the exception filter.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.get(REQUEST_ID_HEADER);
  const requestId =
    inbound && VALID_INBOUND_ID.test(inbound) ? inbound : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

/** Reads the ID set by {@link requestIdMiddleware}. */
export function getRequestId(res: Response): string {
  return (res.locals?.requestId as string | undefined) ?? 'unknown';
}
