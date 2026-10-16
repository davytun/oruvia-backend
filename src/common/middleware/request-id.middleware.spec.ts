import type { NextFunction, Request, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  getRequestId,
  requestIdMiddleware,
} from './request-id.middleware.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function run(inboundId?: string) {
  const req = {
    get: (name: string) =>
      name === REQUEST_ID_HEADER ? inboundId : undefined,
  } as unknown as Request;
  const headers: Record<string, string> = {};
  const res = {
    locals: {},
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;

  requestIdMiddleware(req, res, next);
  return { res, headers, next };
}

describe('requestIdMiddleware', () => {
  it('generates a UUID when none is supplied and sets the response header', () => {
    const { res, headers, next } = run();

    expect(getRequestId(res)).toMatch(UUID);
    expect(headers[REQUEST_ID_HEADER]).toBe(getRequestId(res));
    expect(next).toHaveBeenCalledOnce();
  });

  it('reuses a well-formed inbound ID', () => {
    const { res, headers } = run('gateway-trace.123_abc');

    expect(getRequestId(res)).toBe('gateway-trace.123_abc');
    expect(headers[REQUEST_ID_HEADER]).toBe('gateway-trace.123_abc');
  });

  it.each([
    ['too short', 'abc'],
    ['too long', 'a'.repeat(129)],
    ['containing whitespace/newlines', 'bad id\nINJECTED log line'],
  ])('replaces an inbound ID that is %s', (_label, inbound) => {
    const { res } = run(inbound);

    expect(getRequestId(res)).toMatch(UUID);
  });

  it('generates a different ID for each request', () => {
    expect(getRequestId(run().res)).not.toBe(getRequestId(run().res));
  });
});
