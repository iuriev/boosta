/** A question as shown to the visitor. `key` is stable across quiz versions. */
export interface QuizQuestion {
  key: string;
  text: string;
}

/** An answer option as shown to the visitor. Scores are never sent to the client. */
export interface QuizOption {
  key: string;
  label: string;
}

/** Response of `GET /api/quiz`: the active quiz version. */
export interface Quiz {
  versionId: string;
  version: number;
  questions: QuizQuestion[];
  options: QuizOption[];
}
