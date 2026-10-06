import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/site-header';

import styles from './auth-page.module.css';

interface AuthPageProps {
  title: ReactNode;
  subtitle: ReactNode;
  /** The account-creation title is larger than the sign-in one in the design. */
  size: 'large' | 'medium';
  children: ReactNode;
}

/** Shared frame of the account-creation and sign-in pages. */
export function AuthPage({ title, subtitle, size, children }: AuthPageProps) {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="content" tabIndex={-1} className={styles.main}>
        <div className={styles.intro} data-size={size}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
