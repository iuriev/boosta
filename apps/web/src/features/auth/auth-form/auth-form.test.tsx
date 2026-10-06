import type { AuthResponse } from '@boosta/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { loadClaimToken, saveClaimToken } from '@/features/quiz/quiz-storage';
import { ApiError } from '@/lib/api/api-error';
import { authService } from '@/lib/api/auth-service';
import { router } from '@/test/router';

import { AuthForm } from './auth-form';

vi.mock('@/lib/api/auth-service', () => ({
  authService: { register: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
const register = vi.mocked(authService.register);
const login = vi.mocked(authService.login);

const response = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  user: { id: 'user-1', email: 'ada@example.com' },
  hasAttempt: true,
  attemptClaimed: true,
  ...overrides,
});

async function fillAndSubmit(button: string, email = 'ada@example.com', password = 'long enough') {
  const user = userEvent.setup();
  if (email) {
    await user.type(screen.getByLabelText('Email'), email);
  }
  if (password) {
    await user.type(screen.getByLabelText('Password'), password);
  }
  await user.click(screen.getByRole('button', { name: button }));
}

describe('AuthForm', () => {
  describe('creating an account after the quiz', () => {
    it('sends the credentials with the claim token and opens the report', async () => {
      saveClaimToken('token-1');
      register.mockResolvedValue(response());
      render(<AuthForm mode="sign-up" />);

      await fillAndSubmit('Get My Results');

      expect(register).toHaveBeenCalledExactlyOnceWith({
        email: 'ada@example.com',
        password: 'long enough',
        claimToken: 'token-1',
      });
      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/report');
      expect(loadClaimToken()).toBeNull();
    });

    it('says the result is gone, and stops sending the token, when it cannot be claimed', async () => {
      saveClaimToken('expired-token');
      register.mockRejectedValue(new ApiError(400, 'Expired', 'CLAIM_TOKEN_INVALID'));
      render(<AuthForm mode="sign-up" />);

      await fillAndSubmit('Get My Results');

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Your quiz result is no longer available, so no account was created.',
      );
      expect(router.replace).not.toHaveBeenCalled();
      expect(loadClaimToken()).toBeNull();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    });
  });

  describe('creating an account without a finished quiz', () => {
    it('sends no claim token and leads to the quiz', async () => {
      register.mockResolvedValue(response({ hasAttempt: false, attemptClaimed: false }));
      render(<AuthForm mode="sign-up" />);

      await fillAndSubmit('Create account');

      expect(register).toHaveBeenCalledExactlyOnceWith({
        email: 'ada@example.com',
        password: 'long enough',
        claimToken: undefined,
      });
      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/');
    });

    it('points at the email field when the email already has an account', async () => {
      register.mockRejectedValue(new ApiError(409, 'Taken', 'EMAIL_ALREADY_REGISTERED'));
      render(<AuthForm mode="sign-up" />);

      await fillAndSubmit('Create account');

      const email = screen.getByLabelText('Email');
      expect(email).toBeInvalid();
      expect(email).toHaveAccessibleDescription(
        'This email already has an account. Sign in instead.',
      );
      expect(email).toHaveFocus();
    });
  });

  describe('validation before anything is sent', () => {
    it('requires an email and a password of at least 8 characters to sign up', async () => {
      render(<AuthForm mode="sign-up" />);

      await fillAndSubmit('Create account', '', 'short');

      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email');
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        'At least 8 characters Use at least 8 characters',
      );
      expect(register).not.toHaveBeenCalled();
    });

    it('rejects something that is not an email address', async () => {
      render(<AuthForm mode="sign-up" />);

      await fillAndSubmit('Create account', 'ada@');

      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Enter a valid email address',
      );
      expect(register).not.toHaveBeenCalled();
    });

    it('leaves judging the password to the API when signing in', async () => {
      login.mockResolvedValue(response());
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in', 'ada@example.com', 'short');

      expect(login).toHaveBeenCalledTimes(1);
    });
  });

  describe('signing in', () => {
    it('opens the report of a user who has one', async () => {
      login.mockResolvedValue(response({ attemptClaimed: false }));
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/report');
      expect(router.refresh).toHaveBeenCalled();
    });

    it('leads a user without an attempt to the quiz', async () => {
      login.mockResolvedValue(response({ hasAttempt: false, attemptClaimed: false }));
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/');
    });

    it('attaches a quiz finished while signed out', async () => {
      saveClaimToken('token-1');
      login.mockResolvedValue(response());
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(login).toHaveBeenCalledWith(expect.objectContaining({ claimToken: 'token-1' }));
      expect(loadClaimToken()).toBeNull();
    });

    it('explains that the finished quiz was lost when its token no longer works', async () => {
      saveClaimToken('expired-token');
      login.mockResolvedValue(response({ hasAttempt: false, attemptClaimed: false }));
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/?notice=result-expired');
      expect(loadClaimToken()).toBeNull();
    });

    it('reports wrong credentials without saying which part was wrong', async () => {
      login.mockRejectedValue(new ApiError(401, 'Invalid', 'INVALID_CREDENTIALS'));
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(screen.getByRole('alert')).toHaveTextContent('The email or password is not correct.');
      expect(router.replace).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });

    it('asks to wait when there were too many attempts', async () => {
      login.mockRejectedValue(new ApiError(429, 'ThrottlerException: Too Many Requests'));
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many attempts. Please wait a minute and try again.',
      );
    });

    it('shows a general message for a failure that is not from the API', async () => {
      login.mockRejectedValue(new TypeError('boom'));
      render(<AuthForm mode="sign-in" />);

      await fillAndSubmit('Sign in');

      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on our side.');
    });
  });

  it('links each form to the other one', () => {
    const { unmount } = render(<AuthForm mode="sign-up" />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
    unmount();

    render(<AuthForm mode="sign-in" />);
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup');
  });
});
