import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { QuizDto } from './dto/quiz.dto';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  @ApiOperation({ summary: 'The active quiz version. No authentication required.' })
  @ApiOkResponse({ type: QuizDto })
  getActiveQuiz(): Promise<QuizDto> {
    return this.quizService.getActiveQuiz();
  }
}
