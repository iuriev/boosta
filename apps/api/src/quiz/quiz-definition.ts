/**
 * The content of one quiz version, stored as a single immutable JSON document.
 * Everything needed to validate and score an attempt lives here, so an old
 * attempt is always interpreted with the definition it was answered under.
 *
 * Assumptions the scoring relies on (checked for every published version by
 * the e2e suite): at least one question; question and option keys unique;
 * option scores are non-negative with at least one above zero, so a score of
 * 0 means "no traits"; the same options apply to every question; the
 * threshold lies between 0 and 100.
 */
export interface QuizDefinition {
  /** Ordered. `key` identifies the meaning of a question across versions. */
  questions: { key: string; text: string }[];
  /** Ordered. The same options apply to every question of the version. */
  options: { key: string; label: string; score: number }[];
  scoring: {
    /** Scores from 0 to 100 at or above this value mean "High ADHD Traits". */
    highThreshold: number;
  };
}
