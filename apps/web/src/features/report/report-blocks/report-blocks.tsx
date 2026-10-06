import type { ReportBlock } from '@boosta/contracts';
import Image from 'next/image';

import { cx } from '@/lib/cx';

import styles from './report-blocks.module.css';

/**
 * Renders one report section by its block type. The page does not know which
 * sections exist: a new section that uses an existing block type appears with
 * no change here.
 */
export function ReportSection({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <section className={styles.section} data-variant={block.variant}>
          <h2 className={styles.title}>{block.title}</h2>
          <p className={styles.body}>{block.text}</p>
        </section>
      );

    case 'checklist':
      if (block.items.length === 0) {
        return null;
      }
      return (
        <section className={styles.section}>
          <div className={styles.heading}>
            <h2 className={styles.title}>{block.title}</h2>
            {block.intro ? <p className={styles.body}>{block.intro}</p> : null}
          </div>
          <ul className={styles.checklist}>
            {block.items.map((item, index) => (
              // Items are static text and may repeat; position makes the key unique.
              <li key={`${String(index)}-${item}`} className={styles.checkItem}>
                <span className={styles.checkIcon}>
                  <Image src="/images/check.svg" alt="" width={16} height={16} unoptimized />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      );

    case 'text-with-bullets':
      return (
        <section className={styles.section}>
          <div className={styles.heading}>
            <h2 className={styles.title}>{block.title}</h2>
            <p className={styles.body}>{block.intro}</p>
          </div>
          <ul className={styles.bullets}>
            {block.items.map((item, index) => (
              <li key={`${String(index)}-${item}`}>{item}</li>
            ))}
          </ul>
          {block.outro ? <p className={styles.body}>{block.outro}</p> : null}
        </section>
      );

    case 'faq':
      if (block.items.length === 0) {
        return null;
      }
      return (
        <section className={cx(styles.section, styles.faq)}>
          <h2 className={cx(styles.title, styles.faqTitle)}>{block.title}</h2>
          <div className={styles.faqList}>
            {block.items.map((item, index) => (
              // Native disclosure: keyboard support, state and find-in-page
              // come from the browser. The first one starts open, as designed.
              <details
                key={`${String(index)}-${item.question}`}
                className={styles.faqItem}
                open={index === 0}
              >
                <summary className={styles.faqQuestion}>
                  {item.question}
                  <span className={styles.faqIcon}>
                    <Image src="/images/chevron.svg" alt="" width={12} height={12} unoptimized />
                  </span>
                </summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );

    default:
      // A block type added to the API after this build: leave it out rather than fail.
      return null;
  }
}
