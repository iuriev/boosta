import type { AttemptAnswer } from '@boosta/contracts';

import type { QuizDefinition } from '../quiz/quiz-definition';

/**
 * Checks answers against the quiz version they were given for. Returns one
 * message per problem; an empty array means exactly one valid answer per question.
 */
export function findAnswerProblems(
  definition: QuizDefinition,
  answers: readonly AttemptAnswer[],
): string[] {
  const questionKeys = new Set(definition.questions.map((question) => question.key));
  const optionKeys = new Set(definition.options.map((option) => option.key));
  const problems: string[] = [];
  const answered = new Set<string>();

  for (const { questionKey, optionKey } of answers) {
    if (!questionKeys.has(questionKey)) {
      problems.push(`Unknown question "${questionKey}"`);
      continue;
    }
    if (answered.has(questionKey)) {
      problems.push(`Question "${questionKey}" is answered more than once`);
      continue;
    }
    answered.add(questionKey);
    if (!optionKeys.has(optionKey)) {
      problems.push(`Unknown option "${optionKey}" for question "${questionKey}"`);
    }
  }

  for (const questionKey of questionKeys) {
    if (!answered.has(questionKey)) {
      problems.push(`Question "${questionKey}" is not answered`);
    }
  }

  return problems;
}
