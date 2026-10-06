import { type NextRequest, NextResponse } from 'next/server';

/** Headers a client could use to claim an address or origin that is not its own. */
const FORWARDING_HEADERS = ['x-forwarded-for', 'x-real-ip', 'forwarded'];

/**
 * Forwards `/api/*` to the API application.
 *
 * The browser only ever talks to this app's origin, so the session cookie is
 * first-party and no CORS setup is needed. The target is read from the
 * environment at run time, which lets one build run against any API address.
 */
export function proxy(request: NextRequest): NextResponse {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { statusCode: 500, error: 'Internal Server Error', message: 'API_URL is not configured' },
      { status: 500 },
    );
  }

  const headers = new Headers(request.headers);
  // The API rate-limits by client address. Unless something in front of this
  // app is known to set these headers itself, they are whatever the client
  // sent, and passing them on would let it pick a fresh address per request.
  // Without them the API sees this server as the client, which is safe.
  if (process.env.TRUST_FORWARDED_HEADERS !== 'true') {
    for (const name of FORWARDING_HEADERS) {
      headers.delete(name);
    }
  }

  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, apiUrl), { request: { headers } });
}

export const config = {
  matcher: '/api/:path*',
};
