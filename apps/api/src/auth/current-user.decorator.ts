import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestWithSession, SessionUser } from './session';

const readUser = (context: ExecutionContext): SessionUser | undefined =>
  context.switchToHttp().getRequest<RequestWithSession>().user;

/**
 * The signed-in user of a protected route. The session guard has already
 * rejected the request if there is none, so this never yields null; using it
 * on a `@Public()` route is a programming error and fails loudly.
 *
 * The identity always comes from the session cookie, never from the request
 * body or URL.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const user = readUser(context);
    if (!user) {
      throw new Error('@CurrentUser() used on a route that allows requests without a session');
    }
    return user;
  },
);

/** The signed-in user of a `@Public()` route, or null when the caller has no session. */
export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | null => readUser(context) ?? null,
);
