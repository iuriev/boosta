import { Logger } from '@nestjs/common';

import {
  type AttemptView,
  buildSections,
  type ReportBlockContent,
  type ReportContext,
  type ReportSection,
} from './report-engine';

const attempt = (overrides: Partial<AttemptView> = {}): AttemptView => ({
  gender: 'female',
  score: 70,
  level: 'high',
  answers: new Map([
    ['focus', { optionKey: 'agree', score: 3, maxScore: 4 }],
    ['memory', { optionKey: 'disagree', score: 1, maxScore: 4 }],
  ]),
  questionKeys: new Set(['focus', 'memory']),
  quizVersion: 1,
  submittedAt: new Date('2026-10-06T10:00:00Z'),
  ...overrides,
});

const context = (overrides: Partial<ReportContext> = {}): ReportContext => ({
  ...attempt(),
  previousAttempts: [],
  ...overrides,
});

const text = (title: string, body: string): ReportBlockContent => ({
  type: 'text',
  title,
  text: body,
});

/** Always present, independent of answers. */
const staticSection: ReportSection = {
  key: 'static',
  build: () => text('static', 'always'),
};

/** Depends on the answer to one specific question. */
const focusSection: ReportSection = {
  key: 'focus-insight',
  requires: ['focus'],
  build: ({ answers }) =>
    text('focus-insight', `You answered "${answers.get('focus')?.optionKey ?? ''}" about focus`),
};

/** Depends on a question that only a later quiz version asks. */
const sleepSection: ReportSection = {
  key: 'sleep-insight',
  requires: ['focus', 'sleep'],
  build: () => text('sleep-insight', 'sleep'),
};

/** Depends on the user's history. */
const progressSection: ReportSection = {
  key: 'progress',
  build: ({ score, previousAttempts }) => {
    const [previous] = previousAttempts;
    if (!previous) {
      return null;
    }
    return text('progress', `From ${String(previous.score)} to ${String(score)}`);
  },
};

describe('buildSections', () => {
  it('builds sections in the order they are listed', () => {
    const blocks = buildSections([focusSection, staticSection], context());

    expect(blocks.map((block) => block.key)).toEqual(['focus-insight', 'static']);
  });

  it('builds a section from the answer to the question it requires', () => {
    const [block] = buildSections([focusSection], context());

    expect(block).toMatchObject({ text: 'You answered "agree" about focus' });
  });

  it('omits a section when the quiz version lacks a question it requires, and keeps the rest', () => {
    const blocks = buildSections([staticSection, sleepSection, focusSection], context());

    expect(blocks.map((block) => block.key)).toEqual(['static', 'focus-insight']);
  });

  it('includes that section once the quiz version has the question', () => {
    const blocks = buildSections(
      [sleepSection],
      context({ questionKeys: new Set(['focus', 'memory', 'sleep']) }),
    );

    expect(blocks.map((block) => block.key)).toEqual(['sleep-insight']);
  });

  it('applies a section added later to an attempt stored before it existed', () => {
    // The attempt is plain stored data; adding a section changes only the list.
    const stored = context();

    expect(buildSections([staticSection], stored)).toHaveLength(1);
    expect(buildSections([staticSection, focusSection], stored)).toHaveLength(2);
  });

  it('gives a history-based section the earlier attempts of the user', () => {
    const blocks = buildSections(
      [progressSection],
      context({ score: 74, previousAttempts: [attempt({ score: 52, level: 'low' })] }),
    );

    expect(blocks).toEqual([{ ...text('progress', 'From 52 to 74'), key: 'progress' }]);
  });

  it('omits a history-based section for a first attempt, and keeps the rest', () => {
    const blocks = buildSections([progressSection, staticSection], context());

    expect(blocks.map((block) => block.key)).toEqual(['static']);
  });

  it('gives every block the key of the section that built it', () => {
    const blocks = buildSections([staticSection, focusSection], context());

    expect(blocks.map((block) => block.key)).toEqual([staticSection.key, focusSection.key]);
  });

  it('leaves out a section that throws, reports it and keeps the rest', () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const brokenSection: ReportSection = {
      key: 'broken',
      build: () => {
        throw new Error('defect in a section');
      },
    };

    const blocks = buildSections([staticSection, brokenSection, focusSection], context());

    expect(blocks.map((block) => block.key)).toEqual(['static', 'focus-insight']);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('"broken"'), expect.any(String));
    logged.mockRestore();
  });

  it('returns no sections for an empty definition', () => {
    expect(buildSections([], context())).toEqual([]);
  });
});
