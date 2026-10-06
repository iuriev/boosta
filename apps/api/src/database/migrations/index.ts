import type { MigrationInterface } from 'typeorm';

import { CreateQuizVersions1791270000000 } from './1791270000000-create-quiz-versions';
import { PublishQuizVersion11791270100000 } from './1791270100000-publish-quiz-version-1';

/**
 * Every migration, oldest first. Listed explicitly instead of through a glob
 * so the same list works from TypeScript sources, compiled output and Jest.
 */
export const migrations: (new () => MigrationInterface)[] = [
  CreateQuizVersions1791270000000,
  PublishQuizVersion11791270100000,
];
