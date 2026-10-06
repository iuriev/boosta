import type { MeResponse, Quiz, Report } from '@boosta/contracts';
import { cookies } from 'next/headers';

import { ApiError, toApiError } from './api-error';
import { API_ENDPOINTS } from './endpoints';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * API calls made on the Next.js server, by server components. The visitor's
 * cookies are forwarded so the API sees the same session the browser has.
 */
async function serverRequest<T>(path: string): Promise<T> {
  // Reading the cookies first marks the page as rendered per request, so the
  // build never tries to call the API (or needs API_URL) to prerender it.
  const cookie = (await cookies()).toString();
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error('API_URL is not configured');
  }
  const response = await fetch(new URL(`/api${path}`, apiUrl), {
    headers: { cookie },
    // Every response depends on the session or on the active quiz version.
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

export function fetchQuiz(): Promise<Quiz> {
  return serverRequest<Quiz>(API_ENDPOINTS.quiz);
}

/**
 * The signed-in user, or null when there is no valid session. On the pages
 * that use it only to choose a header link, pass `optional` so that a failure
 * of this one call does not take the whole page down.
 */
export async function fetchCurrentUser(
  { optional }: { optional: boolean } = { optional: false },
): Promise<MeResponse | null> {
  try {
    return await serverRequest<MeResponse>(API_ENDPOINTS.me);
  } catch (error) {
    if (optional || (error instanceof ApiError && error.status === 401)) {
      return null;
    }
    throw error;
  }
}

export type ReportResult =
  { status: 'ok'; report: Report } | { status: 'signed-out' } | { status: 'no-attempt' };

/** The report, or the reason there is none, so the page can decide where to send the visitor. */
export async function fetchReport(): Promise<ReportResult> {
  try {
    return { status: 'ok', report: await serverRequest<Report>(API_ENDPOINTS.report) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'signed-out' };
    }
    if (error instanceof ApiError && error.code === 'REPORT_NOT_FOUND') {
      return { status: 'no-attempt' };
    }
    throw error;
  }
}
