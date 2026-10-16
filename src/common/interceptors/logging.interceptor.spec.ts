import { Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor.js';

function context(type = 'http') {
  const req = { method: 'GET', path: '/api/v1/health', url: '/api/v1/health?code=987654' };
  const res = { statusCode: 200, locals: { requestId: 'req-12345678' } };
  return {
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('logs method, path, status, duration and request ID without the query string', async () => {
    const next: CallHandler = { handle: () => of({ ok: true }) };

    const result = await lastValueFrom(
      new LoggingInterceptor().intercept(context(), next),
    );

    expect(result).toEqual({ ok: true });
    expect(log).toHaveBeenCalledOnce();
    const line = log.mock.calls[0][0] as string;
    expect(line).toMatch(/^\[req-12345678\] GET \/api\/v1\/health 200 \d+ms$/);
    expect(line).not.toContain('987654');
  });

  it('does not log failures (the exception filter owns those)', async () => {
    const next: CallHandler = { handle: () => throwError(() => new Error('x')) };

    await expect(
      lastValueFrom(new LoggingInterceptor().intercept(context(), next)),
    ).rejects.toThrow('x');
    expect(log).not.toHaveBeenCalled();
  });

  it('ignores non-HTTP contexts', async () => {
    const next: CallHandler = { handle: () => of(1) };

    await lastValueFrom(new LoggingInterceptor().intercept(context('rpc'), next));

    expect(log).not.toHaveBeenCalled();
  });
});
