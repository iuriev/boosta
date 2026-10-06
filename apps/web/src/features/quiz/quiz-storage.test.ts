import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as QuizStorage from './quiz-storage';

const PROGRESS: QuizStorage.QuizProgress = {
  quizVersionId: 'version-1',
  gender: 'female',
  answers: { focus: 'agree' },
  index: 1,
};

/** The module as a newly opened page would load it: nothing read from storage yet. */
async function freshModule(): Promise<typeof QuizStorage> {
  vi.resetModules();
  return import('./quiz-storage');
}

describe('quiz storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives back the progress that was saved, also after a reload', async () => {
    (await freshModule()).saveQuizProgress(PROGRESS);

    const afterReload = await freshModule();

    expect(afterReload.loadQuizProgress()).toEqual(PROGRESS);
  });

  it('returns the same object until the progress changes', async () => {
    const storage = await freshModule();
    storage.saveQuizProgress(PROGRESS);

    expect(storage.loadQuizProgress()).toBe(storage.loadQuizProgress());
  });

  it('forgets cleared progress', async () => {
    const storage = await freshModule();
    storage.saveQuizProgress(PROGRESS);

    storage.clearQuizProgress();

    expect(storage.loadQuizProgress()).toBeNull();
    expect((await freshModule()).loadQuizProgress()).toBeNull();
  });

  it.each([
    ['text that is not JSON', '{not json'],
    ['a value of another shape', JSON.stringify({ gender: 'female' })],
    ['an unknown gender', JSON.stringify({ ...PROGRESS, gender: 'other' })],
    ['a position that is not a whole number', JSON.stringify({ ...PROGRESS, index: 'two' })],
  ])('ignores stored progress holding %s', async (_name, stored) => {
    window.sessionStorage.setItem('boosta.quiz-progress', stored);

    expect((await freshModule()).loadQuizProgress()).toBeNull();
  });

  it('keeps the claim token until it is cleared', async () => {
    const storage = await freshModule();
    expect(storage.loadClaimToken()).toBeNull();

    storage.saveClaimToken('token-1');
    expect((await freshModule()).loadClaimToken()).toBe('token-1');

    (await freshModule()).clearClaimToken();
    expect((await freshModule()).loadClaimToken()).toBeNull();
  });

  it('works for the current page when the browser blocks storage', async () => {
    const blocked = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    vi.stubGlobal('sessionStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    const storage = await freshModule();

    expect(storage.loadQuizProgress()).toBeNull();
    storage.saveQuizProgress(PROGRESS);
    storage.saveClaimToken('token-1');

    expect(storage.loadQuizProgress()).toEqual(PROGRESS);
    expect(storage.loadClaimToken()).toBe('token-1');
  });
});
