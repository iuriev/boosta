import type { Gender, ReportBlock, TraitLevel } from '@boosta/contracts';

import { REPORT_SECTIONS } from './report-definition';
import { buildSections, type ReportContext } from './report-engine';

const build = (level: TraitLevel, gender: Gender): ReportBlock[] => {
  const context: ReportContext = {
    gender,
    level,
    score: level === 'high' ? 74 : 52,
    answers: new Map(),
    questionKeys: new Set(),
    quizVersion: 1,
    submittedAt: new Date(),
    previousAttempts: [],
  };
  return buildSections(REPORT_SECTIONS, context);
};

const VARIANTS: [TraitLevel, Gender][] = [
  ['high', 'male'],
  ['high', 'female'],
  ['low', 'male'],
  ['low', 'female'],
];

const section = (blocks: ReportBlock[], key: string): ReportBlock => {
  const block = blocks.find((candidate) => candidate.key === key);
  if (!block) {
    throw new Error(`No section "${key}"`);
  }
  return block;
};

describe('the report definition', () => {
  it.each(VARIANTS)('has the four sections in order for %s traits, %s', (level, gender) => {
    expect(build(level, gender).map(({ key, title }) => [key, title])).toEqual([
      ['understanding-your-score', 'Understanding Your Score'],
      ['strengths', 'Your Cognitive and Behavioral Strengths'],
      ['emotional-regulation', 'Your Emotional Regulation and Impulse Control'],
      ['faq', 'Frequently asked questions'],
    ]);
  });

  it.each(['understanding-your-score', 'strengths', 'emotional-regulation'])(
    'has distinct "%s" content for every combination of level and gender',
    (key) => {
      const contents = VARIANTS.map(([level, gender]) =>
        JSON.stringify(section(build(level, gender), key)),
      );

      expect(new Set(contents).size).toBe(4);
    },
  );

  it('uses the same questions for both genders and different ones per level', () => {
    const faq = (level: TraitLevel, gender: Gender) => section(build(level, gender), 'faq');

    expect(faq('high', 'male')).toEqual(faq('high', 'female'));
    expect(faq('low', 'male')).toEqual(faq('low', 'female'));
    expect(faq('high', 'male')).not.toEqual(faq('low', 'male'));
  });

  it('answers every question', () => {
    for (const [level, gender] of VARIANTS) {
      const faq = section(build(level, gender), 'faq');
      if (faq.type !== 'faq') {
        throw new Error('Expected a faq block');
      }
      expect(faq.items).toHaveLength(level === 'high' ? 6 : 5);
      for (const item of faq.items) {
        expect(item.question).toMatch(/\?$/);
        expect(item.answer.length).toBeGreaterThan(20);
      }
    }
  });

  it("gives each gender its own strengths and emotional copy, not the other one's", () => {
    const json = (level: TraitLevel, gender: Gender, key: string) =>
      JSON.stringify(section(build(level, gender), key));

    // One phrase per variant that appears only there in the design.
    expect(json('high', 'male', 'strengths')).toContain('ability to adapt quickly');
    expect(json('high', 'female', 'strengths')).toContain('adapt to changing situations');
    expect(json('low', 'male', 'strengths')).toContain('Good impulse control');
    expect(json('low', 'female', 'strengths')).toContain('Good self-regulation');

    expect(json('high', 'male', 'emotional-regulation')).toContain('Men with ADHD');
    expect(json('high', 'female', 'emotional-regulation')).toContain('Women with ADHD');
    expect(json('low', 'male', 'emotional-regulation')).toContain('Men may sometimes');
    expect(json('low', 'female', 'emotional-regulation')).toContain('Women may sometimes');
  });

  it('speaks to the right audience', () => {
    const understanding = (level: TraitLevel, gender: Gender) => {
      const block = section(build(level, gender), 'understanding-your-score');
      return block.type === 'text' ? block.text : '';
    };

    expect(understanding('high', 'female')).toMatch(/high ADHD traits/);
    expect(understanding('high', 'female')).toMatch(/In women/);
    expect(understanding('high', 'male')).toMatch(/In men/);
    expect(understanding('low', 'male')).toMatch(/minimal ADHD traits/);
    expect(understanding('low', 'male')).toMatch(/In men/);
    expect(understanding('low', 'female')).toMatch(/For women/);
  });

  it('shows the high-level emotional section as a list and the low-level one as a paragraph', () => {
    for (const gender of ['male', 'female'] as const) {
      const high = section(build('high', gender), 'emotional-regulation');
      const low = section(build('low', gender), 'emotional-regulation');

      expect(high).toMatchObject({ type: 'text-with-bullets' });
      expect(high.type === 'text-with-bullets' && high.items).toHaveLength(4);
      expect(high.type === 'text-with-bullets' && high.outro).toEqual(expect.any(String));
      expect(low).toMatchObject({ type: 'text' });
    }
  });

  it('introduces strengths only in the high-level report, with the designed number of items', () => {
    for (const gender of ['male', 'female'] as const) {
      const high = section(build('high', gender), 'strengths');
      const low = section(build('low', gender), 'strengths');

      expect(high).toMatchObject({
        type: 'checklist',
        intro: 'Despite these challenges, you possess real strengths:',
      });
      expect(high.type === 'checklist' && high.items).toHaveLength(5);
      expect(low.type === 'checklist' && low.items).toHaveLength(4);
      expect(low).not.toHaveProperty('intro');
    }
  });
});
