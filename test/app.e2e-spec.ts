import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

// Requires a reachable PostgreSQL configured through .env (see docs).
describe('App (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health verifies the database connection', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('returns the standard error format for unknown routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({ statusCode: 404, error: 'Not Found' });
        expect(body.message).toBeDefined();
      });
  });
});
