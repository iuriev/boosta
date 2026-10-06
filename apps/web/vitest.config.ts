import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Component and unit tests. The browser test of the whole funnel is in `e2e/` and runs with Playwright. */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // Calls and implementations are forgotten between tests, so none passes on another's arrangement.
    mockReset: true,
    restoreMocks: true,
    // Class names as written in the CSS module, so a failure message stays readable.
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
