import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { type Env, NodeEnv } from './config/env';

export const API_PREFIX = 'api';

/**
 * HTTP-level configuration shared by the real server and the e2e tests, so
 * tests exercise the same pipes, prefix and middleware as production.
 */
export function setupApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Browsers reach the API through the Next.js server. Trusting that hop's
  // X-Forwarded-For lets rate limiting see the real client instead of counting
  // every visitor as the proxy. It is off unless configured, because trusting
  // the header from anyone would let a caller pick its own rate-limit key.
  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  if (trustProxy) {
    app.set('trust proxy', trustProxy);
  }

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.use(rejectNonJsonBodies);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const docsEnabled =
    config.get('API_DOCS_ENABLED', { infer: true }) ??
    config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production;
  if (docsEnabled) {
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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * The API speaks JSON only. An HTML form on another site can post
 * `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`
 * without a CORS preflight, which would let it sign a visitor in to an
 * attacker's account. It cannot send `application/json`, so refusing everything
 * else closes that door.
 */
function rejectNonJsonBodies(request: Request, response: Response, next: NextFunction): void {
  const hasContentType = request.headers['content-type'] !== undefined;
  if (!SAFE_METHODS.has(request.method) && hasContentType && !request.is('application/json')) {
    response.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({
      statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      error: 'Unsupported Media Type',
      message: 'Request bodies must be application/json',
    });
    return;
  }
  next();
}
