export interface AuthUser {
  id: string;
  email: string;
}

/** Body of `POST /api/auth/register` and `POST /api/auth/login`. */
export interface CredentialsRequest {
  email: string;
  password: string;
  /** Claim token of a quiz finished while signed out, if there is one. */
  claimToken?: string;
}

/** Response of `POST /api/auth/register` and `POST /api/auth/login`. */
export interface AuthResponse {
  user: AuthUser;
  /** Whether the account has an attempt, that is, a report to show. */
  hasAttempt: boolean;
  /**
   * Whether the claim token sent with the request attached an attempt.
   * False when no token was sent, and when signing in with a token that is no
   * longer valid: signing in still succeeds, the stale result is just not saved.
   */
  attemptClaimed: boolean;
}

/** Response of `GET /api/auth/me`. */
export interface MeResponse {
  user: AuthUser;
  hasAttempt: boolean;
}
