import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { AdminsService } from '../src/auth/admin/admins.service.js';
import { MailService } from '../src/mail/mail.service.js';

describe('Admin (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let mailService: MailService;
  let adminsService: AdminsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    mailService = app.get(MailService);
    adminsService = app.get(AdminsService);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      // Clean up test data across all tables
      await dataSource.query(
        `DELETE FROM "admin_users" WHERE "email" LIKE '%@test-admin.example.com'`,
      );
      await dataSource.query(
        `DELETE FROM "agent_users" WHERE "email" LIKE '%@test-admin.example.com'`,
      );
      await dataSource.query(
        `DELETE FROM "landlord_users" WHERE "email" LIKE '%@test-admin.example.com'`,
      );
      await dataSource.query(
        `DELETE FROM "seeker_users" WHERE "email" LIKE '%@test-admin.example.com'`,
      );
    }
    await app.close();
  });

  const testEmail = 'superadmin@test-admin.example.com';
  const testPassword = 'InitialAdminPassword123!';
  let latestToken: string;

  describe('Account Provisioning & Safeguards', () => {
    it('does NOT expose a public registration endpoint for admin accounts', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/register')
        .send({
          fullName: 'Unauthorized Admin',
          email: 'unauth@test-admin.example.com',
          password: 'Password123!',
        })
        .expect(404);
    });

    it('provisions admin account securely via internal service', async () => {
      await dataSource.query(
        `DELETE FROM "admin_users" WHERE "email" = $1`,
        [testEmail],
      );

      const profile = await adminsService.provisionInitialAdmin({
        fullName: 'Super Administrator',
        email: testEmail,
        password: testPassword,
      });

      expect(profile).toMatchObject({
        id: expect.any(String),
        fullName: 'Super Administrator',
        email: testEmail,
        status: 'ACTIVE',
        lastLoginAt: null,
      });

      // Verify DB record
      const dbRecord = await dataSource.query(
        `SELECT "password_hash", "token_version", "status" FROM "admin_users" WHERE "email" = $1`,
        [testEmail],
      );
      expect(dbRecord).toHaveLength(1);
      expect(dbRecord[0].password_hash).not.toBe(testPassword);
      expect(dbRecord[0].token_version).toBe(0);
      expect(dbRecord[0].status).toBe('ACTIVE');
    });

    it('prevents accidental duplicate admin provisioning with the same email', async () => {
      await expect(
        adminsService.provisionInitialAdmin({
          fullName: 'Duplicate Administrator',
          email: testEmail,
          password: testPassword,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Authentication & Profile Access', () => {
    it('POST /api/v1/admin/auth/login - rejects invalid input with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        code: 'VALIDATION_FAILED',
      });
    });

    it('POST /api/v1/admin/auth/login - rejects wrong password with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testEmail,
          password: 'IncorrectPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('POST /api/v1/admin/auth/login - rejects inactive or suspended admin with 403', async () => {
      // Suspend admin temporarily
      await dataSource.query(
        `UPDATE "admin_users" SET "status" = 'SUSPENDED' WHERE "email" = $1`,
        [testEmail],
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 403,
        code: 'ADMIN_ACCOUNT_INACTIVE',
      });

      // Restore active status
      await dataSource.query(
        `UPDATE "admin_users" SET "status" = 'ACTIVE' WHERE "email" = $1`,
        [testEmail],
      );
    });

    it('POST /api/v1/admin/auth/login - succeeds for active admin, updates lastLoginAt, and returns token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          admin: {
            email: testEmail,
            status: 'ACTIVE',
            lastLoginAt: expect.any(String),
          },
        },
      });

      latestToken = response.body.data.accessToken;
    });

    it('GET /api/v1/admin/auth/me - rejects unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .expect(401);
    });

    it('GET /api/v1/admin/auth/me - returns safe admin profile for valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          email: testEmail,
          status: 'ACTIVE',
          fullName: 'Super Administrator',
        },
      });
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.tokenVersion).toBeUndefined();
    });

    it('GET /api/v1/admin/auth/me - rejects request if admin status is set to INACTIVE', async () => {
      await dataSource.query(
        `UPDATE "admin_users" SET "status" = 'INACTIVE' WHERE "email" = $1`,
        [testEmail],
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      // Restore active
      await dataSource.query(
        `UPDATE "admin_users" SET "status" = 'ACTIVE' WHERE "email" = $1`,
        [testEmail],
      );
    });
  });

  describe('Password Change & Token Invalidation', () => {
    const newPassword = 'BrandNewAdminPassword456!';

    it('POST /api/v1/admin/auth/change-password - rejects wrong current password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: 'WrongOldPassword123!',
          newPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/admin/auth/change-password - rejects identical password with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/change-password')
        .set('Authorization', `Bearer ${latestToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/admin/auth/change-password - changes password successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/change-password')
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

    it('GET /api/v1/admin/auth/me - rejects old token after password change (token invalidation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${latestToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    });

    it('POST /api/v1/admin/auth/login - logs in with new password and receives fresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      latestToken = response.body.data.accessToken;
    });
  });

  describe('Password Recovery Workflow', () => {
    const finalPassword = 'ResetAdminPasswordFinal789!';

    it('POST /api/v1/admin/auth/forgot-password - does not disclose if account exists for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/forgot-password')
        .send({ email: 'ghost@test-admin.example.com' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message:
            'If an account with that email exists, a password reset code has been sent.',
        },
      });
    });

    it('POST /api/v1/admin/auth/forgot-password - sends reset code for existing admin', async () => {
      const priorCount = mailService.sentMessages.length;

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/forgot-password')
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
      expect(latestMsg.subject).toBe('Reset your Oruvia admin password');
    });

    it('POST /api/v1/admin/auth/forgot-password - enforces 60s cooldown against flooding', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/forgot-password')
        .send({ email: testEmail })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('POST /api/v1/admin/auth/reset-password - rejects invalid reset code with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/reset-password')
        .send({
          email: testEmail,
          code: '000000',
          newPassword: finalPassword,
        })
        .expect(400);
    });

    it('POST /api/v1/admin/auth/reset-password - resets password with valid code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];
      expect(code).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/reset-password')
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

    it('POST /api/v1/admin/auth/reset-password - cannot reuse consumed reset code', async () => {
      const latestMsg = mailService.sentMessages
        .filter((m) => m.to === testEmail)
        .pop();
      const code = latestMsg?.text.match(/\b\d{6}\b/)?.[0];

      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/reset-password')
        .send({
          email: testEmail,
          code,
          newPassword: 'AnotherPassword999!',
        })
        .expect(400);
    });

    it('POST /api/v1/admin/auth/login - logs in with reset password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: testEmail,
          password: finalPassword,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('Account Isolation & 4-Way Cross-Role Access Prevention', () => {
    const sharedEmail = 'shared@test-admin.example.com';
    const sharedPassword = 'CrossRoleSharedPassword123!';
    let seekerToken: string;
    let landlordToken: string;
    let agentToken: string;
    let adminToken: string;

    it('can register all 4 account types with the exact same email in their respective tables', async () => {
      // 1. Seeker
      await request(app.getHttpServer())
        .post('/api/v1/seekers/register')
        .send({ fullName: 'Alice Seeker', email: sharedEmail, password: sharedPassword })
        .expect(201);
      await dataSource.query(
        `UPDATE "seeker_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // 2. Landlord
      await request(app.getHttpServer())
        .post('/api/v1/landlords/register')
        .send({ fullName: 'Bob Landlord', email: sharedEmail, password: sharedPassword })
        .expect(201);
      await dataSource.query(
        `UPDATE "landlord_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // 3. Agent
      await request(app.getHttpServer())
        .post('/api/v1/agents/register')
        .send({ fullName: 'Clara Agent', email: sharedEmail, password: sharedPassword })
        .expect(201);
      await dataSource.query(
        `UPDATE "agent_users" SET "is_email_verified" = true, "email_verified_at" = now() WHERE "email" = $1`,
        [sharedEmail],
      );

      // 4. Admin
      await adminsService.provisionInitialAdmin({
        fullName: 'Dave Admin',
        email: sharedEmail,
        password: sharedPassword,
      });

      // Obtain tokens for all 4 roles
      const sLogin = await request(app.getHttpServer())
        .post('/api/v1/seekers/login')
        .send({ email: sharedEmail, password: sharedPassword })
        .expect(200);
      seekerToken = sLogin.body.data.accessToken;

      const lLogin = await request(app.getHttpServer())
        .post('/api/v1/landlords/login')
        .send({ email: sharedEmail, password: sharedPassword })
        .expect(200);
      landlordToken = lLogin.body.data.accessToken;

      const agLogin = await request(app.getHttpServer())
        .post('/api/v1/agents/login')
        .send({ email: sharedEmail, password: sharedPassword })
        .expect(200);
      agentToken = agLogin.body.data.accessToken;

      const adLogin = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: sharedEmail, password: sharedPassword })
        .expect(200);
      adminToken = adLogin.body.data.accessToken;

      expect(seekerToken).toBeDefined();
      expect(landlordToken).toBeDefined();
      expect(agentToken).toBeDefined();
      expect(adminToken).toBeDefined();
    });

    it('rejects admin token on seeker, landlord, and agent endpoints', async () => {
      // Admin on Seeker /me
      const sRes = await request(app.getHttpServer())
        .get('/api/v1/seekers/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);
      expect(sRes.body.code).toBe('UNAUTHORIZED');

      // Admin on Landlord /me
      const lRes = await request(app.getHttpServer())
        .get('/api/v1/landlords/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);
      expect(lRes.body.code).toBe('UNAUTHORIZED');

      // Admin on Agent /me
      const agRes = await request(app.getHttpServer())
        .get('/api/v1/agents/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);
      expect(agRes.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects seeker, landlord, and agent tokens on admin endpoints', async () => {
      // Seeker on Admin /me
      const sRes = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${seekerToken}`)
        .expect(401);
      expect(sRes.body.code).toBe('UNAUTHORIZED');

      // Landlord on Admin /me
      const lRes = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(401);
      expect(lRes.body.code).toBe('UNAUTHORIZED');

      // Agent on Admin /me
      const agRes = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(401);
      expect(agRes.body.code).toBe('UNAUTHORIZED');
    });

    it('validates admin token on admin endpoints and returns admin safe profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.fullName).toBe('Dave Admin');
      expect(response.body.data.email).toBe(sharedEmail);
      expect(response.body.data.status).toBe('ACTIVE');
    });
  });
});
