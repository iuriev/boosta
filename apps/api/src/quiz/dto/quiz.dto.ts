import type { Quiz, QuizOption, QuizQuestion } from '@boosta/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class QuizQuestionDto implements QuizQuestion {
  @ApiProperty({ example: 'lose_track_of_time', description: 'Stable across quiz versions' })
  key!: string;

  @ApiProperty({ example: 'I easily lose track of time when doing something I enjoy' })
  text!: string;
}

export class QuizOptionDto implements QuizOption {
  @ApiProperty({ example: 'strongly_agree' })
  key!: string;

  @ApiProperty({ example: 'Strongly agree' })
  label!: string;
}

export class QuizDto implements Quiz {
  @ApiProperty({ format: 'uuid', description: 'Send back as quizVersionId when submitting' })
  versionId!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ type: [QuizQuestionDto] })
  questions!: QuizQuestionDto[];

  @ApiProperty({ type: [QuizOptionDto] })
  options!: QuizOptionDto[];
}
