import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A self-contained server bundle for the Docker image.
  output: 'standalone',
  // The app lives in a pnpm workspace; trace files from the repository root.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  poweredByHeader: false,
  // Next.js otherwise writes AGENTS.md and CLAUDE.md into this folder when the
  // dev server is started by an AI coding agent. The repository has its own.
  agentRules: false,
  headers() {
    return Promise.resolve([
      {
        // Pages must not be framed by other sites (clickjacking on the forms),
        // and browsers must not guess content types or leak full URLs.
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]);
  },
};

export default nextConfig;
