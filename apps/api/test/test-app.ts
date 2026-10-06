import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

/**
 * Boots the real application (real modules, real database, migrations applied)
 * with the same HTTP setup as `main.ts`.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();
  return app;
}
