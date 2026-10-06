import type { Gender } from '@boosta/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { QuizVersion } from '../quiz/quiz-version.entity';
import { AttemptAnswer } from './attempt-answer.entity';
import { GENDERS } from './gender';

/**
 * One finished pass through the quiz. It records what was answered, under
 * which quiz version and by whom; nothing derived (score, level, report) is
 * stored. Attempts are never deleted or rewritten when a user retakes the quiz.
 *
 * The migration is authoritative for what decorators cannot express: the
 * partial index on (user_id, created_at DESC) and the check that an attempt is
 * either owned or still claimable.
 */
@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'quiz_version_id', type: 'uuid', update: false })
  quizVersionId!: string;

  @ManyToOne(() => QuizVersion)
  @JoinColumn({ name: 'quiz_version_id' })
  quizVersion!: QuizVersion;

  @Column({ type: 'enum', enum: GENDERS, enumName: 'attempt_gender', update: false })
  gender!: Gender;

  /** Null while the attempt is anonymous. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  /** SHA-256 of the claim token. Present only while the attempt is unclaimed. Not loaded by default. */
  @Column({ name: 'claim_token_hash', type: 'text', nullable: true, unique: true, select: false })
  claimTokenHash!: string | null;

  @Column({ name: 'claim_expires_at', type: 'timestamptz', nullable: true, select: false })
  claimExpiresAt!: Date | null;

  /** Submission time. The latest one among a user's attempts is the current attempt. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => AttemptAnswer, (answer) => answer.attempt)
  answers!: AttemptAnswer[];
}
