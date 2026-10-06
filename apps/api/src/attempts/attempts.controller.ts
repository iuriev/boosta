import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AttemptsService } from './attempts.service';
import { SubmitAttemptDto, SubmitAttemptResponseDto } from './dto/submit-attempt.dto';

@ApiTags('attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a finished quiz. No authentication required.' })
  @ApiCreatedResponse({ type: SubmitAttemptResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed body, or answers that do not match the quiz' })
  @ApiConflictResponse({ description: 'The quiz version is unknown or no longer active' })
  submit(@Body() body: SubmitAttemptDto): Promise<SubmitAttemptResponseDto> {
    return this.attemptsService.submit(body, null);
  }
}
