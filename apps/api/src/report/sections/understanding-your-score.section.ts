import { SECTION_TITLES, UNDERSTANDING_TEXT } from '../content/report-content';
import type { ReportSection } from '../report-engine';

export const understandingYourScoreSection: ReportSection = {
  key: 'understanding-your-score',
  build: ({ level, gender }) => ({
    type: 'text',
    title: SECTION_TITLES.understanding,
    text: UNDERSTANDING_TEXT[level][gender],
    variant: 'callout',
  }),
};
