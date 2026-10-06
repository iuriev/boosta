import { SiteHeader } from '@/components/site-header';
import { START_NOTICES, type StartNotice } from '@/config/routes';
import { SessionActions } from '@/features/auth/session-actions';
import { StartScreen } from '@/features/quiz/start-screen';
import { fetchCurrentUser, fetchQuiz } from '@/lib/api/server-api';

import styles from './page.module.css';

interface StartPageProps {
  searchParams: Promise<{ notice?: string | string[] }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const [quiz, user, { notice }] = await Promise.all([
    fetchQuiz(),
    fetchCurrentUser({ optional: true }),
    searchParams,
  ]);
  // The parameter is user input: only an exact, known key selects a message.
  const message =
    typeof notice === 'string' && Object.hasOwn(START_NOTICES, notice)
      ? START_NOTICES[notice as StartNotice]
      : undefined;

  return (
    <div className={styles.page}>
      <SiteHeader actions={<SessionActions user={user} />} />
      <main id="content" tabIndex={-1} className={styles.main}>
        {message ? (
          <p className={styles.notice} role="status">
            {message}
          </p>
        ) : null}
        <StartScreen quiz={quiz} />
      </main>
    </div>
  );
}
