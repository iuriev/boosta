import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AttemptsModule } from './attempts/attempts.module';
import { validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { QuizModule } from './quiz/quiz.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    QuizModule,
    AttemptsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
