/**
 * The content of one quiz version, stored as a single immutable JSON document.
 * Everything needed to validate and score an attempt lives here, so an old
 * attempt is always interpreted with the definition it was answered under.
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
