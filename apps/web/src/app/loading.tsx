import styles from './status-page.module.css';

/** Shown while a page waits for the API. */
export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true">
      <p className={styles.text} role="status">
        Loading…
      </p>
    </main>
  );
}
