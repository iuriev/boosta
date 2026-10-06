import type {
  AttemptAnswer,
  Gender,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
} from '@boosta/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { GENDERS } from '../gender';

export class AttemptAnswerDto implements AttemptAnswer {
  @ApiProperty({ example: 'lose_track_of_time' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  questionKey!: string;

  @ApiProperty({ example: 'agree' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  optionKey!: string;
}

export class SubmitAttemptDto implements SubmitAttemptRequest {
  @ApiProperty({ format: 'uuid', description: '`versionId` from GET /api/quiz' })
  @IsUUID()
  quizVersionId!: string;

  @ApiProperty({ enum: GENDERS })
  @IsIn(GENDERS)
  gender!: Gender;

  @ApiProperty({ type: [AttemptAnswerDto], description: 'Exactly one answer per question' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerDto)
  answers!: AttemptAnswerDto[];
}

export class SubmitAttemptResponseDto implements SubmitAttemptResponse {
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'One-time token, valid for 24 hours, to attach the attempt to an account on ' +
      'registration or sign-in. Null when the request was authenticated.',
  })
  claimToken!: string | null;
}
