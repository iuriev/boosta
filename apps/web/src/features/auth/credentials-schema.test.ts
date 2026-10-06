import { describe, expect, it } from 'vitest';

import { signInSchema, signUpSchema } from './credentials-schema';

const messages = (result: ReturnType<typeof signUpSchema.safeParse>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.message);

describe('signUpSchema', () => {
  it('accepts an email and a password of 8 characters, trimming the email', () => {
    const result = signUpSchema.safeParse({ email: '  ada@example.com ', password: '12345678' });

    expect(result.data).toEqual({ email: 'ada@example.com', password: '12345678' });
  });

  it.each([
    ['an empty email', { email: '   ', password: '12345678' }, 'Enter your email'],
    ['a malformed email', { email: 'ada@', password: '12345678' }, 'Enter a valid email address'],
    [
      'a 7-character password',
      { email: 'a@b.co', password: '1234567' },
      'Use at least 8 characters',
    ],
    [
      'a 73-character password',
      { email: 'a@b.co', password: 'x'.repeat(73) },
      'Use at most 72 characters',
    ],
    [
      // 30 characters, 90 bytes: bcrypt would silently ignore the tail.
      'a password longer than 72 bytes',
      { email: 'a@b.co', password: '€'.repeat(30) },
      'This password is too long',
    ],
  ])('rejects %s', (_name, input, message) => {
    expect(messages(signUpSchema.safeParse(input))).toContain(message);
  });
});

describe('signInSchema', () => {
  it('accepts any non-empty password', () => {
    expect(signInSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success).toBe(true);
  });

  it('requires a password', () => {
    expect(messages(signInSchema.safeParse({ email: 'ada@example.com', password: '' }))).toEqual([
      'Enter your password',
    ]);
  });
});
