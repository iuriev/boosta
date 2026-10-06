import type { QuizDefinition } from '../quiz/quiz-definition';
import { scoreAttempt } from './scoring';

/** The shape of the first published quiz: five questions, options worth 4 to 0, threshold 60. */
const versionOne: QuizDefinition = {
  questions: ['q1', 'q2', 'q3', 'q4', 'q5'].map((key) => ({ key, text: key })),
  options: [
    { key: 'strongly_agree', label: 'Strongly agree', score: 4 },
    { key: 'agree', label: 'Agree', score: 3 },
    { key: 'neutral', label: 'Neutral', score: 2 },
    { key: 'disagree', label: 'Disagree', score: 1 },
    { key: 'strongly_disagree', label: 'Strongly disagree', score: 0 },
  ],
  scoring: { highThreshold: 60 },
};

const answering = (...optionKeys: string[]) =>
  optionKeys.map((optionKey, index) => ({ questionKey: `q${String(index + 1)}`, optionKey }));

describe('scoreAttempt', () => {
  it('scores 100 when every answer is the highest-scoring option', () => {
    const result = scoreAttempt(versionOne, answering(...Array<string>(5).fill('strongly_agree')));

    expect(result).toMatchObject({ score: 100, level: 'high' });
  });

  it('scores 0 when every answer is the lowest-scoring option', () => {
    const result = scoreAttempt(
      versionOne,
      answering(...Array<string>(5).fill('strongly_disagree')),
    );

    expect(result).toMatchObject({ score: 0, level: 'low' });
  });

  it('scores 70 for Agree, Agree, Neutral, Agree, Agree', () => {
    const result = scoreAttempt(
      versionOne,
      answering('agree', 'agree', 'neutral', 'agree', 'agree'),
    );

    expect(result.score).toBe(70);
  });

  it('is high at exactly the threshold', () => {
    // 3 + 3 + 2 + 2 + 2 = 12 of 20
    const result = scoreAttempt(
      versionOne,
      answering('agree', 'agree', 'neutral', 'neutral', 'neutral'),
    );

    expect(result).toMatchObject({ score: 60, level: 'high' });
  });

  it('is low just below the threshold', () => {
    // 3 + 2 + 2 + 2 + 2 = 11 of 20
    const result = scoreAttempt(
      versionOne,
      answering('agree', 'neutral', 'neutral', 'neutral', 'neutral'),
    );

    expect(result).toMatchObject({ score: 55, level: 'low' });
  });

  it('does not depend on the order of the answers', () => {
    const answers = answering(
      'strongly_agree',
      'disagree',
      'neutral',
      'agree',
      'strongly_disagree',
    );

    expect(scoreAttempt(versionOne, [...answers].reverse()).score).toBe(
      scoreAttempt(versionOne, answers).score,
    );
  });

  it('exposes each answer with its score, by question key', () => {
    const result = scoreAttempt(versionOne, answering('agree', 'neutral'));

    expect(result.answers.get('q1')).toEqual({ optionKey: 'agree', score: 3, maxScore: 4 });
    expect(result.answers.get('q2')).toEqual({ optionKey: 'neutral', score: 2, maxScore: 4 });
    expect(result.answers.has('q3')).toBe(false);
  });

  it('uses the weights and threshold of the version it is given', () => {
    const versionTwo: QuizDefinition = {
      questions: [
        { key: 'a', text: 'A' },
        { key: 'b', text: 'B' },
        { key: 'c', text: 'C' },
      ],
      options: [
        { key: 'yes', label: 'Yes', score: 1 },
        { key: 'no', label: 'No', score: 0 },
      ],
      scoring: { highThreshold: 30 },
    };

    const result = scoreAttempt(versionTwo, [
      { questionKey: 'a', optionKey: 'yes' },
      { questionKey: 'b', optionKey: 'no' },
      { questionKey: 'c', optionKey: 'no' },
    ]);

    // 1 of 3 = 33.33..., rounded to the nearest integer.
    expect(result).toMatchObject({ score: 33, level: 'high' });
  });

  it('rounds to the nearest integer', () => {
    const threeQuestions: QuizDefinition = {
      ...versionOne,
      questions: versionOne.questions.slice(0, 3),
    };

    // 4 + 4 + 0 = 8 of 12 = 66.67
    expect(
      scoreAttempt(
        threeQuestions,
        answering('strongly_agree', 'strongly_agree', 'strongly_disagree'),
      ).score,
    ).toBe(67);
  });

  it('ignores answers that do not belong to the version', () => {
    const result = scoreAttempt(versionOne, [
      ...answering('strongly_agree', 'strongly_agree', 'strongly_agree', 'strongly_agree'),
      { questionKey: 'q5', optionKey: 'not_an_option' },
      { questionKey: 'removed_question', optionKey: 'strongly_agree' },
      { questionKey: 'q1', optionKey: 'strongly_agree' },
    ]);

    // 16 of 20: the unknown option, the unknown question and the duplicate add nothing.
    expect(result.score).toBe(80);
    expect([...result.answers.keys()]).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('scores 0 for a version that cannot award points', () => {
    const pointless: QuizDefinition = {
      ...versionOne,
      options: [{ key: 'only', label: 'Only', score: 0 }],
    };

    expect(scoreAttempt(pointless, [{ questionKey: 'q1', optionKey: 'only' }]).score).toBe(0);
  });
});
