import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { QUIZ } from '@/test/fixtures';
import { router } from '@/test/router';

import { loadQuizProgress, saveQuizProgress } from '../quiz-storage';
import { StartScreen } from './start-screen';

describe('StartScreen', () => {
  it('starts the quiz with the chosen gender', async () => {
    render(<StartScreen quiz={QUIZ} />);

    await userEvent.click(screen.getByRole('button', { name: 'Female' }));

    expect(loadQuizProgress()).toEqual({
      quizVersionId: 'version-1',
      gender: 'female',
      answers: {},
      index: 0,
    });
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/quiz');
  });

  it('keeps answers already given to this quiz version, with the newly chosen gender', async () => {
    saveQuizProgress({
      quizVersionId: 'version-1',
      gender: 'female',
      answers: { focus: 'agree' },
      index: 1,
    });
    render(<StartScreen quiz={QUIZ} />);

    await userEvent.click(screen.getByRole('button', { name: 'Male' }));

    expect(loadQuizProgress()).toEqual({
      quizVersionId: 'version-1',
      gender: 'male',
      answers: { focus: 'agree' },
      index: 1,
    });
  });

  it('drops answers given to a replaced quiz version', async () => {
    saveQuizProgress({
      quizVersionId: 'version-0',
      gender: 'female',
      answers: { retired_question: 'agree' },
      index: 4,
    });
    render(<StartScreen quiz={QUIZ} />);

    await userEvent.click(screen.getByRole('button', { name: 'Female' }));

    expect(loadQuizProgress()).toMatchObject({ quizVersionId: 'version-1', answers: {}, index: 0 });
  });
});
