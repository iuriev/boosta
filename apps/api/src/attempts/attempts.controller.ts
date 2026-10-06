import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { OptionalUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import type { SessionUser } from '../auth/session';
import { AttemptsService } from './attempts.service';
import { SubmitAttemptDto, SubmitAttemptResponseDto } from './dto/submit-attempt.dto';

@ApiTags('attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary:
      'Submit a finished quiz. Anonymous callers get a claim token; for a signed-in ' +
      'caller the attempt is attached to the account and becomes the current one.',
  })
  @ApiCreatedResponse({ type: SubmitAttemptResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed body, or answers that do not match the quiz' })
  @ApiConflictResponse({ description: 'The quiz version is unknown or no longer active' })
  submit(
    @Body() body: SubmitAttemptDto,
    @OptionalUser() user: SessionUser | null,
  ): Promise<SubmitAttemptResponseDto> {
    return this.attemptsService.submit(body, user?.id ?? null);
  }
}
