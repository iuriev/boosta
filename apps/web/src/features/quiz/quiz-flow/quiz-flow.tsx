'use client';

import type { Quiz, SubmitAttemptRequest } from '@boosta/contracts';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { SiteHeader } from '@/components/site-header';
import { ROUTES, startWithNotice } from '@/config/routes';
import { ApiError } from '@/lib/api/api-error';
import { attemptsService } from '@/lib/api/attempts-service';
import { cx } from '@/lib/cx';
import { useIsClient } from '@/lib/use-is-client';

import {
  clearQuizProgress,
  type QuizProgress,
  saveClaimToken,
  saveQuizProgress,
  useQuizProgress,
} from '../quiz-storage';
import styles from './quiz-flow.module.css';

interface QuizFlowProps {
  quiz: Quiz;
  /** Links shown on the right of the header. */
  headerActions: ReactNode;
}

/**
 * The quiz: one question at a time, with back and forward controls. Choosing
 * an option only marks it; the forward control moves on and, on the last
 * question, submits the answers.
 */
export function QuizFlow({ quiz, headerActions }: QuizFlowProps) {
  const router = useRouter();
  // Progress lives in session storage, which the server cannot see: it is
  // null during server rendering and hydration and known right after.
  const isClient = useIsClient();
  const saved = useQuizProgress();
  const progress = saved?.quizVersionId === quiz.versionId ? saved : null;
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const questionRef = useRef<HTMLLegendElement>(null);
  const optionIdPrefix = useId();
  const previousIndex = useRef<number | undefined>(undefined);
  // Set once the quiz is being left on purpose, so that clearing the stored
  // progress does not also trigger the "nothing to show" redirect below.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (isClient && !progress && !leaving) {
      // No gender chosen yet, or the saved answers belong to a replaced quiz.
      clearQuizProgress();
      router.replace(ROUTES.start);
    }
  }, [isClient, progress, leaving, router]);

  const total = quiz.questions.length;
  // A stored index is never trusted to be inside the current quiz.
  const index = progress ? Math.min(Math.max(progress.index, 0), total - 1) : undefined;
  useEffect(() => {
    // Moves keyboard and screen-reader focus to the new question. Not when the
    // quiz first appears: there the page itself is what was navigated to.
    const previous = previousIndex.current;
    previousIndex.current = index;
    if (previous !== undefined && index !== undefined && previous !== index) {
      questionRef.current?.focus();
    }
  }, [index]);

  if (!progress) {
    return (
      <div className={styles.page}>
        <SiteHeader actions={headerActions} />
      </div>
    );
  }

  const question = index === undefined ? undefined : quiz.questions[index];
  if (!question || index === undefined) {
    return null;
  }
  const selectedOption = progress.answers[question.key];
  const isLast = index === total - 1;

  const update = (next: QuizProgress) => {
    saveQuizProgress(next);
  };

  const select = (optionKey: string) => {
    setHint(null);
    setError(null);
    update({ ...progress, answers: { ...progress.answers, [question.key]: optionKey } });
  };

  const goBack = () => {
    setHint(null);
    setError(null);
    if (index === 0) {
      router.push(ROUTES.start);
      return;
    }
    update({ ...progress, index: index - 1 });
  };

  const submit = async () => {
    const request: SubmitAttemptRequest = {
      quizVersionId: progress.quizVersionId,
      gender: progress.gender,
      answers: quiz.questions.map(({ key }) => ({
        questionKey: key,
        optionKey: progress.answers[key] ?? '',
      })),
    };
    setSubmitting(true);
    setError(null);
    try {
      const { claimToken } = await attemptsService.submit(request);
      setLeaving(true);
      clearQuizProgress();
      if (claimToken === null) {
        // Signed in: the attempt already belongs to the account.
        router.replace(ROUTES.report);
        // Costs a second request for the report, on purpose: it drops the
        // pages the router has cached from before the attempt existed, so
        // going back does not show the start page without "My report".
        router.refresh();
      } else {
        saveClaimToken(claimToken);
        router.replace(ROUTES.signUp);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'QUIZ_VERSION_OUTDATED') {
        // The quiz was replaced while it was being taken: start over with the new one.
        setLeaving(true);
        clearQuizProgress();
        router.replace(startWithNotice('quiz-updated'));
        // Drops the pages the router has cached with the replaced quiz.
        router.refresh();
        return;
      }
      setSubmitting(false);
      // Field-level details from the API are meant for developers, not for the visitor.
      setError(
        caught instanceof ApiError && (caught.status === 0 || caught.status === 429)
          ? caught.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : caught.message
          : 'Something went wrong while saving your answers. Please try again.',
      );
    }
  };

  const goForward = () => {
    if (submitting) {
      return;
    }
    if (!selectedOption) {
      setHint('Choose an answer to continue.');
      return;
    }
    if (isLast) {
      // Stored progress may have been edited or come from an interrupted
      // session: never submit with a gap, go to the first unanswered question.
      const firstUnanswered = quiz.questions.findIndex(({ key }) => !progress.answers[key]);
      if (firstUnanswered !== -1) {
        setHint('Please answer this question as well.');
        update({ ...progress, index: firstUnanswered });
        return;
      }
      void submit();
      return;
    }
    update({ ...progress, index: index + 1 });
  };

  const position = index + 1;

  return (
    <div className={styles.page}>
      <SiteHeader actions={headerActions}>
        <progress
          className={styles.progress}
          value={position}
          max={total}
          aria-label="Quiz progress"
          aria-valuetext={`Question ${String(position)} of ${String(total)}`}
        />
      </SiteHeader>

      <main id="content" tabIndex={-1} className={styles.main}>
        <h1 className="visually-hidden">ADHD traits test</h1>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            goForward();
          }}
        >
          <fieldset className={styles.question}>
            <legend ref={questionRef} tabIndex={-1} className={styles.title}>
              <span className="visually-hidden">
                Question {position} of {total}:{' '}
              </span>
              {question.text}
            </legend>

            <div className={styles.options}>
              {quiz.options.map((option) => (
                <label
                  key={option.key}
                  className={styles.option}
                  htmlFor={`${optionIdPrefix}-${option.key}`}
                >
                  <input
                    id={`${optionIdPrefix}-${option.key}`}
                    className="visually-hidden"
                    type="radio"
                    // One group per question, so each question has its own selection.
                    name={question.key}
                    value={option.key}
                    checked={selectedOption === option.key}
                    onChange={() => {
                      select(option.key);
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Always present so that messages are announced when they appear. */}
          <p className={styles.message} role="status">
            {hint}
          </p>
          <p className={cx(styles.message, styles.error)} role="alert">
            {error}
          </p>

          <nav className={styles.navigation} aria-label="Quiz navigation">
            <button type="button" className={styles.arrow} onClick={goBack}>
              <Image
                className={styles.arrowBack}
                src="/images/arrow-right.svg"
                alt=""
                width={24}
                height={24}
                unoptimized
              />
              <span className="visually-hidden">
                {index === 0 ? 'Back to the start' : 'Previous question'}
              </span>
            </button>

            <p className={styles.counter} aria-hidden="true">
              {position}/{total}
            </p>

            {/*
              Not `disabled` while unanswered: a disabled button cannot be
              focused or explain itself. It stays reachable, looks inactive and
              answers a press with a hint instead.
            */}
            <button
              type="submit"
              className={styles.arrow}
              aria-disabled={!selectedOption || submitting}
              aria-busy={submitting || undefined}
            >
              <Image src="/images/arrow-right.svg" alt="" width={24} height={24} unoptimized />
              <span className="visually-hidden">{isLast ? 'See my results' : 'Next question'}</span>
            </button>
          </nav>
        </form>
      </main>
    </div>
  );
}
