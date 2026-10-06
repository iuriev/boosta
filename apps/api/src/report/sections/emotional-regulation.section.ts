import { EMOTIONAL_REGULATION, SECTION_TITLES } from '../content/report-content';
import type { ReportSection } from '../report-engine';

export const emotionalRegulationSection: ReportSection = {
  key: 'emotional-regulation',
  build: ({ level, gender }) => {
    const { intro, items, outro } = EMOTIONAL_REGULATION[level][gender];
    const title = SECTION_TITLES.emotional;

    // Without a list there is nothing to introduce: it is a plain paragraph.
    if (items.length === 0) {
      return { type: 'text', title, text: intro };
    }
    return { type: 'text-with-bullets', title, intro, items, outro };
  },
};
