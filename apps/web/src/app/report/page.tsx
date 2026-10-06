import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { HeaderLink } from '@/components/header-link';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { ReportView } from '@/features/report/report-view';
import { fetchReport } from '@/lib/api/server';

import styles from './page.module.css';

export const metadata: Metadata = { title: 'Your ADHD report' };

export default async function ReportPage() {
  const result = await fetchReport();
  if (result.status === 'signed-out') {
    redirect('/signin');
  }
  if (result.status === 'no-attempt') {
    redirect('/');
  }

  return (
    <div className={styles.page}>
      <SiteHeader
        actions={
          <>
            <HeaderLink href="/">Retake test</HeaderLink>
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
