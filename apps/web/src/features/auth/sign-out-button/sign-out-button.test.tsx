import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  loadClaimToken,
  loadQuizProgress,
  saveClaimToken,
  saveQuizProgress,
} from '@/features/quiz/quiz-storage';
import { ApiError } from '@/lib/api/api-error';
import { authService } from '@/lib/api/auth-service';
import { router } from '@/test/router';

import { SignOutButton } from './sign-out-button';

vi.mock('@/lib/api/auth-service', () => ({
  authService: { register: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
const logout = vi.mocked(authService.logout);

describe('SignOutButton', () => {
  it('ends the session, leaves nothing of the quiz behind and opens sign-in', async () => {
    saveQuizProgress({ quizVersionId: 'version-1', gender: 'male', answers: {}, index: 0 });
    saveClaimToken('token-1');
    logout.mockResolvedValue();
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(loadQuizProgress()).toBeNull();
    expect(loadClaimToken()).toBeNull();
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/signin');
  });

  it('stays on the page and says so when signing out fails', async () => {
    logout.mockRejectedValue(new ApiError(0, 'Could not reach the server.'));
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByRole('button', { name: 'Sign out failed, try again' })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
