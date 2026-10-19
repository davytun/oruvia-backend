import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { MailService } from '../src/mail/mail.service.js';

describe('Agents (e2e)', () => {
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
        `DELETE FROM "agent_users" WHERE "email" LIKE '%@test-agent.example.com'`,
      );
      await dataSource.query(
        `DELETE FROM "landlord_users" WHERE "email" LIKE '%@test-agent.example.com'`,
      );
      await dataSource.query(
        `DELETE FROM "seeker_users" WHERE "email" LIKE '%@test-agent.example.com'`,
      );
    }
    await app.close();
  });

  const testEmail = 'clara@test-agent.example.com';
  const testPassword = 'InitialAgentPassword123!';
  let latestToken: string;

  describe('Registration & Input Validation', () => {
    it('POST /api/v1/agents/register - rejects invalid input with 400 and structured details', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/register')
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

    it('POST /api/v1/agents/register - creates an unverified account with normalized email and safe profile', async () => {
      // Clean up in case left over from a previous test run
      await dataSource.query(
        `DELETE FROM "agent_users" WHERE "email" = $1`,
        [testEmail],
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/register')
        .send({
          fullName: 'Clara Agent',
          email: '  Clara@TEST-AGENT.example.com  ',
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          fullName: 'Clara Agent',
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
      expect(sent?.subject).toBe('Verify your Oruvia agent account');
    });

    it('POST /api/v1/agents/register - rejects duplicate email with 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/register')
        .send({
          fullName: 'Clara Duplicate',
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
    it('POST /api/v1/agents/login - rejects login while unverified with 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
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

    it('POST /api/v1/agents/verify-email - rejects wrong verification code with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/verify-email')
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

    it('POST /api/v1/agents/resend-verification-code - invalidates previous code and sends a new one', async () => {
      // Age existing code by 2 minutes to satisfy the 60-second account-based cooldown
      await dataSource.query(
        `UPDATE "agent_verification_codes" SET "created_at" = "created_at" - interval '2 minutes' WHERE "agent_id" = (SELECT "id" FROM "agent_users" WHERE "email" = $1)`,
        [testEmail],
      );

      const priorMessagesCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/resend-verification-code')
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

    it('POST /api/v1/agents/resend-verification-code - enforces 60s cooldown against inbox flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/resend-verification-code')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/agents/verify-email - succeeds with valid code and marks agent verified', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/verify-email')
        .send({
          email: testEmail,
          code,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Email verified successfully',
          agent: {
            email: testEmail,
            isEmailVerified: true,
            emailVerifiedAt: expect.any(String),
          },
        },
      });
    });

    it('POST /api/v1/agents/verify-email - cannot reuse already consumed code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/agents/verify-email')
        .send({
          email: testEmail,
          code,
        })
        .expect(400);
    });
  });

  describe('Authentication & Profile Access', () => {
    it('POST /api/v1/agents/login - rejects wrong password with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
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

    it('POST /api/v1/agents/login - succeeds for verified agent and returns JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          agent: {
            email: testEmail,
            isEmailVerified: true,
          },
        },
      });

      latestToken = response.body.data.accessToken;
    });

    it('GET /api/v1/agents/me - rejects unauthenticated access with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .expect(401);
    });

    it('GET /api/v1/agents/me - returns safe profile for valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
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
    const newPassword = 'BrandNewAgentPassword456!';

    it('POST /api/v1/agents/change-password - rejects wrong current password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agents/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword123!',
          newPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/agents/change-password - rejects identical password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agents/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/agents/change-password - changes password successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/change-password')
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

    it('GET /api/v1/agents/me - rejects old token after password change (token invalidation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('POST /api/v1/agents/login - logs in with new password and receives fresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
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
    const finalPassword = 'ResetAgentPasswordFinal789!';

    it('POST /api/v1/agents/forgot-password - does not disclose if account exists for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/forgot-password')
        .send({ email: 'ghost@test-agent.example.com' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an account with that email exists, a password reset code has been sent.',
        },
      });
    });

    it('POST /api/v1/agents/forgot-password - sends reset code for existing agent', async () => {
      const priorCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/forgot-password')
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
      expect(latestMsg.subject).toBe('Reset your Oruvia agent password');
    });

    it('POST /api/v1/agents/forgot-password - enforces 60s cooldown against password reset flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/agents/reset-password - rejects invalid reset code with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agents/reset-password')
        .send({
          email: testEmail,
          code: '000000',
          newPassword: finalPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/agents/reset-password - resets password with valid code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/reset-password')
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

    it('POST /api/v1/agents/reset-password - cannot reuse consumed reset code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/agents/reset-password')
        .send({
          email: testEmail,
          code,
          newPassword: 'AnotherPassword999!',
        })
        .expect(400);
    });

    it('POST /api/v1/agents/login - logs in with reset password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
        .send({
          email: testEmail,
          password: finalPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('Account Isolation & Cross-Role Access Prevention', () => {
    const sharedEmail = 'shared@test-agent.example.com';
    const seekerPassword = 'SeekerPassword123!';
    const landlordPassword = 'LandlordPassword123!';
    const agentPassword = 'AgentPassword123!';
    let seekerToken: string;
    let landlordToken: string;
    let agentToken: string;

    it('can register a seeker, a landlord, and an agent with the exact same email in their separate tables', async () => {
      // 1. Register Seeker
      const seekerReg = await request(app.getHttpServer())
        .post('/api/v1/seekers/register')
        .send({
          fullName: 'Alice Seeker',
          email: sharedEmail,
          password: seekerPassword,
        })
        .expect(201);
      expect(seekerReg.body.data.email).toBe(sharedEmail);

      await dataSource.query(
        `UPDATE "seeker_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // 2. Register Landlord
      const landlordReg = await request(app.getHttpServer())
        .post('/api/v1/landlords/register')
        .send({
          fullName: 'Bob Landlord',
          email: sharedEmail,
          password: landlordPassword,
        })
        .expect(201);
      expect(landlordReg.body.data.email).toBe(sharedEmail);

      await dataSource.query(
        `UPDATE "landlord_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // 3. Register Agent
      const agentReg = await request(app.getHttpServer())
        .post('/api/v1/agents/register')
        .send({
          fullName: 'Clara Agent',
          email: sharedEmail,
          password: agentPassword,
        })
        .expect(201);
      expect(agentReg.body.data.email).toBe(sharedEmail);

      await dataSource.query(
        `UPDATE "agent_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
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

      // Login as Agent
      const agentLogin = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
        .send({ email: sharedEmail, password: agentPassword })
        .expect(200);
      agentToken = agentLogin.body.data.accessToken;

      expect(seekerToken).toBeDefined();
      expect(landlordToken).toBeDefined();
      expect(agentToken).toBeDefined();
      expect(agentToken).not.toEqual(seekerToken);
      expect(agentToken).not.toEqual(landlordToken);
    });

    it('rejects agent token on seeker and landlord endpoints', async () => {
      // Agent token accessing Seeker /me
      const seekerMeResponse = await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(401);
      expect(seekerMeResponse.body.code).toBe('UNAUTHORIZED');

      // Agent token accessing Landlord /me
      const landlordMeResponse = await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(401);
      expect(landlordMeResponse.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects seeker and landlord tokens on agent endpoints', async () => {
      // Seeker token accessing Agent /me
      const seekerOnAgentResponse = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(401);
      expect(seekerOnAgentResponse.body.code).toBe('UNAUTHORIZED');

      // Landlord token accessing Agent /me
      const landlordOnAgentResponse = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(401);
      expect(landlordOnAgentResponse.body.code).toBe('UNAUTHORIZED');
    });

    it('validates agent token on agent endpoints and returns agent safe profile', async () => {
      const agentMe = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(agentMe.body.data.fullName).toBe('Clara Agent');
      expect(agentMe.body.data.email).toBe(sharedEmail);
    });
  });
});
