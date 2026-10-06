import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type * as Helpers from './helpers';
import type * as TestApp from './test-app';

/** The configuration of the local container setup: production mode served over plain HTTP. */
describe('Production mode with the local-run switches (e2e)', () => {
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    COOKIE_SECURE: process.env.COOKIE_SECURE,
    API_DOCS_ENABLED: process.env.API_DOCS_ENABLED,
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Read when AppModule is first loaded, so set before that.
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECURE = 'false';
    process.env.API_DOCS_ENABLED = 'true';
    app = await jest.requireActual<typeof TestApp>('./test-app').createTestApp();
  });

  afterAll(async () => {
    await jest.requireActual<typeof Helpers>('./helpers').resetDatabase(app);
    await app.close();
    Object.assign(process.env, original);
    if (original.COOKIE_SECURE === undefined) {
      delete process.env.COOKIE_SECURE;
    }
    if (original.API_DOCS_ENABLED === undefined) {
      delete process.env.API_DOCS_ENABLED;
    }
  });

  it('sets the session cookie without Secure when that is turned off', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'plain-http@example.com', password: 'correct horse battery' })
      .expect(201);

    const [setCookie] = response.headers['set-cookie'] as unknown as string[];
    expect(setCookie).not.toMatch(/; Secure/);
    expect(setCookie).toMatch(/; HttpOnly/);
    expect(setCookie).toMatch(/; SameSite=Lax/);
  });

  it('serves the API documentation when that is turned on', async () => {
    await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  });
});
