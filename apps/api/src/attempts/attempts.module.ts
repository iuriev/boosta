import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuizModule } from '../quiz/quiz.module';
import { Attempt } from './attempt.entity';
import { AttemptAnswer } from './attempt-answer.entity';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attempt, AttemptAnswer]), QuizModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
