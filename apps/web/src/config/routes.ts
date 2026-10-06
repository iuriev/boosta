/**
 * Every page of the web app. Navigation, links and redirects take their paths
 * from here, so a path is written in exactly one place.
 */
export const ROUTES = {
  start: '/',
  quiz: '/quiz',
  signUp: '/signup',
  signIn: '/signin',
  report: '/report',
} as const;

/** Messages the start page can show, selected by the `notice` query parameter. */
export const START_NOTICES = {
  'result-expired':
    'Your earlier quiz result could no longer be saved. Take the quiz again to get your report.',
  'quiz-updated': 'The quiz was updated while you were taking it. Please start again.',
} as const;

export type StartNotice = keyof typeof START_NOTICES;

export const START_NOTICE_PARAM = 'notice';

/** The start page with a message explaining why the visitor landed there. */
export function startWithNotice(notice: StartNotice): string {
  return `${ROUTES.start}?${START_NOTICE_PARAM}=${notice}`;
}

/** Where a signed-in user belongs: their report, or the quiz if they have none yet. */
export function homeFor(user: { hasAttempt: boolean }): string {
  return user.hasAttempt ? ROUTES.report : ROUTES.start;
}
