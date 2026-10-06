import { vi } from 'vitest';

/** What `useRouter()` returns in component tests. Assert on it to check navigation. */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};
