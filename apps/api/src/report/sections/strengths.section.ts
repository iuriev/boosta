import { SECTION_TITLES, STRENGTHS } from '../content/report-content';
import type { ReportSection } from '../report-engine';

export const strengthsSection: ReportSection = {
  key: 'strengths',
  build: ({ level, gender }) => ({
    type: 'checklist',
    title: SECTION_TITLES.strengths,
    ...STRENGTHS[level][gender],
  }),
};
