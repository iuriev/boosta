import { generateClaimToken, hashClaimToken } from './claim-token';

describe('claim token', () => {
  it('is long, URL-safe and different every time', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateClaimToken));

    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('hashes deterministically and never to the token itself', () => {
    const token = generateClaimToken();

    expect(hashClaimToken(token)).toBe(hashClaimToken(token));
    expect(hashClaimToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClaimToken(token)).not.toContain(token);
  });
});
