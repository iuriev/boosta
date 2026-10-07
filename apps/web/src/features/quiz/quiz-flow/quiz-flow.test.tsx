import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/api-error';
import { attemptsService } from '@/lib/api/attempts-service';
import { QUIZ } from '@/test/fixtures';
import { router } from '@/test/router';

import {
  clearQuizProgress,
  loadClaimToken,
  loadQuizProgress,
  type QuizProgress,
  saveQuizProgress,
} from '../quiz-storage';
import { QuizFlow } from './quiz-flow';

vi.mock('@/lib/api/attempts-service', () => ({ attemptsService: { submit: vi.fn() } }));
const submit = vi.mocked(attemptsService.submit);

const ALL_ANSWERED = { focus: 'agree', memory: 'neutral', time: 'disagree' };

function renderQuiz(progress: Partial<QuizProgress> | null = {}) {
  if (progress) {
    saveQuizProgress({
      quizVersionId: QUIZ.versionId,
      gender: 'female',
      answers: {},
      index: 0,
      ...progress,
    });
  }
  render(<QuizFlow quiz={QUIZ} headerActions={null} />);
  return userEvent.setup();
}

const question = (text: RegExp) => screen.getByRole('group', { name: text });
const forward = (name = 'Next question') => screen.getByRole('button', { name });

