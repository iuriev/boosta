import type { Report } from '@boosta/contracts';

import { Gauge } from '../gauge';
import { ReportSection } from '../report-blocks';
import styles from './report-view.module.css';

export function ReportView({ report }: { report: Report }) {
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Your ADHD score</h1>
            <p className={styles.level}>{report.levelLabel}</p>
          </div>
          <Gauge score={report.score} />
        </div>
      </div>

      <div className={styles.sections}>
        {report.sections.map((block) => (
          <ReportSection key={block.key} block={block} />
        ))}
      </div>
    </>
  );
}
