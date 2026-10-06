'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { headerLinkStyles } from '@/components/header-link';
import { clearClaimToken, clearQuizProgress } from '@/features/quiz/quiz-storage';
import { apiRequest } from '@/lib/api/client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setPending(true);
    setFailed(false);
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
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
    router.replace('/signin');
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
