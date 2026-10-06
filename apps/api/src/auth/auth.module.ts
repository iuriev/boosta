import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { AttemptsModule } from '../attempts/attempts.module';
import type { Env } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SESSION_TTL_SECONDS } from './session';
import { SessionGuard } from './session.guard';

/** How many times the per-account limit one client may use across all accounts. */
export const CLIENT_LIMIT_FACTOR = 10;

function trackClientAndEmail(request: Record<string, unknown>): string {
  const body = request.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return `${String(request.ip)}|${email}`;
}

@Module({
  imports: [
    UsersModule,
    AttemptsModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: SESSION_TTL_SECONDS, algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    // Applied only to the credential routes, through ThrottlerGuard on them.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const limit = config.get('AUTH_RATE_LIMIT_PER_MINUTE', { infer: true });
        return {
          throttlers: [
            // Guesses against one account from one client. This is the limit
            // that matters for password guessing, and it holds even when every
            // visitor shares an address because the web server is the client.
            { name: 'account', ttl: 60_000, limit, getTracker: trackClientAndEmail },
            // A ceiling on everything one client sends, whichever accounts it names.
            { name: 'client', ttl: 60_000, limit: limit * CLIENT_LIMIT_FACTOR },
          ],
          // One budget across register and login: both let a caller test a
          // password, so separate budgets would double the guesses.
          generateKey: (_context, tracker, throttlerName) => `${throttlerName}:${tracker}`,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class AuthModule {}
