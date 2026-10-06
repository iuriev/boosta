import type { AuthResponse, CredentialsRequest } from '@boosta/contracts';

import { apiRequest } from './client';
import { API_ENDPOINTS } from './endpoints';

/** Account and session calls made from the browser. */
export const authService = {
  /** Creates an account (or signs in to an existing one) and starts a session. */
  register: (request: CredentialsRequest): Promise<AuthResponse> =>
    apiRequest<AuthResponse>(API_ENDPOINTS.register, { method: 'POST', body: request }),

  login: (request: CredentialsRequest): Promise<AuthResponse> =>
    apiRequest<AuthResponse>(API_ENDPOINTS.login, { method: 'POST', body: request }),

  logout: (): Promise<void> => apiRequest<undefined>(API_ENDPOINTS.logout, { method: 'POST' }),
};
