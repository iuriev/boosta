import type {
  ChecklistBlock,
  FaqBlock,
  Gender,
  Report,
  ReportBlock,
  TextBlock,
  TextWithBulletsBlock,
  TraitLevel,
} from '@boosta/contracts';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

import { GENDERS } from '../../attempts/gender';

// These classes exist to describe the response in OpenAPI; the service returns
// plain objects of the contract types.

class BlockDto {
  @ApiProperty({ description: 'Stable identifier of the section, for example `strengths`' })
  key!: string;

  @ApiProperty()
  title!: string;
}

export class TextBlockDto extends BlockDto implements TextBlock {
  @ApiProperty({ enum: ['text'] })
  type!: 'text';

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional({ enum: ['callout'] })
  variant?: 'callout';
}

export class ChecklistBlockDto extends BlockDto implements ChecklistBlock {
  @ApiProperty({ enum: ['checklist'] })
  type!: 'checklist';

  @ApiPropertyOptional()
  intro?: string;

  @ApiProperty({ type: [String] })
  items!: string[];
}

export class TextWithBulletsBlockDto extends BlockDto implements TextWithBulletsBlock {
  @ApiProperty({ enum: ['text-with-bullets'] })
  type!: 'text-with-bullets';

  @ApiProperty()
  intro!: string;

  @ApiProperty({ type: [String] })
  items!: string[];

  @ApiPropertyOptional()
  outro?: string;
}

class FaqItemDto {
  @ApiProperty()
  question!: string;

  @ApiProperty()
  answer!: string;
}

export class FaqBlockDto extends BlockDto implements FaqBlock {
  @ApiProperty({ enum: ['faq'] })
  type!: 'faq';

  @ApiProperty({ type: [FaqItemDto] })
  items!: FaqItemDto[];
}

@ApiExtraModels(TextBlockDto, ChecklistBlockDto, TextWithBulletsBlockDto, FaqBlockDto)
export class ReportDto implements Report {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: 100, example: 74 })
  score!: number;

  @ApiProperty({ enum: ['high', 'low'] })
  level!: TraitLevel;

  @ApiProperty({ example: 'High ADHD Traits' })
  levelLabel!: string;

  @ApiProperty({ enum: GENDERS })
  gender!: Gender;

  @ApiProperty({
    format: 'date-time',
    description: 'When the attempt behind the report was submitted',
  })
  submittedAt!: string;

  @ApiProperty({
    description: 'Ordered presentation blocks; render each by its `type`',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(TextBlockDto) },
        { $ref: getSchemaPath(ChecklistBlockDto) },
        { $ref: getSchemaPath(TextWithBulletsBlockDto) },
        { $ref: getSchemaPath(FaqBlockDto) },
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          text: getSchemaPath(TextBlockDto),
          checklist: getSchemaPath(ChecklistBlockDto),
          'text-with-bullets': getSchemaPath(TextWithBulletsBlockDto),
          faq: getSchemaPath(FaqBlockDto),
        },
      },
    },
  })
  sections!: ReportBlock[];
}
