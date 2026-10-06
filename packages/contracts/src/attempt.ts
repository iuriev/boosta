export type Gender = 'male' | 'female';

export interface AttemptAnswer {
  questionKey: string;
  optionKey: string;
}

/** Body of `POST /api/attempts`. */
export interface SubmitAttemptRequest {
  quizVersionId: string;
  gender: Gender;
  answers: AttemptAnswer[];
}

/**
 * Response of `POST /api/attempts`. An anonymous visitor gets a one-time claim
 * token; a signed-in user gets `null` because the attempt is already theirs.
 */
export interface SubmitAttemptResponse {
  claimToken: string | null;
}
