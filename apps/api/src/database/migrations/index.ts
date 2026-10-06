import type { MigrationInterface } from 'typeorm';

import { CreateQuizVersions1791270000000 } from './1791270000000-create-quiz-versions';
import { PublishQuizVersion11791270100000 } from './1791270100000-publish-quiz-version-1';
import { CreateAttempts1791280000000 } from './1791280000000-create-attempts';
import { CreateUsers1791290000000 } from './1791290000000-create-users';

/**
 * Every migration, oldest first. Listed explicitly instead of through a glob
 * so the same list works from TypeScript sources, compiled output and Jest.
 */
export const migrations: (new () => MigrationInterface)[] = [
  CreateQuizVersions1791270000000,
  PublishQuizVersion11791270100000,
  CreateAttempts1791280000000,
  CreateUsers1791290000000,
];
