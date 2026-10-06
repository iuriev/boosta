// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { proxy } from './proxy';

const requestWithForgedAddress = () =>
  new NextRequest('http://web.test/api/auth/login?source=form', {
    method: 'POST',
    headers: {
      'x-forwarded-for': '203.0.113.7',
      'x-real-ip': '203.0.113.7',
      forwarded: 'for=203.0.113.7',
      cookie: 'session=abc',
    },
  });

/** Names of the request headers the API will receive. */
const forwardedHeaderNames = (response: Response) =>
  (response.headers.get('x-middleware-override-headers') ?? '').split(',');

describe('proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('forwards the path and query to the API', () => {
    vi.stubEnv('API_URL', 'http://api.test:3001');

    const response = proxy(requestWithForgedAddress());

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://api.test:3001/api/auth/login?source=form',
    );
    expect(forwardedHeaderNames(response)).toContain('cookie');
  });

  it('drops the headers a client could use to pose as another address', () => {
    vi.stubEnv('API_URL', 'http://api.test:3001');

    const names = forwardedHeaderNames(proxy(requestWithForgedAddress()));

    expect(names).not.toContain('x-forwarded-for');
    expect(names).not.toContain('x-real-ip');
    expect(names).not.toContain('forwarded');
  });

  it('keeps them when a trusted proxy in front of this app sets them', () => {
    vi.stubEnv('API_URL', 'http://api.test:3001');
    vi.stubEnv('TRUST_FORWARDED_HEADERS', 'true');

    const response = proxy(requestWithForgedAddress());

    expect(forwardedHeaderNames(response)).toContain('x-forwarded-for');
    expect(response.headers.get('x-middleware-request-x-forwarded-for')).toBe('203.0.113.7');
  });

  it('answers with an error instead of guessing when the API address is not configured', async () => {
    vi.stubEnv('API_URL', '');

    const response = proxy(requestWithForgedAddress());

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ message: 'API_URL is not configured' });
  });
});
