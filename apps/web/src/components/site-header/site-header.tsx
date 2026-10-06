import type { ReactNode } from 'react';

import { ROUTES } from '@/config/routes';

import { Logo } from '../logo';
import styles from './site-header.module.css';

interface SiteHeaderProps {
  /** Links or actions shown on the right. */
  actions?: ReactNode;
  /** Content under the header row, such as the quiz progress bar. */
  children?: ReactNode;
}

export function SiteHeader({ actions, children }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <Logo href={ROUTES.start} />
        {actions ? (
          <nav className={styles.actions} aria-label="Account">
            {actions}
          </nav>
        ) : null}
      </div>
      {children}
    </header>
  );
}