describe('QuizFlow', () => {
  describe('answering', () => {
    it('shows the first question with its position and no option chosen', () => {
      renderQuiz();

      expect(question(/Question 1 of 3:\s*I find it hard to stay focused/)).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Quiz progress' })).toHaveAttribute(
        'value',
        '1',
      );
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).not.toBeChecked();
      }
    });

    it('does not move on without an answer and says why', async () => {
      const user = renderQuiz();
      expect(forward()).toHaveAttribute('aria-disabled', 'true');

      await user.click(forward());

      expect(screen.getByRole('status')).toHaveTextContent('Choose an answer to continue.');
      expect(question(/Question 1 of 3/)).toBeInTheDocument();
    });

    it('only marks the chosen option; the forward control moves on', async () => {
      const user = renderQuiz();

      await user.click(screen.getByRole('radio', { name: 'Agree' }));

      expect(screen.getByRole('radio', { name: 'Agree' })).toBeChecked();
      expect(question(/Question 1 of 3/)).toBeInTheDocument();
      expect(forward()).toHaveAttribute('aria-disabled', 'false');

      await user.click(forward());

      expect(question(/Question 2 of 3:\s*I often misplace things/)).toBeInTheDocument();
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    it('moves focus to the new question', async () => {
      const user = renderQuiz({ answers: { focus: 'agree' } });

      await user.click(forward());

      expect(screen.getByText(/I often misplace things/).closest('legend')).toHaveFocus();
    });

    it('gives each question its own selection', async () => {
      const user = renderQuiz({ answers: { focus: 'agree' } });

      await user.click(forward());

      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).not.toBeChecked();
      }
    });
  });

  describe('going back', () => {
    it('shows the previous question with the answer given to it, which can be changed', async () => {
      const user = renderQuiz({ answers: { focus: 'agree' }, index: 1 });

      await user.click(screen.getByRole('button', { name: 'Previous question' }));

      expect(question(/Question 1 of 3/)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Agree' })).toBeChecked();

      await user.click(screen.getByRole('radio', { name: 'Neutral' }));

      expect(loadQuizProgress()?.answers).toEqual({ focus: 'neutral' });
    });

    it('returns to the start screen from the first question and keeps the answers', async () => {
      const user = renderQuiz({ answers: { focus: 'agree' } });

      await user.click(screen.getByRole('button', { name: 'Back to the start' }));

      expect(router.push).toHaveBeenCalledWith('/');
      expect(loadQuizProgress()?.answers).toEqual({ focus: 'agree' });
    });
  });

  describe('stored progress', () => {
    it('continues from the stored question with the stored answers', () => {
      renderQuiz({ answers: { focus: 'agree', memory: 'neutral' }, index: 1 });

      expect(question(/Question 2 of 3/)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Neutral' })).toBeChecked();
    });

    it('sends a visitor who has not chosen a gender to the start screen', () => {
      renderQuiz(null);

      expect(router.replace).toHaveBeenCalledWith('/');
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('leaves the navigation to whoever cleared the progress, such as signing out', () => {
      renderQuiz();

      act(() => {
        clearQuizProgress();
      });

      expect(router.replace).not.toHaveBeenCalled();
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('discards answers that belong to a replaced quiz version', () => {
      renderQuiz({ quizVersionId: 'version-0', answers: { focus: 'agree' } });

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/');
      expect(loadQuizProgress()).toBeNull();
    });

    it('does not trust a stored position outside the quiz', () => {
      renderQuiz({ index: 99 });

      expect(question(/Question 3 of 3/)).toBeInTheDocument();
    });
  });

  describe('finishing', () => {
    it('submits every answer with the gender and the quiz version', async () => {
      submit.mockResolvedValue({ claimToken: 'token-1' });
      const user = renderQuiz({ answers: ALL_ANSWERED, index: 2, gender: 'male' });

      await user.click(forward('See my results'));

      expect(submit).toHaveBeenCalledExactlyOnceWith({
        quizVersionId: 'version-1',
        gender: 'male',
        answers: [
          { questionKey: 'focus', optionKey: 'agree' },
          { questionKey: 'memory', optionKey: 'neutral' },
          { questionKey: 'time', optionKey: 'disagree' },
        ],
      });
    });

    it('keeps the claim token and asks an anonymous visitor to create an account', async () => {
      submit.mockResolvedValue({ claimToken: 'token-1' });
      const user = renderQuiz({ answers: ALL_ANSWERED, index: 2 });

      await user.click(forward('See my results'));

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/signup');
      expect(loadClaimToken()).toBe('token-1');
      expect(loadQuizProgress()).toBeNull();
    });

    it('takes a signed-in user straight to the report', async () => {
      submit.mockResolvedValue({ claimToken: null });
      const user = renderQuiz({ answers: ALL_ANSWERED, index: 2 });

      await user.click(forward('See my results'));

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/report');
      expect(loadClaimToken()).toBeNull();
    });

    it('goes to the first unanswered question instead of submitting with a gap', async () => {
      const user = renderQuiz({ answers: { focus: 'agree', time: 'disagree' }, index: 2 });

      await user.click(forward('See my results'));

      expect(submit).not.toHaveBeenCalled();
      expect(question(/Question 2 of 3/)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Please answer this question as well.');
    });

    it('starts over with a notice when the quiz was replaced meanwhile', async () => {
      submit.mockRejectedValue(new ApiError(409, 'Outdated', 'QUIZ_VERSION_OUTDATED'));
      const user = renderQuiz({ answers: ALL_ANSWERED, index: 2 });

      await user.click(forward('See my results'));

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/?notice=quiz-updated');
      expect(loadQuizProgress()).toBeNull();
    });

    it('keeps the answers and allows another try when saving fails', async () => {
      submit.mockRejectedValueOnce(new ApiError(400, 'answers.0.optionKey must be a string'));
      submit.mockResolvedValueOnce({ claimToken: 'token-2' });
      const user = renderQuiz({ answers: ALL_ANSWERED, index: 2 });

      await user.click(forward('See my results'));

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong while saving your answers. Please try again.',
      );
      expect(router.replace).not.toHaveBeenCalled();
      expect(loadQuizProgress()?.answers).toEqual(ALL_ANSWERED);

      await user.click(forward('See my results'));

      expect(router.replace).toHaveBeenCalledExactlyOnceWith('/signup');
    });

    it('explains a connection failure in its own words', async () => {
      submit.mockRejectedValue(new ApiError(0, 'Could not reach the server.'));
      const user = renderQuiz({ answers: ALL_ANSWERED, index: 2 });

      await user.click(forward('See my results'));

      expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.');
    });
  });
});
