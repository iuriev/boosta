'use client';

import { useHasPendingResult } from '@/features/quiz/quiz-storage';

interface PendingResultTextProps {
  /** Shown when a finished quiz is waiting to be attached to an account. */
  withResult: string;
  withoutResult: string;
}

/**
 * Copy that depends on whether the visitor arrived from a finished quiz.
 * The server renders the common case, a visitor coming from the quiz.
 */
export function PendingResultText({ withResult, withoutResult }: PendingResultTextProps) {
  const hasPendingResult = useHasPendingResult(true);
  return hasPendingResult ? withResult : withoutResult;
}
