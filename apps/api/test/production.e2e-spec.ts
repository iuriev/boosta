import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type * as Helpers from './helpers';
import type * as TestApp from './test-app';

describe('Application in production mode (e2e)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let app: INestApplication<App>;

  beforeAll(async () => {
    // The environment is read when AppModule is first imported, so it has to be
    // set before the module is loaded; a static import would run too early.
    process.env.NODE_ENV = 'production';
    const { createTestApp } = jest.requireActual<typeof TestApp>('./test-app');
    app = await createTestApp();
  });

  afterAll(async () => {
    await jest.requireActual<typeof Helpers>('./helpers').resetDatabase(app);
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('does not expose the API documentation', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(404);
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });

  it('marks the session cookie as secure', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'secure@example.com', password: 'correct horse battery' })
      .expect(201);

    const [setCookie] = response.headers['set-cookie'] as unknown as string[];
    expect(setCookie).toMatch(/; Secure/);
    expect(setCookie).toMatch(/; HttpOnly/);
  });

  it('still serves the API', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
