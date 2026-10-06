import type { ApiErrorBody, ApiErrorCode } from '@boosta/contracts';

/** A non-2xx response from the API, or a request that never got one. */
export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request failed before a response arrived. */
    readonly status: number,
    message: string,
    /** Present for the cases the UI branches on. */
    readonly code?: ApiErrorCode,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isErrorBody = (value: unknown): value is Partial<ApiErrorBody> =>
  typeof value === 'object' && value !== null;

export const GENERIC_ERROR_MESSAGE = 'Something went wrong on our side. Please try again.';

/** Turns a failed response into an `ApiError`, whatever shape its body has. */
export async function toApiError(response: Response): Promise<ApiError> {
  if (response.status >= 500) {
    // Never show a server's own failure text to a user.
    return new ApiError(response.status, GENERIC_ERROR_MESSAGE);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!isErrorBody(body)) {
    return new ApiError(response.status, response.statusText || 'Request failed');
  }
  const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
  return new ApiError(
    response.status,
    message ?? (response.statusText || 'Request failed'),
    body.code,
  );
}
