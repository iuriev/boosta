import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { homeFor } from '@/config/routes';
import { AuthForm } from '@/features/auth/auth-form';
import { AuthPage } from '@/features/auth/auth-page';
import { fetchCurrentUser } from '@/lib/api/server-api';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage() {
  const user = await fetchCurrentUser();
  if (user) {
    redirect(homeFor(user));
  }

  return (
    <AuthPage
      size="medium"
      title="Sign in"
      subtitle="Welcome back! Let’s continue your learning journey"
    >
      <AuthForm mode="sign-in" />
    </AuthPage>
  );
}
