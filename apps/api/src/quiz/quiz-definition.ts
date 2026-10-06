/**
 * The content of one quiz version, stored as a single immutable JSON document.
 * Everything needed to validate and score an attempt lives here, so an old
 * attempt is always interpreted with the definition it was answered under.
 *
 * `schemaVersion` names the structure of the document, as opposed to the quiz
 * version number, which names its content. Published documents are never
 * rewritten, so a new structure has to coexist with the old one: it becomes a
 * second interface in the `QuizDefinition` union, and the compiler then points
 * at every reader that must handle it.
 *
 * Assumptions the scoring relies on, enforced by the database with a CHECK
 * constraint on the column (`quiz_definition_is_valid`): a known
 * `schemaVersion`; at least one question; question and option keys unique;
 * option scores are non-negative with at least one above zero, so a score of
 * 0 means "no traits"; the threshold lies between 0 and 100.
 *
 * A limit of format 1: one option list serves every question, so a version
 * cannot mix answer scales or score a question in reverse.
 */
export interface QuizDefinitionV1 {
  schemaVersion: 1;
  /** Ordered. `key` identifies the meaning of a question across versions. */
  questions: { key: string; text: string }[];
  /** Ordered. The same options apply to every question of the version. */
  options: { key: string; label: string; score: number }[];
  scoring: {
    /** Scores from 0 to 100 at or above this value mean "High ADHD Traits". */
    highThreshold: number;
  };
}

export type QuizDefinition = QuizDefinitionV1;

const SUPPORTED_SCHEMA_VERSIONS: ReadonlySet<unknown> = new Set<QuizDefinition['schemaVersion']>([
  1,
]);

/**
 * Refuses a document this build cannot read. The database only stores formats
 * its CHECK constraint knows, but during a rolling deploy an older API can meet
 * a document published for a newer one; it must fail, not misread it.
 */
export function readQuizDefinition(stored: { schemaVersion?: unknown }): QuizDefinition {
  if (!SUPPORTED_SCHEMA_VERSIONS.has(stored.schemaVersion)) {
    throw new Error(
      `Quiz definition format ${JSON.stringify(stored.schemaVersion)} is not supported by this build`,
    );
  }
  return stored as QuizDefinition;
}
