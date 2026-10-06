/** Paths of the API routes, relative to `/api`. Used by the services only. */
export const API_ENDPOINTS = {
  quiz: '/quiz',
  attempts: '/attempts',
  register: '/auth/register',
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
  report: '/report',
} as const;
