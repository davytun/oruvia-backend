import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { configureApp } from './../src/app.setup.js';

class CredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/** Throwaway routes that exercise the global pipeline. No database needed. */
@Controller('probe')
class ProbeController {
  @Get('ok')
  ok() {
    return { hello: 'world' };
  }

  @Post('credentials')
  credentials(@Body() dto: CredentialsDto) {
    return { email: dto.email };
  }

  @Get('missing')
  missing() {
    throw new NotFoundException('Thing not found');
  }

  @Get('conflict')
  conflict() {
    throw new ConflictException({
      code: 'EMAIL_TAKEN',
      message: 'That email is already registered',
    });
  }

  @Get('boom')
  boom() {
    throw new Error('relation "users" does not exist at /srv/app/secret.ts:42');
  }

  @Get('file')
  file() {
    return new StreamableFile(Buffer.from('raw-bytes'));
  }

  @Get('empty')
  @HttpCode(204)
  empty() {}
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Global request pipeline (e2e)', () => {
  let app: NestExpressApplication;
  const logged: string[] = [];

  beforeAll(async () => {
    for (const level of ['log', 'warn', 'error'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logged.push(String(message));
      });
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ CORS_ORIGINS: 'http://localhost:5173' })],
        }),
      ],
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    logged.length = 0;
  });

  describe('success responses', () => {
    it('wraps results in the standard envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/ok')
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: { hello: 'world' },
        requestId: res.headers['x-request-id'],
      });
    });

    it('does not wrap file/stream responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/file')
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => done(null, Buffer.concat(chunks).toString()));
        })
        .expect(200);

      expect(res.body).toBe('raw-bytes');
    });

    it('keeps 204 responses empty', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/empty')
        .expect(204);

      expect(res.text).toBe('');
    });
  });

  describe('request ID', () => {
    it('generates an ID, returns it as a header, and puts it in the body', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/probe/ok');

      expect(res.headers['x-request-id']).toMatch(UUID);
      expect(res.body.requestId).toBe(res.headers['x-request-id']);
    });

    it('propagates a valid inbound ID to success and error bodies and logs', async () => {
      const ok = await request(app.getHttpServer())
        .get('/api/v1/probe/ok')
        .set('X-Request-Id', 'trace-abc-12345');
      const failed = await request(app.getHttpServer())
        .get('/api/v1/probe/missing')
        .set('X-Request-Id', 'trace-abc-67890');

      expect(ok.headers['x-request-id']).toBe('trace-abc-12345');
      expect(ok.body.requestId).toBe('trace-abc-12345');
      expect(failed.headers['x-request-id']).toBe('trace-abc-67890');
      expect(failed.body.requestId).toBe('trace-abc-67890');
      expect(logged.some((l) => l.includes('[trace-abc-12345]'))).toBe(true);
      expect(logged.some((l) => l.includes('[trace-abc-67890]'))).toBe(true);
    });

    it('replaces a malformed inbound ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/ok')
        .set('X-Request-Id', 'short');

      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('is exposed to browsers through CORS', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/ok')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-expose-headers']).toContain(
        'X-Request-Id',
      );
    });
  });

  describe('DTO validation', () => {
    it('accepts a valid body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/probe/credentials')
        .send({ email: 'user@example.com', password: 'longenough' })
        .expect(201);

      expect(res.body.data).toEqual({ email: 'user@example.com' });
    });

    it('returns 400 VALIDATION_FAILED with per-field details', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/probe/credentials')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        requestId: res.headers['x-request-id'],
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          { field: 'email', messages: ['email must be an email'] },
          {
            field: 'password',
            messages: ['password must be longer than or equal to 8 characters'],
          },
        ]),
      );
    });

    it('rejects unexpected fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/probe/credentials')
        .send({ email: 'user@example.com', password: 'longenough', role: 'admin' })
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.details).toEqual([
        { field: 'role', messages: ['property role should not exist'] },
      ]);
    });

    it('returns 400 MALFORMED_REQUEST for invalid JSON without echoing or logging it', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/probe/credentials')
        .set('Content-Type', 'application/json')
        .send('{"password": "hunter2-secret",')
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'MALFORMED_REQUEST',
        message: 'Malformed request',
        requestId: res.headers['x-request-id'],
      });
      expect(JSON.stringify(res.body)).not.toContain('hunter2');
      expect(logged.join('\n')).not.toContain('hunter2');
    });

    it('returns 413 for bodies over the limit', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/probe/credentials')
        .send({ email: 'a@b.co', password: 'x'.repeat(200_000) })
        .expect(413);

      expect(res.body).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    });
  });

  describe('error responses', () => {
    it('preserves 404 for expected exceptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/missing')
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Thing not found',
      });
      expect(res.body.timestamp).toEqual(expect.any(String));
    });

    it('preserves 409 and a custom domain code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/conflict')
        .expect(409);

      expect(res.body).toMatchObject({
        code: 'EMAIL_TAKEN',
        message: 'That email is already registered',
      });
    });

    it('uses the same format for unknown routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/nope')
        .expect(404);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 404,
        code: 'NOT_FOUND',
        requestId: res.headers['x-request-id'],
      });
    });

    it('hides internals of unexpected errors but logs them server-side', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/probe/boom')
        .expect(500);

      expect(res.body).toMatchObject({
        success: false,
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        requestId: res.headers['x-request-id'],
      });
      expect(JSON.stringify(res.body)).not.toMatch(/relation|users|secret|\.ts/);
      expect(
        logged.some(
          (l) =>
            l.includes(res.body.requestId) && l.includes('relation "users"'),
        ),
      ).toBe(true);
    });
  });

  describe('safe logging', () => {
    it('never logs request bodies, secrets or query strings', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/probe/credentials?code=654321')
        .set('Authorization', 'Bearer super-secret-token')
        .set('Cookie', 'session=cookie-secret')
        .send({ email: 'user@example.com', password: 'hunter2-password' });
      await request(app.getHttpServer())
        .post('/api/v1/probe/credentials?code=654321')
        .set('Authorization', 'Bearer super-secret-token')
        .send({ email: 'bad', password: 'hunter2-password' });

      const output = logged.join('\n');
      expect(output).not.toContain('hunter2-password');
      expect(output).not.toContain('super-secret-token');
      expect(output).not.toContain('cookie-secret');
      expect(output).not.toContain('654321');
    });
  });
});
