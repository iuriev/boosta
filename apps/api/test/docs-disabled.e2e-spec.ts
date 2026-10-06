import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type * as TestApp from './test-app';

describe('API documentation switched off outside production (e2e)', () => {
  const original = process.env.API_DOCS_ENABLED;
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Read when AppModule is first loaded, so set before that.
    process.env.API_DOCS_ENABLED = 'false';
    app = await jest.requireActual<typeof TestApp>('./test-app').createTestApp();
  });

  afterAll(async () => {
    await app.close();
    if (original === undefined) {
      delete process.env.API_DOCS_ENABLED;
    } else {
      process.env.API_DOCS_ENABLED = original;
    }
  });

  it('does not expose the documentation', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(404);
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });

  it('still serves the API', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
