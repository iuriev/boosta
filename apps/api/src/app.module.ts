import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AttemptsModule } from './attempts/attempts.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { QuizModule } from './quiz/quiz.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Tests set everything they need; a developer's .env must not leak into
      // them. Not keyed on NODE_ENV, which some tests set to "production".
      ignoreEnvFile: process.env.JEST_WORKER_ID !== undefined,
    }),
    DatabaseModule,
    QuizModule,
    AttemptsModule,
    AuthModule,
    ReportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
