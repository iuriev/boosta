import type { Attempt } from '../attempts/attempt.entity';
import type { QuizDefinition } from '../quiz/quiz-definition';
import { buildReport } from './report.service';
import type { ReportSection } from './report-engine';

const versionOne: QuizDefinition = {
  schemaVersion: 1,
  questions: [
    { key: 'focus', text: 'Focus?' },
    { key: 'memory', text: 'Memory?' },
  ],
  options: [
    { key: 'strongly_agree', label: 'Strongly agree', score: 4 },
    { key: 'strongly_disagree', label: 'Strongly disagree', score: 0 },
  ],
  scoring: { highThreshold: 60 },
};

/** A later version: one question kept, one replaced, a different scale and threshold. */
const versionTwo: QuizDefinition = {
  schemaVersion: 1,
  questions: [
    { key: 'focus', text: 'Focus, reworded?' },
    { key: 'sleep', text: 'Sleep?' },
  ],
  options: [
    { key: 'yes', label: 'Yes', score: 1 },
    { key: 'no', label: 'No', score: 0 },
  ],
  scoring: { highThreshold: 50 },
};

const attempt = (
  version: number,
  definition: QuizDefinition,
  answers: Record<string, string>,
  submittedAt: string,
  gender: 'male' | 'female' = 'female',
): Attempt =>
  ({
    gender,
    createdAt: new Date(submittedAt),
    quizVersion: { version, definition },
    answers: Object.entries(answers).map(([questionKey, optionKey]) => ({
      questionKey,
      optionKey,
    })),
  }) as Attempt;

const earlierOnVersionOne = attempt(
  1,
  versionOne,
  { focus: 'strongly_agree', memory: 'strongly_disagree' },
  '2026-09-01T10:00:00Z',
  'male',
);
const currentOnVersionTwo = attempt(
  2,
  versionTwo,
  { focus: 'yes', sleep: 'yes' },
  '2026-10-06T10:00:00Z',
);

/** A test-only section that looks at the user's history. */
const progressSection: ReportSection = {
  key: 'progress',
  build: ({ score, quizVersion, previousAttempts }) => {
    const [previous] = previousAttempts;
    if (!previous) {
      return null;
    }
    const focusBefore = previous.answers.get('focus');
    return {
      type: 'text',
      title: 'Progress',
      text: [
        `score ${String(previous.score)} (v${String(previous.quizVersion)}, ${previous.level}, ${previous.gender})`,
        `-> ${String(score)} (v${String(quizVersion)})`,
        `focus before: ${String(focusBefore?.score)}/${String(focusBefore?.maxScore)}`,
        `memory before: ${String(previous.answers.get('memory')?.optionKey)}`,
        `had sleep question before: ${String(previous.questionKeys.has('sleep'))}`,
      ].join('; '),
    };
  },
};

describe('buildReport', () => {
  it('returns null when the user has no attempts', () => {
    expect(buildReport([])).toBeNull();
  });

  it('reports on the first attempt in the list', () => {
    const report = buildReport([currentOnVersionTwo, earlierOnVersionOne]);

    expect(report).toMatchObject({
      score: 100,
      level: 'high',
      levelLabel: 'High ADHD Traits',
      gender: 'female',
      submittedAt: '2026-10-06T10:00:00.000Z',
    });
  });

  it('uses the shipped report definition by default', () => {
    const report = buildReport([currentOnVersionTwo]);

    expect(report?.sections.map((section) => section.key)).toEqual([
      'understanding-your-score',
      'strengths',
      'emotional-regulation',
      'faq',
    ]);
  });

  it('hands sections the earlier attempts, each scored with its own quiz version', () => {
    const report = buildReport([currentOnVersionTwo, earlierOnVersionOne], [progressSection]);

    expect(report?.sections).toEqual([
      {
        type: 'text',
        key: 'progress',
        title: 'Progress',
        // The earlier attempt: 4 of 8 on version 1 is 50, below its threshold of 60.
        text:
          'score 50 (v1, low, male); -> 100 (v2); focus before: 4/4; ' +
          'memory before: strongly_disagree; had sleep question before: false',
      },
    ]);
  });

  it('gives a history-based section nothing to build on for a first attempt', () => {
    const report = buildReport([currentOnVersionTwo], [progressSection]);

    expect(report?.sections).toEqual([]);
  });

  it('applies changed report logic to the same stored attempts', () => {
    const attempts = [currentOnVersionTwo, earlierOnVersionOne];
    const before = buildReport(attempts, []);
    const after = buildReport(attempts, [progressSection]);

    // Same stored data, different logic: only the sections differ.
    expect(before?.sections).toHaveLength(0);
    expect(after?.sections).toHaveLength(1);
    expect({ ...after, sections: [] }).toEqual(before);
  });

  it('exposes only the documented fields', () => {
    const report = buildReport([currentOnVersionTwo, earlierOnVersionOne]);

    expect(Object.keys(report ?? {}).sort()).toEqual(
      ['gender', 'level', 'levelLabel', 'score', 'sections', 'submittedAt'].sort(),
    );
  });
});
