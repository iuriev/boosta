import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HeaderLink } from '@/components/header-link';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ROUTES } from '@/config/routes';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { ReportView } from '@/features/report/report-view';
import { fetchReport } from '@/lib/api/server-api';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Your ADHD report' };

export default async function ReportPage() {
  const result = await fetchReport();
  if (result.status === 'signed-out') {
    redirect(ROUTES.signIn);
  }
  if (result.status === 'no-attempt') {
    redirect(ROUTES.start);
  }

  return (
    <div className={styles.page}>
      <SiteHeader
        actions={
          <>
            <HeaderLink href={ROUTES.start}>Retake test</HeaderLink>
            <SignOutButton />
          </>
        }
      />
      <main id="content" tabIndex={-1}>
        <ReportView report={result.report} />
      </main>
      <SiteFooter />
    </div>
  );
}
