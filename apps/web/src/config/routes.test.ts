import { describe, expect, it } from 'vitest';

import { homeFor, START_NOTICES, startWithNotice } from './routes';

describe('routes', () => {
  it('sends a user with a report to it and a user without one to the quiz', () => {
    expect(homeFor({ hasAttempt: true })).toBe('/report');
    expect(homeFor({ hasAttempt: false })).toBe('/');
  });

  it('builds a start page address for every notice it can show', () => {
    for (const notice of Object.keys(START_NOTICES) as (keyof typeof START_NOTICES)[]) {
      expect(startWithNotice(notice)).toBe(`/?notice=${notice}`);
    }
  });
});
