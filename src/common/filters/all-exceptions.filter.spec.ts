import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function setup({ headersSent = false, path = '/api/v1/things' } = {}) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = {
    headersSent,
    locals: { requestId: 'req-12345678' },
    status,
  };
  const req = { method: 'POST', path };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    [new NotFoundException('Listing not found'), 404, 'NOT_FOUND'],
    [new ForbiddenException(), 403, 'FORBIDDEN'],
    [new ConflictException('Already exists'), 409, 'CONFLICT'],
  ])('preserves the status of %s', (exception, statusCode, code) => {
    const { host, status, json } = setup();

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(statusCode);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode,
        code,
        requestId: 'req-12345678',
        timestamp: expect.any(String),
      }),
    );
  });

  it('uses a custom code and message supplied by the exception', () => {
    const { host, json } = setup();

    filter.catch(
      new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'That email is already registered',
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'EMAIL_TAKEN',
        message: 'That email is already registered',
      }),
    );
  });

  it('returns validation details', () => {
    const { host, status, json } = setup();
    const details = [{ field: 'email', messages: ['email must be an email'] }];

    filter.catch(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_FAILED', details }),
    );
  });

  it('omits `details` when there are none', () => {
    const { host, json } = setup();

    filter.catch(new NotFoundException(), host);

    expect(json.mock.calls[0][0]).not.toHaveProperty('details');
  });

  it('turns unexpected errors into a generic 500 with no internals', () => {
    const { host, status, json } = setup();
    const secret = new Error(
      'select * from users where password = $1 at /srv/app/secret.ts:42',
    );

    filter.catch(secret, host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      success: false,
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      requestId: 'req-12345678',
    });
    expect(JSON.stringify(body)).not.toMatch(/select|password|secret|stack/i);
  });

  it('handles non-Error throwables as 500', () => {
    const { host, status } = setup();

    filter.catch('boom', host);

    expect(status).toHaveBeenCalledWith(500);
  });

  it('logs the real cause and stack of unexpected errors with the request ID', () => {
    const { host } = setup();
    const failure = new Error('connection terminated');

    filter.catch(failure, host);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('[req-12345678] POST /api/v1/things -> 500'),
      failure.stack,
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('connection terminated'),
      expect.anything(),
    );
  });

  it('logs the underlying cause of a 5xx HttpException but not to the client', () => {
    const { host, json } = setup();
    const cause = new Error('password authentication failed');

    filter.catch(
      new ServiceUnavailableException('Database unavailable', { cause }),
      host,
    );

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('password authentication failed'),
      cause.stack,
    );
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database unavailable',
    });
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('password');
  });

  it('logs expected client errors as warnings, not errors', () => {
    const { host } = setup();

    filter.catch(new NotFoundException('nope'), host);

    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it('logs the path without the query string', () => {
    const { host } = setup({ path: '/api/v1/verify' });

    filter.catch(new BadRequestException(), host);

    // `path` excludes the query, so codes like ?code=123456 never reach logs.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('POST /api/v1/verify ->'),
    );
  });

  it.each([
    [`Unexpected token 'x', "{secret:x}" is not valid JSON`],
    ['Expected double-quoted property name in JSON at position 20'],
    ['URI malformed'],
  ])(
    'replaces the parser message %j so request content is never echoed or logged',
    (parserMessage) => {
      // Nest's Express adapter delivers these as BadRequestException(message).
      const { host, status, json } = setup();

      filter.catch(new BadRequestException(parserMessage), host);

      expect(status).toHaveBeenCalledWith(400);
      expect(json.mock.calls[0][0]).toMatchObject({
        code: 'MALFORMED_REQUEST',
        message: 'Malformed request',
      });
      expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('secret');
      expect(warn).toHaveBeenCalledWith(
        expect.not.stringContaining('secret'),
      );
    },
  );

  it('does not treat developer-authored 400s or custom codes as parse failures', () => {
    const { host, json } = setup();

    filter.catch(new BadRequestException('Dates must be in the future'), host);
    filter.catch(
      new BadRequestException({ code: 'BAD_JSON_FIELD', message: 'JSON field invalid' }),
      host,
    );

    expect(json.mock.calls[0][0]).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Dates must be in the future',
    });
    expect(json.mock.calls[1][0]).toMatchObject({ code: 'BAD_JSON_FIELD' });
  });

  it('maps an oversized payload to 413', () => {
    const { host, status, json } = setup();

    filter.catch(
      Object.assign(new Error('request entity too large'), {
        status: 413,
        type: 'entity.too.large',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(413);
    expect(json.mock.calls[0][0]).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Payload too large',
    });
  });

  it('does not write a second response when headers were already sent', () => {
    const { host, status } = setup({ headersSent: true });

    filter.catch(new Error('late failure'), host);

    expect(status).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
