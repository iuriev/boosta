import { createHash, randomBytes } from 'node:crypto';

export const CLAIM_TOKEN_TTL_HOURS = 24;

/** 256 bits of randomness: unguessable, so a plain fast hash is enough to store it. */
export function generateClaimToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only this hash is stored; the token itself exists on the client alone. */
export function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
