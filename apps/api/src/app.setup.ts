import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { type Env, NodeEnv } from './config/env';

export const API_PREFIX = 'api';

/**
 * HTTP-level configuration shared by the real server and the e2e tests, so
 * tests exercise the same pipes, prefix and middleware as production.
 */
export function setupApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('ADHD test funnel API')
        .setDescription('Quiz, attempts, authentication and report endpoints')
        .setVersion('1.0')
        .addCookieAuth('session')
        .build(),
    );
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
  }
}
