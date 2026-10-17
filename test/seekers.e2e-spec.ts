import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { MailService } from '../src/mail/mail.service.js';

describe('Seekers (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let mailService: MailService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    mailService = app.get(MailService);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      // Clean up test data
      await dataSource.query(
        `DELETE FROM "seeker_users" WHERE "email" LIKE '%@test-seeker.example.com'`,
      );
    }
    await app.close();
  });

  const testEmail = 'alice@test-seeker.example.com';
  const testPassword = 'InitialSecurePassword123!';
  let latestToken: string;

  describe('Registration & Input Validation', () => {
    it('POST /api/v1/seekers/register - rejects invalid input with 400 and structured details', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/register')
        .send({
          fullName: '',
          email: 'not-an-email',
          password: '123',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
      });
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'fullName' }),
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    it('POST /api/v1/seekers/register - creates an unverified account with normalized email and safe profile', async () => {
      // Clean up in case left over from a previous test run
      await dataSource.query(
        `DELETE FROM "seeker_users" WHERE "email" = $1`,
        [testEmail],
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/register')
        .send({
          fullName: 'Alice Walker',
          email: '  Alice@TEST-SEEKER.example.com  ',
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          fullName: 'Alice Walker',
          email: testEmail,
          isEmailVerified: false,
          emailVerifiedAt: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Sensitive fields must never be returned
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.tokenVersion).toBeUndefined();

      // Ensure verification email was dispatched
      const sent = mailService.sentMessages.find((m) => m.to === testEmail);
      expect(sent).toBeDefined();
      expect(sent?.text).toMatch(/\b\d{6}\b/);
    });

    it('POST /api/v1/seekers/register - rejects duplicate email with 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/register')
        .send({
          fullName: 'Alice Duplicate',
          email: testEmail,
          password: testPassword,
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
      });
    });
  });

  describe('Email Verification & Resend', () => {
    it('POST /api/v1/seekers/login - rejects login while unverified with 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
      });
    });

    it('POST /api/v1/seekers/verify-email - rejects wrong verification code with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/verify-email')
        .send({
          email: testEmail,
          code: '000000',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: 'INVALID_VERIFICATION_CODE',
      });
    });

    it('POST /api/v1/seekers/resend-verification-code - invalidates previous code and sends a new one', async () => {
      // Age existing code by 2 minutes to satisfy the 60-second account-based cooldown
      await dataSource.query(
        `UPDATE "seeker_verification_codes" SET "created_at" = "created_at" - interval '2 minutes' WHERE "seeker_id" = (SELECT "id" FROM "seeker_users" WHERE "email" = $1)`,
        [testEmail],
      );

      const priorMessagesCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/resend-verification-code')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an unverified account with that email exists, a new verification code has been sent.',
        },
      });

      expect(mailService.sentMessages.length).toBeGreaterThan(priorMessagesCount);
    });

    it('POST /api/v1/seekers/resend-verification-code - enforces 60s cooldown against inbox flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/resend-verification-code')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/seekers/verify-email - succeeds with valid code and marks seeker verified', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/verify-email')
        .send({
          email: testEmail,
          code,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Email verified successfully',
          seeker: {
            email: testEmail,
            isEmailVerified: true,
            emailVerifiedAt: expect.any(String),
          },
        },
      });
    });

    it('POST /api/v1/seekers/verify-email - cannot reuse already consumed code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/seekers/verify-email')
        .send({
          email: testEmail,
          code,
        })
        .expect(400);
    });
  });

  describe('Authentication & Profile Access', () => {
    it('POST /api/v1/seekers/login - rejects wrong password with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('POST /api/v1/seekers/login - succeeds for verified seeker and returns JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          seeker: {
            email: testEmail,
            isEmailVerified: true,
          },
        },
      });

      latestToken = response.body.data.accessToken;
    });

    it('GET /api/v1/seekers/me - rejects unauthenticated access with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .expect(401);
    });

    it('GET /api/v1/seekers/me - returns safe profile for valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          email: testEmail,
          isEmailVerified: true,
        },
      });
      expect(response.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('Password Change & Token Invalidation', () => {
    const newPassword = 'BrandNewPassword456!';

    it('POST /api/v1/seekers/change-password - rejects wrong current password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/seekers/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword123!',
          newPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/seekers/change-password - rejects identical password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/seekers/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/seekers/change-password - changes password successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: testPassword,
          newPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    });

    it('GET /api/v1/seekers/me - rejects old token after password change (token invalidation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('POST /api/v1/seekers/login - logs in with new password and receives fresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      latestToken = response.body.data.accessToken;
    });
  });

  describe('Password Reset Workflow', () => {
    const finalPassword = 'ResetPasswordFinal789!';

    it('POST /api/v1/seekers/forgot-password - does not disclose if account exists for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/forgot-password')
        .send({ email: 'ghost@test-seeker.example.com' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an account with that email exists, a password reset code has been sent.',
        },
      });
    });

    it('POST /api/v1/seekers/forgot-password - sends reset code for existing seeker', async () => {
      const priorCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an account with that email exists, a password reset code has been sent.',
        },
      });

      expect(mailService.sentMessages.length).toBeGreaterThan(priorCount);
    });

    it('POST /api/v1/seekers/forgot-password - enforces 60s cooldown against password reset flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/seekers/reset-password - rejects invalid reset code with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/seekers/reset-password')
        .send({
          email: testEmail,
          code: '000000',
          newPassword: finalPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/seekers/reset-password - resets password with valid code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/reset-password')
        .send({
          email: testEmail,
          code,
          newPassword: finalPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { message: 'Password reset successfully' },
      });
    });

    it('POST /api/v1/seekers/reset-password - cannot reuse consumed reset code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/seekers/reset-password')
        .send({
          email: testEmail,
          code,
          newPassword: 'AnotherPassword999!',
        })
        .expect(400);
    });

    it('POST /api/v1/seekers/login - logs in with reset password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({
          email: testEmail,
          password: finalPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
    });
  });
});
