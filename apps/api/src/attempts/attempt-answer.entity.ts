import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Attempt } from './attempt.entity';

/**
 * The raw answer to one question: keys only, no text and no score, so the row
 * stays meaningful whatever happens to later quiz versions.
 */
@Entity('attempt_answers')
export class AttemptAnswer {
  @PrimaryColumn({ name: 'attempt_id', type: 'uuid' })
  attemptId!: string;

  @PrimaryColumn({ name: 'question_key', type: 'text' })
  questionKey!: string;

  @Column({ name: 'option_key', type: 'text', update: false })
  optionKey!: string;

  @ManyToOne(() => Attempt, (attempt) => attempt.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt!: Attempt;
}
