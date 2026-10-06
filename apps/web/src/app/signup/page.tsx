import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/features/auth/auth-form';
import { AuthPage } from '@/features/auth/auth-page';
import { PendingResultText } from '@/features/auth/pending-result-text';
import { fetchCurrentUser } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignUpPage() {
  const user = await fetchCurrentUser();
  if (user) {
    redirect(user.hasAttempt ? '/report' : '/');
  }

  return (
    <AuthPage
      size="large"
      title={
        <>
          Discover your <span className="accent">ADHD</span> Profile
        </>
      }
      subtitle={
        <PendingResultText
          withResult="Enter your email and password to access your full report"
          withoutResult="Create an account, then take the test to get your report"
        />
      }
    >
      <AuthForm mode="sign-up" />
    </AuthPage>
  );
}
