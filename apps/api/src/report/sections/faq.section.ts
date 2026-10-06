import { FAQ, SECTION_TITLES } from '../content/report-content';
import type { ReportSection } from '../report-engine';

export const faqSection: ReportSection = {
  key: 'faq',
  build: ({ level }) => ({
    type: 'faq',
    title: SECTION_TITLES.faq,
    items: FAQ[level],
  }),
};
