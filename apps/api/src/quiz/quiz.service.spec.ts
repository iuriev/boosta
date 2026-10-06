import { toPublicQuiz } from './quiz.service';
import type { QuizVersion } from './quiz-version.entity';

describe('toPublicQuiz', () => {
  const version: QuizVersion = {
    id: '6f1c2f0e-0000-4000-8000-000000000001',
    version: 3,
    isActive: true,
    createdAt: new Date(),
    definition: {
      questions: [
        { key: 'first', text: 'First?' },
        { key: 'second', text: 'Second?' },
      ],
      options: [
        { key: 'yes', label: 'Yes', score: 1 },
        { key: 'no', label: 'No', score: 0 },
      ],
      scoring: { highThreshold: 50 },
    },
  };

  it('keeps identifiers, texts and order', () => {
    expect(toPublicQuiz(version)).toEqual({
      versionId: version.id,
      version: 3,
      questions: [
        { key: 'first', text: 'First?' },
        { key: 'second', text: 'Second?' },
      ],
      options: [
        { key: 'yes', label: 'Yes' },
        { key: 'no', label: 'No' },
      ],
    });
  });

  it('exposes neither option scores nor the threshold', () => {
    const serialized = JSON.stringify(toPublicQuiz(version));

    expect(serialized).not.toContain('score');
    expect(serialized).not.toContain('highThreshold');
    expect(serialized).not.toContain('scoring');
  });
});
