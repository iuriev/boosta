import type { AttemptAnswer, TraitLevel } from '@boosta/contracts';

import type { QuizDefinition } from '../quiz/quiz-definition';

export interface ScoredAnswer {
  optionKey: string;
  /** The option's score in the quiz version the attempt was taken against. */
  score: number;
  /**
   * The highest score an option has in that version. Scales differ between
   * versions, so compare `score / maxScore`, never raw scores or option keys,
   * when a section may see attempts from more than one version.
   */
  maxScore: number;
}

export interface ScoredAttempt {
  /** 0 to 100. */
  score: number;
  level: TraitLevel;
  /** By question key. */
  answers: ReadonlyMap<string, ScoredAnswer>;
}

/**
 * Scores an attempt with the weights and threshold of its own quiz version.
 * A pure function of stored data: nothing it returns is persisted, so the
 * result cannot drift from the answers it was derived from.
 *
 * score = round(sum of chosen option scores / highest possible sum * 100)
 */
export function scoreAttempt(
  definition: QuizDefinition,
  answers: readonly AttemptAnswer[],
): ScoredAttempt {
  const optionScores = new Map(definition.options.map((option) => [option.key, option.score]));
  const questionKeys = new Set(definition.questions.map((question) => question.key));
  const highestOptionScore = Math.max(0, ...optionScores.values());

  const scored = new Map<string, ScoredAnswer>();
  let sum = 0;
  for (const { questionKey, optionKey } of answers) {
    const optionScore = optionScores.get(optionKey);
    // Answers were validated against this version when submitted; anything
    // that no longer matches is ignored rather than trusted.
    if (optionScore === undefined || !questionKeys.has(questionKey) || scored.has(questionKey)) {
      continue;
    }
    scored.set(questionKey, { optionKey, score: optionScore, maxScore: highestOptionScore });
    sum += optionScore;
  }

  const highestSum = highestOptionScore * questionKeys.size;
  const score = highestSum === 0 ? 0 : Math.round((sum / highestSum) * 100);

  return {
    score,
    level: score >= definition.scoring.highThreshold ? 'high' : 'low',
    answers: scored,
  };
}
