import Link from 'next/link';

import { Logo } from '@/components/logo';

import styles from './status-page.module.css';

export default function NotFoundPage() {
  return (
    <main id="content" tabIndex={-1} className={styles.page}>
      <Logo href="/" />
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>
        This page does not exist. <Link href="/">Go to the start page</Link>
      </p>
    </main>
  );
}
