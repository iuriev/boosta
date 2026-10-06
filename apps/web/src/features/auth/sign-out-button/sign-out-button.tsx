'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { headerLinkStyles } from '@/components/header-link';
import { ROUTES } from '@/config/routes';
import { clearClaimToken, clearQuizProgress } from '@/features/quiz/quiz-storage';
import { authService } from '@/lib/api/auth-service';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setPending(true);
    setFailed(false);
    try {
      await authService.logout();
    } catch {
      // Still signed in: say so instead of sending the user to a page that
      // would bounce them straight back.
      setPending(false);
      setFailed(true);
      return;
    }
    // Nothing of this user's quiz may be left for the next person on this tab.
    clearQuizProgress();
    clearClaimToken();
    router.replace(ROUTES.signIn);
    // Drops the pages the router has cached for the signed-in user: without
    // it the back button shows their report after they have signed out.
    router.refresh();
  };

  return (
    <button
      type="button"
      className={headerLinkStyles.link}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={() => void signOut()}
    >
      <Image src="/images/sign-out.svg" alt="" width={20} height={20} unoptimized />
      {failed ? 'Sign out failed, try again' : 'Sign out'}
    </button>
  );
}
