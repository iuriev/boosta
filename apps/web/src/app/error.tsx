'use client';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { ROUTES } from '@/config/routes';

import styles from './status-page.module.css';

/** Shown when a page fails to render, for example because the API cannot be reached. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="content" tabIndex={-1} className={styles.page}>
      <Logo href={ROUTES.start} />
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.text}>We could not load this page. Please try again in a moment.</p>
      <Button
        onClick={() => {
          reset();
        }}
      >
        Try again
      </Button>
    </main>
  );
}
