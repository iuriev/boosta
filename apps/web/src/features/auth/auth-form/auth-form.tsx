'use client';

import type { AuthResponse } from '@boosta/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { clearClaimToken, loadClaimToken, useHasPendingResult } from '@/features/quiz/quiz-storage';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';

import { type Credentials, signInSchema, signUpSchema } from '../credentials-schema';
import styles from './auth-form.module.css';

interface AuthFormProps {
  mode: 'sign-up' | 'sign-in';
}

const COPY = {
  'sign-up': {
    endpoint: '/auth/register',
    submit: 'Get My Results',
    submitWithoutResult: 'Create account',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Create Password',
    passwordAutoComplete: 'new-password',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '/signin',
  },
  'sign-in': {
    endpoint: '/auth/login',
    submit: 'Sign in',
    submitWithoutResult: 'Sign in',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    passwordAutoComplete: 'current-password',
    switchPrompt: 'Don’t have an account?',
    switchLabel: 'Create account',
    switchHref: '/signup',
  },
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const copy = COPY[mode];
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // Stays true after a successful request, until the next page replaces this one.
  const [done, setDone] = useState(false);
  // A quiz finished before signing in waits in session storage as a claim token.
  // Most visitors reach sign-up from the quiz and sign-in without one.
  const hasPendingResult = useHasPendingResult(mode === 'sign-up');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(mode === 'sign-up' ? signUpSchema : signInSchema),
    // Validate when the user leaves a field; once it has an error, clear it as they type.
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (credentials: Credentials) => {
    setFormError(null);
    const claimToken = loadClaimToken();
    try {
      const result = await apiRequest<AuthResponse>(copy.endpoint, {
        method: 'POST',
        body: { ...credentials, claimToken: claimToken ?? undefined },
      });
      setDone(true);
      // Claimed or no longer claimable: either way the token has served its purpose.
      clearClaimToken();
      const resultWasLost = claimToken !== null && !result.attemptClaimed && !result.hasAttempt;
      if (result.hasAttempt) {
        router.replace('/report');
      } else {
        router.replace(resultWasLost ? '/?notice=result-expired' : '/');
      }
      router.refresh();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError(GENERIC_ERROR_MESSAGE);
        return;
      }
      switch (error.code) {
        case 'CLAIM_TOKEN_INVALID':
          // The result can no longer be attached; do not keep sending the dead token.
          clearClaimToken();
          setFormError(
            'Your quiz result is no longer available, so no account was created. ' +
              'Submit the form again to create an account, then take the quiz.',
          );
          break;
        case 'EMAIL_ALREADY_REGISTERED':
          setError(
            'email',
            { message: 'This email already has an account. Sign in instead.' },
            // Moves focus to the field, so the message is read out with it.
            { shouldFocus: true },
          );
          break;
        case 'INVALID_CREDENTIALS':
          setFormError('The email or password is not correct.');
          break;
        default:
          setFormError(
            error.status === 429
              ? 'Too many attempts. Please wait a minute and try again.'
              : error.message,
          );
      }
    }
  };

  return (
    <form
      className={styles.form}
      // If the form is submitted before the page is interactive, credentials
      // must go in a request body, never into the URL.
      method="post"
      // Validation messages come from the schema, shown next to each field.
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      <p className={styles.note}>Both fields are required.</p>

      <div className={styles.fields}>
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          // "username" is what password managers key a saved login on.
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          required
          placeholder={copy.emailPlaceholder}
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete={copy.passwordAutoComplete}
          enterKeyHint="done"
          required
          minLength={mode === 'sign-up' ? 8 : undefined}
          placeholder={copy.passwordPlaceholder}
          hint={mode === 'sign-up' ? 'At least 8 characters' : undefined}
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      {/* Always in the DOM so that screen readers announce a message when it appears. */}
      <p className={styles.formError} role="alert">
        {formError}
      </p>

      <Button type="submit" pending={isSubmitting || done} className={styles.submit}>
        {hasPendingResult ? copy.submit : copy.submitWithoutResult}
      </Button>

      <p className={styles.switch}>
        {copy.switchPrompt} <Link href={copy.switchHref}>{copy.switchLabel}</Link>
      </p>
    </form>
  );
}
