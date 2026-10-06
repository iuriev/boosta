import type { ReportSection } from './report-engine';
import { emotionalRegulationSection } from './sections/emotional-regulation.section';
import { faqSection } from './sections/faq.section';
import { strengthsSection } from './sections/strengths.section';
import { understandingYourScoreSection } from './sections/understanding-your-score.section';

/**
 * The report, as an ordered list of sections. This is the current report
 * logic: every report is built from it at read time, whichever quiz version
 * the attempt was taken against.
 *
 * To add a section, write a `ReportSection` and list it here. It then appears
 * in the reports of existing attempts as well, provided the data it needs is
 * there:
 *
 * - a section that reads specific answers declares their question keys in
 *   `requires` and reads `context.answers`; attempts from quiz versions without
 *   those questions simply do not get it;
 * - a section that compares with earlier attempts reads
 *   `context.previousAttempts` and returns `null` when there are none.
 *
 * The four sections below depend only on level and gender, as in the design.
 */
export const REPORT_SECTIONS: readonly ReportSection[] = [
  understandingYourScoreSection,
  strengthsSection,
  emotionalRegulationSection,
  faqSection,
];
