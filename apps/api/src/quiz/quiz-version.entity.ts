import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { type QuizDefinition, readQuizDefinition } from './quiz-definition';

/**
 * A published quiz. Rows are created by migrations and never edited: the
 * database rejects changes to `version` and `definition`, and only one row can
 * be active at a time.
 */
@Entity('quiz_versions')
export class QuizVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true, update: false })
  version!: number;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  /** Checked every time the entity is loaded, directly or through a relation. Raw SQL bypasses it. */
  @Column({
    type: 'jsonb',
    update: false,
    transformer: {
      to: (definition: QuizDefinition) => definition,
      from: (stored: { schemaVersion?: unknown } | null | undefined) =>
        stored ? readQuizDefinition(stored) : stored,
    },
  })
  definition!: QuizDefinition;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
