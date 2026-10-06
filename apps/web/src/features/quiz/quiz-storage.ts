import type { Gender } from '@boosta/contracts';
import { useSyncExternalStore } from 'react';

/**
 * Quiz progress and the pending claim token live in `sessionStorage`: they
 * survive a reload, belong to one tab, and disappear when it closes.
 *
 * Each value is exposed as a small external store, so components read it with
 * `useSyncExternalStore` and re-render when it changes. An in-memory copy is
 * the source of truth and `sessionStorage` mirrors it, which keeps the quiz
 * working when storage is unavailable (private mode, blocked storage).
 */

export interface QuizProgress {
  quizVersionId: string;
  gender: Gender;
  /** Option key by question key. */
  answers: Record<string, string>;
  /** Index of the question on screen. */
  index: number;
}

function createSessionStore(key: string) {
  /** `undefined` until the stored value has been read once. */
  let value: string | null | undefined;
  const listeners = new Set<() => void>();

  const read = (): string | null => {
    if (value === undefined) {
      try {
        value = window.sessionStorage.getItem(key);
      } catch {
        value = null;
      }
    }
    return value;
  };

  const write = (next: string | null): void => {
    value = next;
    try {
      if (next === null) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, next);
      }
    } catch {
      // Storage full or blocked: the value lives in memory for this page only.
    }
    listeners.forEach((listener) => {
      listener();
    });
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { read, write, subscribe };
}

const progressStore = createSessionStore('boosta.quiz-progress');
const claimTokenStore = createSessionStore('boosta.claim-token');

function isQuizProgress(value: unknown): value is QuizProgress {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.quizVersionId === 'string' &&
    (candidate.gender === 'male' || candidate.gender === 'female') &&
    typeof candidate.answers === 'object' &&
    candidate.answers !== null &&
    Number.isInteger(candidate.index)
  );
}

// `useSyncExternalStore` needs the same object for the same stored string.
let parsedFrom: string | null = null;
let parsedProgress: QuizProgress | null = null;

export function loadQuizProgress(): QuizProgress | null {
  const raw = progressStore.read();
  if (raw !== parsedFrom) {
    parsedFrom = raw;
    try {
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      parsedProgress = isQuizProgress(parsed) ? parsed : null;
    } catch {
      parsedProgress = null;
    }
  }
  return parsedProgress;
}

export function saveQuizProgress(progress: QuizProgress): void {
  progressStore.write(JSON.stringify(progress));
}

export function clearQuizProgress(): void {
  progressStore.write(null);
}

/** The saved quiz progress, or null when there is none. Null on the server. */
export function useQuizProgress(): QuizProgress | null {
  return useSyncExternalStore(progressStore.subscribe, loadQuizProgress, () => null);
}

/** The token of a quiz finished while signed out, waiting to be attached to an account. */
export function loadClaimToken(): string | null {
  const token = claimTokenStore.read();
  return token === null || token === '' ? null : token;
}

export function saveClaimToken(claimToken: string): void {
  claimTokenStore.write(claimToken);
}

export function clearClaimToken(): void {
  claimTokenStore.write(null);
}

/**
 * Whether a finished quiz is waiting to be attached to an account. The server
 * cannot know, so the caller says what to assume there: the value that is
 * right for most visitors of that page, to avoid a flash of the other one.
 */
export function useHasPendingResult(assumeOnServer: boolean): boolean {
  return useSyncExternalStore(
    claimTokenStore.subscribe,
    () => loadClaimToken() !== null,
    () => assumeOnServer,
  );
}
