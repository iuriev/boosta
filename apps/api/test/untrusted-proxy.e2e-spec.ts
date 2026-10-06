import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type * as Helpers from './helpers';
import type * as TestApp from './test-app';

const LIMIT = 3;

/**
 * The default deployment: TRUST_PROXY is not set, so nothing a caller writes
 * in a forwarding header can change which rate-limit budget it draws from.
 */
describe('Throttling without a trusted proxy (e2e)', () => {
  const original = {
    limit: process.env.AUTH_RATE_LIMIT_PER_MINUTE,
    trustProxy: process.env.TRUST_PROXY,
  };
  let app: INestApplication<App>;
  let helpers: typeof Helpers;

  beforeAll(async () => {
    // Both are read when AppModule is first loaded, so they are set before that.
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = String(LIMIT);
    delete process.env.TRUST_PROXY;
    helpers = jest.requireActual<typeof Helpers>('./helpers');
    app = await jest.requireActual<typeof TestApp>('./test-app').createTestApp();
  });

  afterAll(async () => {
    await helpers.resetDatabase(app);
    await app.close();
    process.env.AUTH_RATE_LIMIT_PER_MINUTE = original.limit;
    process.env.TRUST_PROXY = original.trustProxy;
  });

  it('counts requests with different forged client addresses as one client', async () => {
    const attemptLogin = (forgedAddress: string) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', forgedAddress)
        .set('X-Real-IP', forgedAddress)
        .set('Forwarded', `for=${forgedAddress}`)
        .send({ email: 'victim@example.com', password: 'whatever' });

    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await attemptLogin(`203.0.113.${String(attempt + 1)}`).expect(401);
    }

    await attemptLogin('203.0.113.200').expect(429);
  });
});
