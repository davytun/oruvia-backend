import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.setup.js';
import { LoggingModule } from '../src/logging/logging.module.js';

@Controller('log-probe')
class LogProbeController {
  private readonly logger = new Logger('Probe');

  @Get('ok')
  ok() {
    return { status: 'healthy' };
  }

  @Post('sensitive-log')
  sensitiveLog() {
    // Attempting to log sensitive fields in structured metadata
    this.logger.log(
      {
        password: 'clear-text-password-123',
        token: 'secret-bearer-jwt-token',
        verificationCode: '654321',
        resetCode: '987654',
        authorization: 'Bearer secret-auth-header',
        cookie: 'session=secret-session-id',
        safeField: 'visible-value',
      },
      'SensitiveAudit',
    );
    return { audited: true };
  }

  @Get('client-error')
  clientError() {
    throw new BadRequestException('Invalid input parameter');
  }

  @Get('server-error')
  serverError() {
    throw new Error('Unexpected system failure');
  }

  @Get('db-error')
  dbError() {
    const error = new Error('Database relation query failed');
    (error as unknown as Record<string, unknown>).parameters = [
      'sensitive-user@example.com',
      'hashed-password-params',
    ];
    throw error;
  }
}

describe('Structured Logging and Observability Foundation (e2e)', () => {
  let app: NestExpressApplication;
  const capturedLogs: Array<Record<string, unknown> | string> = [];
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    // Intercept stdout to capture structured JSON logs emitted by Pino
    stdoutWriteSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          capturedLogs.push(parsed);
        } catch {
          capturedLogs.push(text);
        }
        return true;
      });

    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggingModule,
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'production',
              LOG_LEVEL: 'debug',
              CORS_ORIGINS: '',
              TRUST_PROXY: '',
            }),
          ],
        }),
      ],
      controllers: [LogProbeController],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    stdoutWriteSpy.mockRestore();
  });

  beforeEach(() => {
    capturedLogs.length = 0;
  });

  describe('HTTP request lifecycle & Request ID propagation', () => {
    it('captures structured lifecycle metadata on success and emits exactly one completion log', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/log-probe/ok?query=ignored')
        .set('X-Request-Id', 'client-trace-12345')
        .expect(200);

      expect(res.headers['x-request-id']).toBe('client-trace-12345');
      expect(res.body.requestId).toBe('client-trace-12345');

      // Filter for HTTP request completion logs for this endpoint
      const httpLogs = capturedLogs.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry.requestId === 'client-trace-12345' ||
            (typeof entry.msg === 'string' &&
              entry.msg.includes('client-trace-12345'))),
      );

      // Exactly ONE completion log produced (no duplicates from interceptors or middleware)
      expect(httpLogs).toHaveLength(1);

      const log = httpLogs[0];
      expect(log.level).toBe('info');
      expect(log.service).toBe('oruvia-backend');
      expect(log.environment).toBe('production');
      expect(log.msg).toContain('GET /api/v1/log-probe/ok 200');
      expect(log.msg).not.toContain('query=ignored');
    });

    it('rejects malformed inbound X-Request-Id and generates a valid UUID correlation ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/log-probe/ok')
        .set('X-Request-Id', 'bad') // too short (< 8 chars)
        .expect(200);

      const generatedId = res.headers['x-request-id'];
      expect(generatedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(res.body.requestId).toBe(generatedId);

      const httpLog = capturedLogs.find(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry.requestId === generatedId ||
            (typeof entry.msg === 'string' && entry.msg.includes(generatedId))),
      );
      expect(httpLog).toBeDefined();
    });
  });

  describe('Error logging and correlation', () => {
    it('logs expected client errors (4xx) at warn level with request ID and sanitized path', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/log-probe/client-error?token=should-not-log')
        .set('X-Request-Id', 'trace-client-err-1')
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: 'BAD_REQUEST',
        requestId: 'trace-client-err-1',
      });

      const warnLogs = capturedLogs.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry.requestId === 'trace-client-err-1' ||
            (typeof entry.msg === 'string' &&
              entry.msg.includes('trace-client-err-1'))),
      );

      // Exactly ONE error log produced
      expect(warnLogs).toHaveLength(1);
      const log = warnLogs[0];
      expect(log.level).toBe('warn');
      expect(log.msg).toContain('GET /api/v1/log-probe/client-error -> 400');
      expect(JSON.stringify(log)).not.toContain('should-not-log');
    });

    it('logs unexpected server errors (5xx) at error level with stack trace server-side and safe response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/log-probe/server-error')
        .set('X-Request-Id', 'trace-server-err-1')
        .expect(500);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        requestId: 'trace-server-err-1',
      });
      // Client response must never contain stack trace or internal details
      expect(res.body.stack).toBeUndefined();

      const errorLogs = capturedLogs.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry.requestId === 'trace-server-err-1' ||
            (typeof entry.msg === 'string' &&
              entry.msg.includes('trace-server-err-1'))),
      );

      expect(errorLogs).toHaveLength(1);
      const log = errorLogs[0];
      expect(log.level).toBe('error');
      expect(log.msg).toContain('GET /api/v1/log-probe/server-error -> 500');
    });

    it('strips database parameters and credentials from server error logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/log-probe/db-error')
        .set('X-Request-Id', 'trace-db-err-1')
        .expect(500);

      expect(res.body.message).toBe('Internal server error');

      const logString = JSON.stringify(capturedLogs);
      expect(logString).not.toContain('sensitive-user@example.com');
      expect(logString).not.toContain('hashed-password-params');
    });
  });

  describe('Security and redaction', () => {
    it('automatically redacts passwords, tokens, verification codes, and authorization headers', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/log-probe/sensitive-log')
        .set('Authorization', 'Bearer raw-header-token')
        .set('Cookie', 'sid=super-secret-cookie')
        .send({ password: 'payload-password-value' })
        .expect(201);

      const auditLog = capturedLogs.find(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' &&
          entry !== null &&
          entry.context === 'Probe',
      );

      expect(auditLog).toBeDefined();
      expect(auditLog?.password).toBe('[REDACTED]');
      expect(auditLog?.token).toBe('[REDACTED]');
      expect(auditLog?.verificationCode).toBe('[REDACTED]');
      expect(auditLog?.resetCode).toBe('[REDACTED]');
      expect(auditLog?.authorization).toBe('[REDACTED]');
      expect(auditLog?.cookie).toBe('[REDACTED]');
      expect(auditLog?.safeField).toBe('visible-value');

      const allOutput = JSON.stringify(capturedLogs);
      expect(allOutput).not.toContain('clear-text-password-123');
      expect(allOutput).not.toContain('secret-bearer-jwt-token');
      expect(allOutput).not.toContain('raw-header-token');
      expect(allOutput).not.toContain('super-secret-cookie');
    });
  });
});
