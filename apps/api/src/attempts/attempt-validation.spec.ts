import type { QuizDefinition } from '../quiz/quiz-definition';
import { findAnswerProblems } from './attempt-validation';

const definition: QuizDefinition = {
  questions: [
    { key: 'focus', text: 'Focus?' },
    { key: 'memory', text: 'Memory?' },
  ],
  options: [
    { key: 'agree', label: 'Agree', score: 1 },
    { key: 'disagree', label: 'Disagree', score: 0 },
  ],
  scoring: { highThreshold: 50 },
};

const focusAnswer = { questionKey: 'focus', optionKey: 'agree' };
const memoryAnswer = { questionKey: 'memory', optionKey: 'disagree' };
const complete = [focusAnswer, memoryAnswer];

describe('findAnswerProblems', () => {
  it('accepts exactly one known answer per question', () => {
    expect(findAnswerProblems(definition, complete)).toEqual([]);
  });

  it('accepts answers in any order', () => {
    expect(findAnswerProblems(definition, [...complete].reverse())).toEqual([]);
  });

  it('reports a question without an answer', () => {
    expect(findAnswerProblems(definition, [focusAnswer])).toEqual([
      'Question "memory" is not answered',
    ]);
  });

  it('reports every missing question for an empty submission', () => {
    expect(findAnswerProblems(definition, [])).toEqual([
      'Question "focus" is not answered',
      'Question "memory" is not answered',
    ]);
  });

  it('reports a question answered twice, even with the same option', () => {
    expect(findAnswerProblems(definition, [...complete, focusAnswer])).toEqual([
      'Question "focus" is answered more than once',
    ]);
  });

  it('reports a question key the version does not define', () => {
    expect(
      findAnswerProblems(definition, [...complete, { questionKey: 'sleep', optionKey: 'agree' }]),
    ).toEqual(['Unknown question "sleep"']);
  });

  it('reports an option key the version does not define', () => {
    expect(
      findAnswerProblems(definition, [focusAnswer, { questionKey: 'memory', optionKey: 'maybe' }]),
    ).toEqual(['Unknown option "maybe" for question "memory"']);
  });

  it('does not count an answer with an unknown option as missing', () => {
    const problems = findAnswerProblems(definition, [
      { questionKey: 'focus', optionKey: 'maybe' },
      memoryAnswer,
    ]);

    expect(problems).toHaveLength(1);
  });
});
