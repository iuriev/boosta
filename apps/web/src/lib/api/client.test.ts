import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-error';
import { apiRequest } from './client';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const failure = async (): Promise<ApiError> => {
  const error: unknown = await apiRequest('/auth/login', { method: 'POST', body: {} }).catch(
    (caught: unknown) => caught,
  );
  if (!(error instanceof ApiError)) {
    throw new Error('Expected the request to fail with an ApiError');
  }
  return error;
};

describe('apiRequest', () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it('posts JSON to this origin under /api and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(json(201, { claimToken: 'token-1' }));

    const result = await apiRequest('/attempts', { method: 'POST', body: { gender: 'male' } });

    expect(result).toEqual({ claimToken: 'token-1' });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"gender":"male"}',
    });
  });

  it('returns nothing for a response without content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('carries the error code the UI branches on', async () => {
    fetchMock.mockResolvedValue(
      json(409, { statusCode: 409, code: 'QUIZ_VERSION_OUTDATED', message: 'Reload the quiz' }),
    );

    expect(await failure()).toMatchObject({
      status: 409,
      code: 'QUIZ_VERSION_OUTDATED',
      message: 'Reload the quiz',
    });
  });

  it('joins the messages of a validation error', async () => {
    fetchMock.mockResolvedValue(json(400, { message: ['email must be an email', 'too short'] }));

    expect((await failure()).message).toBe('email must be an email. too short');
  });

  it('never shows the text of a server failure', async () => {
    fetchMock.mockResolvedValue(json(500, { message: 'relation "users" does not exist' }));

    expect(await failure()).toMatchObject({
      status: 500,
      message: 'Something went wrong on our side. Please try again.',
    });
  });

  it('copes with an error response that is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 404, statusText: 'Not Found' }));

    expect(await failure()).toMatchObject({ status: 404, message: 'Not Found' });
  });

  it('reports a request that never reached the server with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await failure()).toMatchObject({
      status: 0,
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });
});
