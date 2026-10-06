import type { MeResponse } from '@boosta/contracts';

import { HeaderLink } from '@/components/header-link';
import { ROUTES } from '@/config/routes';

import { SignOutButton } from '../sign-out-button';

/**
 * Header entry point for the start screen and the quiz: "Sign in" for a
 * visitor, "My report" for a signed-in user who has one. A signed-in user
 * without a report gets "Sign out", so there is always a way out of the session.
 */
export function SessionActions({ user }: { user: MeResponse | null }) {
  if (!user) {
    return <HeaderLink href={ROUTES.signIn}>Sign in</HeaderLink>;
  }
  if (user.hasAttempt) {
    return <HeaderLink href={ROUTES.report}>My report</HeaderLink>;
  }
  return <SignOutButton />;
}
