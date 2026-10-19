import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { MailService } from '../src/mail/mail.service.js';

describe('Landlords (e2e)', () => {
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
        `DELETE FROM "landlord_users" WHERE "email" LIKE '%@test-landlord.example.com'`,
      );
      await dataSource.query(
        `DELETE FROM "seeker_users" WHERE "email" LIKE '%@test-landlord.example.com'`,
      );
    }
    await app.close();
  });

  const testEmail = 'bob@test-landlord.example.com';
  const testPassword = 'InitialSecurePassword123!';
  let latestToken: string;

  describe('Registration & Input Validation', () => {
    it('POST /api/v1/landlords/register - rejects invalid input with 400 and structured details', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/register')
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

    it('POST /api/v1/landlords/register - creates an unverified account with normalized email and safe profile', async () => {
      // Clean up in case left over from a previous test run
      await dataSource.query(
        `DELETE FROM "landlord_users" WHERE "email" = $1`,
        [testEmail],
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/register')
        .send({
          fullName: 'Bob Landlord',
          email: '  Bob@TEST-LANDLORD.example.com  ',
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          fullName: 'Bob Landlord',
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
      expect(sent?.subject).toBe('Verify your Oruvia landlord account');
    });

    it('POST /api/v1/landlords/register - rejects duplicate email with 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/register')
        .send({
          fullName: 'Bob Duplicate',
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
    it('POST /api/v1/landlords/login - rejects login while unverified with 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
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

    it('POST /api/v1/landlords/verify-email - rejects wrong verification code with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/verify-email')
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

    it('POST /api/v1/landlords/resend-verification-code - invalidates previous code and sends a new one', async () => {
      // Age existing code by 2 minutes to satisfy the 60-second account-based cooldown
      await dataSource.query(
        `UPDATE "landlord_verification_codes" SET "created_at" = "created_at" - interval '2 minutes' WHERE "landlord_id" = (SELECT "id" FROM "landlord_users" WHERE "email" = $1)`,
        [testEmail],
      );

      const priorMessagesCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/resend-verification-code')
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

    it('POST /api/v1/landlords/resend-verification-code - enforces 60s cooldown against inbox flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/resend-verification-code')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/landlords/verify-email - succeeds with valid code and marks landlord verified', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/verify-email')
        .send({
          email: testEmail,
          code,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Email verified successfully',
          landlord: {
            email: testEmail,
            isEmailVerified: true,
            emailVerifiedAt: expect.any(String),
          },
        },
      });
    });

    it('POST /api/v1/landlords/verify-email - cannot reuse already consumed code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/landlords/verify-email')
        .send({
          email: testEmail,
          code,
        })
        .expect(400);
    });
  });

  describe('Authentication & Profile Access', () => {
    it('POST /api/v1/landlords/login - rejects wrong password with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
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

    it('POST /api/v1/landlords/login - succeeds for verified landlord and returns JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          landlord: {
            email: testEmail,
            isEmailVerified: true,
          },
        },
      });

      latestToken = response.body.data.accessToken;
    });

    it('GET /api/v1/landlords/me - rejects unauthenticated access with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
        .expect(401);
    });

    it('GET /api/v1/landlords/me - returns safe profile for valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
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

    it('POST /api/v1/landlords/change-password - rejects wrong current password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/landlords/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword123!',
          newPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/landlords/change-password - rejects identical password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/landlords/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/landlords/change-password - changes password successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/change-password')
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

    it('GET /api/v1/landlords/me - rejects old token after password change (token invalidation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('POST /api/v1/landlords/login - logs in with new password and receives fresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
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

    it('POST /api/v1/landlords/forgot-password - does not disclose if account exists for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/forgot-password')
        .send({ email: 'ghost@test-landlord.example.com' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an account with that email exists, a password reset code has been sent.',
        },
      });
    });

    it('POST /api/v1/landlords/forgot-password - sends reset code for existing landlord', async () => {
      const priorCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/forgot-password')
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
      const latestMsg = mailService.sentMessages[mailService.sentMessages.length - 1];
      expect(latestMsg.subject).toBe('Reset your Oruvia landlord password');
    });

    it('POST /api/v1/landlords/forgot-password - enforces 60s cooldown against password reset flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/landlords/reset-password - rejects invalid reset code with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/landlords/reset-password')
        .send({
          email: testEmail,
          code: '000000',
          newPassword: finalPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/landlords/reset-password - resets password with valid code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/reset-password')
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

    it('POST /api/v1/landlords/reset-password - cannot reuse consumed reset code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/landlords/reset-password')
        .send({
          email: testEmail,
          code,
          newPassword: 'AnotherPassword999!',
        })
        .expect(400);
    });

    it('POST /api/v1/landlords/login - logs in with reset password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
        .send({
          email: testEmail,
          password: finalPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('Account Isolation & Cross-Role Access Prevention', () => {
    const sharedEmail = 'shared@test-landlord.example.com';
    const seekerPassword = 'SeekerPassword123!';
    const landlordPassword = 'LandlordPassword123!';
    let seekerToken: string;
    let landlordToken: string;

    it('can register both a seeker and a landlord with the exact same email in their separate tables', async () => {
      // 1. Register Seeker
      const seekerReg = await request(app.getHttpServer())
        .post('/api/v1/seekers/register')
        .send({
          fullName: 'Alice Shared',
          email: sharedEmail,
          password: seekerPassword,
        })
        .expect(201);
      expect(seekerReg.body.data.email).toBe(sharedEmail);

      // Verify seeker email directly in DB for fast testing
      await dataSource.query(
        `UPDATE "seeker_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // 2. Register Landlord
      const landlordReg = await request(app.getHttpServer())
        .post('/api/v1/landlords/register')
        .send({
          fullName: 'Bob Shared',
          email: sharedEmail,
          password: landlordPassword,
        })
        .expect(201);
      expect(landlordReg.body.data.email).toBe(sharedEmail);

      // Verify landlord email directly in DB for fast testing
      await dataSource.query(
        `UPDATE "landlord_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // Login as Seeker
      const seekerLogin = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({ email: sharedEmail, password: seekerPassword })
        .expect(200);
      seekerToken = seekerLogin.body.data.accessToken;

      // Login as Landlord
      const landlordLogin = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
        .send({ email: sharedEmail, password: landlordPassword })
        .expect(200);
      landlordToken = landlordLogin.body.data.accessToken;

      expect(seekerToken).toBeDefined();
      expect(landlordToken).toBeDefined();
      expect(seekerToken).not.toEqual(landlordToken);
    });

    it('rejects seeker token when accessing landlord endpoints (account isolation)', async () => {
      // Seeker token attempting GET /api/v1/landlords/me
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(401);

      expect(meResponse.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      // Seeker token attempting POST /api/v1/landlords/change-password
      const changePassResponse = await request(app.getHttpServer())
        .post('/api/v1/landlords/change-password')
        .set('Authorization', `Bearer ${seekerToken}`)
        .send({
          currentPassword: landlordPassword,
          newPassword: 'HackedPassword123!',
        })
        .expect(401);

      expect(changePassResponse.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects landlord token when accessing seeker endpoints (account isolation)', async () => {
      // Landlord token attempting GET /api/v1/seekers/me
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(401);

      expect(meResponse.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      // Landlord token attempting POST /api/v1/seekers/change-password
      const changePassResponse = await request(app.getHttpServer())
        .post('/api/v1/seekers/change-password')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          currentPassword: seekerPassword,
          newPassword: 'HackedPassword123!',
        })
        .expect(401);

      expect(changePassResponse.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('validates landlord token on landlord endpoints and seeker token on seeker endpoints', async () => {
      const landlordMe = await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(landlordMe.body.data.fullName).toBe('Bob Shared');

      const seekerMe = await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(200);

      expect(seekerMe.body.data.fullName).toBe('Alice Shared');
    });
  });
});
