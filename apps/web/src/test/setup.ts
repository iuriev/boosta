import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { createElement, type ImgHTMLAttributes } from 'react';
import { afterEach, vi } from 'vitest';

import { clearClaimToken, clearQuizProgress } from '@/features/quiz/quiz-storage';

import { router } from './router';

// The App Router is not mounted in component tests; components get a recording stand-in.
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The image optimizer needs the Next.js server; a plain <img> is enough to test markup.
vi.mock('next/image', () => ({
  default: ({ src, alt }: ImgHTMLAttributes<HTMLImageElement>) =>
    createElement('img', { src, alt }),
}));

afterEach(() => {
  cleanup();
  // The stores keep an in-memory copy, so clearing sessionStorage alone would not reset them.
  clearQuizProgress();
  clearClaimToken();
});
