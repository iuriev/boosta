import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestApp } from './test-app';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports healthy when the database is reachable', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('answers unknown routes with a JSON 404', async () => {
    const response = await request(app.getHttpServer()).get('/api/does-not-exist').expect(404);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toMatchObject({ statusCode: 404 });
  });

  it('serves routes only under the /api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('serves the OpenAPI document outside production', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body).toHaveProperty(['paths', '/api/health']);
  });

  it('sets security headers', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
