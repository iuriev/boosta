import { Logo } from '../logo';
import styles from './site-footer.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Logo variant="on-dark" />
      <p>All rights reserved 2026</p>
    </footer>
  );
}
