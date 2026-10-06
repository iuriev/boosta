import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './header-link.module.css';

export function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className={styles.link} href={href}>
      {children}
    </Link>
  );
}

export { styles as headerLinkStyles };
