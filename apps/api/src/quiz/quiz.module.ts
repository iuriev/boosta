import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizVersion } from './quiz-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizVersion])],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
