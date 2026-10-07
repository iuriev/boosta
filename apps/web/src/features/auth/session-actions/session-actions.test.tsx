import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SessionActions } from './session-actions';

vi.mock('@/lib/api/auth-service', () => ({
  authService: { register: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));

const USER = { id: 'user-1', email: 'user@example.com' };

describe('SessionActions', () => {
  it('offers a visitor the way to sign in', () => {
    render(<SessionActions user={null} />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('offers a signed-in user their report', () => {
    render(<SessionActions user={{ user: USER, hasAttempt: true }} />);

    expect(screen.getByRole('link', { name: 'My report' })).toHaveAttribute('href', '/report');
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('offers a signed-in user without a report the way out of the session', () => {
    render(<SessionActions user={{ user: USER, hasAttempt: false }} />);

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My report' })).not.toBeInTheDocument();
  });
});
