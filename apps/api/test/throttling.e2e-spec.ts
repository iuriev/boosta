import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type * as Helpers from './helpers';
import type * as TestApp from './test-app';

const LIMIT = 3;

describe('Throttling of credential endpoints (e2e)', () => {
  const originalLimit = process.env.AUTH_RATE_LIMIT_PER_MINUTE;
  let app: INestApplication<App>;
  let helpers: typeof Helpers;

  const attemptLogin = (ip?: string) => {
    const call = request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });
    return ip ? call.set('X-Forwarded-For', ip) : call;
  };

  beforeAll(async () => {
    // The limit is read when AppModule is first loaded, so it is set before that.
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = String(LIMIT);
    helpers = jest.requireActual<typeof Helpers>('./helpers');
    app = await jest.requireActual<typeof TestApp>('./test-app').createTestApp();
  });

  afterAll(async () => {
    await helpers.resetDatabase(app);
    await app.close();
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = originalLimit;
  });

  it('rejects sign-in requests above the limit', async () => {
    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await attemptLogin('203.0.113.10').expect(401);
    }

    const response = await attemptLogin('203.0.113.10').expect(429);
    expect(response.body).toMatchObject({ statusCode: 429 });
  });

  it('counts each client separately', async () => {
    await attemptLogin('203.0.113.20').expect(401);
  });

  it('shares one budget between sign-in and registration', async () => {
    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await attemptLogin('203.0.113.50').expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('X-Forwarded-For', '203.0.113.50')
      .send({ email: 'shared@example.com', password: helpers.PASSWORD })
      .expect(429);
  });

  it('limits registration as well', async () => {
    const register = (index: number) =>
      request(app.getHttpServer())
        .post('/api/auth/register')
        .set('X-Forwarded-For', '203.0.113.30')
        .send({ email: `user${String(index)}@example.com`, password: helpers.PASSWORD });

    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await register(attempt).expect(201);
    }
    await register(LIMIT).expect(429);
  });

  it('does not limit other routes', async () => {
    for (let attempt = 0; attempt < LIMIT + 2; attempt += 1) {
      await request(app.getHttpServer())
        .get('/api/quiz')
        .set('X-Forwarded-For', '203.0.113.40')
        .expect(200);
    }
  });
});
