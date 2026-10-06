/**
 * Machine-readable reasons the web app branches on. Other errors carry only
 * the HTTP status and a message.
 */
export type ApiErrorCode =
  /** The submitted quiz version is unknown or no longer active: reload the quiz. */
  | 'QUIZ_VERSION_OUTDATED'
  /** The answers do not match the quiz version (missing, duplicated or unknown keys). */
  | 'ATTEMPT_INVALID'
  /** The claim token is unknown, already used or expired: the quiz must be retaken. */
  | 'CLAIM_TOKEN_INVALID'
  /** Unknown email or wrong password; deliberately not distinguished. */
  | 'INVALID_CREDENTIALS'
  /** Registration with an email that has an account, and a password that does not match it. */
  | 'EMAIL_ALREADY_REGISTERED'
  /** The signed-in user has not taken the quiz yet. */
  | 'REPORT_NOT_FOUND';

/** Body of every error response. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: ApiErrorCode;
}
