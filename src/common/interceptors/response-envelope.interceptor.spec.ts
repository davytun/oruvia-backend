import {
  CallHandler,
  ExecutionContext,
  StreamableFile,
} from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { Readable } from 'node:stream';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor.js';

function run(
  payload: unknown,
  { statusCode = 200, headersSent = false, type = 'http' } = {},
) {
  const res = { statusCode, headersSent, locals: { requestId: 'req-12345678' } };
  const context = {
    getType: () => type,
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ExecutionContext;
  const next: CallHandler = { handle: () => of(payload) };

  return lastValueFrom(new ResponseEnvelopeInterceptor().intercept(context, next));
}

describe('ResponseEnvelopeInterceptor', () => {
  it('wraps results as { success, data, requestId }', async () => {
    await expect(run({ status: 'ok' })).resolves.toEqual({
      success: true,
      data: { status: 'ok' },
      requestId: 'req-12345678',
    });
  });

  it('wraps arrays and primitives', async () => {
    await expect(run([1, 2])).resolves.toMatchObject({ data: [1, 2] });
    await expect(run('text')).resolves.toMatchObject({ data: 'text' });
  });

  it('uses data: null when the handler returns nothing', async () => {
    await expect(run(undefined)).resolves.toMatchObject({
      success: true,
      data: null,
    });
  });

  it('does not wrap StreamableFile, Buffer or Readable streams', async () => {
    const file = new StreamableFile(Buffer.from('file'));
    const buffer = Buffer.from('raw');
    const stream = Readable.from(['chunk']);

    await expect(run(file)).resolves.toBe(file);
    await expect(run(buffer)).resolves.toBe(buffer);
    await expect(run(stream)).resolves.toBe(stream);
  });

  it.each([204, 205, 304])('does not wrap bodyless status %i', async (code) => {
    await expect(run(undefined, { statusCode: code })).resolves.toBeUndefined();
  });

  it('does not wrap when the handler already sent the response (@Res)', async () => {
    await expect(run(undefined, { headersSent: true })).resolves.toBeUndefined();
  });

  it('ignores non-HTTP contexts', async () => {
    await expect(run({ a: 1 }, { type: 'rpc' })).resolves.toEqual({ a: 1 });
  });
});
