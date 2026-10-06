import type { Metadata } from 'next';

import { SessionActions } from '@/features/auth/session-actions';
import { QuizFlow } from '@/features/quiz/quiz-flow';
import { fetchCurrentUser, fetchQuiz } from '@/lib/api/server-api';

export const metadata: Metadata = { title: 'ADHD traits test' };

export default async function QuizPage() {
  const [quiz, user] = await Promise.all([fetchQuiz(), fetchCurrentUser({ optional: true })]);

  return <QuizFlow quiz={quiz} headerActions={<SessionActions user={user} />} />;
}
