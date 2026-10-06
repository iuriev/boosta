import type { SubmitAttemptRequest, SubmitAttemptResponse } from '@boosta/contracts';

import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

/** Quiz attempt calls made from the browser. */
export const attemptsService = {
  /**
   * Submits a finished quiz. An anonymous visitor gets a claim token back; for
   * a signed-in user the attempt is attached to the account and the token is null.
   */
  submit: (request: SubmitAttemptRequest): Promise<SubmitAttemptResponse> =>
    apiRequest<SubmitAttemptResponse>(API_ENDPOINTS.attempts, { method: 'POST', body: request }),
};
