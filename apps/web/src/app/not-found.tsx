import type { Metadata } from 'next';
import Link from 'next/link';

import { Logo } from '@/components/logo';
import { ROUTES } from '@/config/routes';

import styles from './status-page.module.css';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFoundPage() {
  return (
    <main id="content" tabIndex={-1} className={styles.page}>
      <Logo href={ROUTES.start} />
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>
        This page does not exist. <Link href={ROUTES.start}>Go to the start page</Link>
      </p>
    </main>
  );
}
