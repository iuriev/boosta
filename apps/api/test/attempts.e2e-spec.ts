import { createHash, randomUUID } from 'node:crypto';

import type { ApiErrorBody, Quiz } from '@boosta/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { AttemptsService } from '../src/attempts/attempts.service';
import {
  buildSubmission,
  createUser,
  fetchQuiz,
  publishVersionTwo,
  resetDatabase,
  submitAnonymously,
} from './helpers';
import { createTestApp } from './test-app';

interface AttemptRow {
  id: string;
  quiz_version_id: string;
  gender: string;
  user_id: string | null;
  claim_token_hash: string | null;
  claim_expires_at: Date | null;
  created_at: Date;
}

describe('Attempts (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let attemptsService: AttemptsService;
  let quiz: Quiz;

  const attemptRows = () =>
    dataSource.query<AttemptRow[]>(`SELECT * FROM attempts ORDER BY created_at, id`);
  const countAttempts = async () => (await attemptRows()).length;
  const submit = (body: object) => request(app.getHttpServer()).post('/api/attempts').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    attemptsService = app.get(AttemptsService);
  });

  beforeEach(async () => {
    quiz = await fetchQuiz(app);
  });

  afterEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/attempts as an anonymous visitor', () => {
    it('stores an unowned attempt bound to the quiz version and returns a claim token', async () => {
      const response = await submit(buildSubmission(quiz, 'agree', { gender: 'male' })).expect(201);
      const { claimToken } = response.body as { claimToken: string };

      expect(claimToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const [attempt, ...others] = await attemptRows();
      expect(others).toHaveLength(0);
      expect(attempt).toMatchObject({
        quiz_version_id: quiz.versionId,
        gender: 'male',
        user_id: null,
      });

      const answers = await dataSource.query<{ question_key: string; option_key: string }[]>(
        `SELECT question_key, option_key FROM attempt_answers WHERE attempt_id = $1`,
        [attempt?.id],
      );
      expect(answers).toHaveLength(5);
      expect(answers).toEqual(
        expect.arrayContaining(
          quiz.questions.map((question) => ({ question_key: question.key, option_key: 'agree' })),
        ),
      );
    });

    it('stores only a hash of the claim token, with a 24-hour expiry', async () => {
      const before = Date.now();
      const claimToken = await submitAnonymously(app, buildSubmission(quiz));

      const [attempt] = await attemptRows();
      expect(attempt?.claim_token_hash).toBe(createHash('sha256').update(claimToken).digest('hex'));
      expect(JSON.stringify(attempt)).not.toContain(claimToken);

      const lifetimeMs = (attempt?.claim_expires_at?.getTime() ?? 0) - before;
      const dayMs = 24 * 60 * 60 * 1000;
      expect(lifetimeMs).toBeGreaterThan(dayMs - 5000);
      expect(lifetimeMs).toBeLessThan(dayMs + 5000);
    });
  });

  describe('validation', () => {
    const expectRejected = async (body: object, status: number, code?: string) => {
      const response = await submit(body).expect(status);
      const error = response.body as ApiErrorBody;

      expect(error.code).toBe(code);
      expect(await countAttempts()).toBe(0);
      return error;
    };

    it('rejects a submission that omits a question', async () => {
      const submission = buildSubmission(quiz);
      submission.answers.pop();

      const error = await expectRejected(submission, 400, 'ATTEMPT_INVALID');
      expect(error.message).toEqual(['Question "forget_daily_tasks" is not answered']);
    });

    it('rejects a question answered twice', async () => {
      const submission = buildSubmission(quiz);
      submission.answers.push({ questionKey: 'misplace_things', optionKey: 'neutral' });

      await expectRejected(submission, 400, 'ATTEMPT_INVALID');
    });

    it('rejects an option key the version does not define', async () => {
      await expectRejected(buildSubmission(quiz, 'sometimes'), 400, 'ATTEMPT_INVALID');
    });

    it('rejects a question key the version does not define', async () => {
      const submission = buildSubmission(quiz);
      submission.answers.push({ questionKey: 'made_up', optionKey: 'agree' });

      await expectRejected(submission, 400, 'ATTEMPT_INVALID');
    });

    it('rejects a gender other than male or female', async () => {
      await expectRejected({ ...buildSubmission(quiz), gender: 'other' }, 400);
    });

    it('rejects properties that are not part of the contract', async () => {
      await expectRejected({ ...buildSubmission(quiz), userId: randomUUID() }, 400);
      await expectRejected(
        {
          ...buildSubmission(quiz),
          answers: buildSubmission(quiz).answers.map((answer) => ({ ...answer, score: 4 })),
        },
        400,
      );
    });

    it('rejects a malformed body', async () => {
      await expectRejected({}, 400);
      await expectRejected({ ...buildSubmission(quiz), quizVersionId: 'not-a-uuid' }, 400);
      await expectRejected({ ...buildSubmission(quiz), answers: 'agree' }, 400);
      await expectRejected(
        { ...buildSubmission(quiz), answers: [buildSubmission(quiz).answers] },
        400,
      );
    });

    it('rejects a quiz version that is no longer active and tells the client to reload', async () => {
      const outdated = buildSubmission(quiz);
      await publishVersionTwo(app);

      const error = await expectRejected(outdated, 409, 'QUIZ_VERSION_OUTDATED');
      expect(error.message).toMatch(/reload/i);
    });

    it('rejects a quiz version that does not exist', async () => {
      await expectRejected(
        buildSubmission(quiz, 'agree', { quizVersionId: randomUUID() }),
        409,
        'QUIZ_VERSION_OUTDATED',
      );
    });
  });

  describe('when the quiz changes after an attempt', () => {
    it('keeps the original version and the original answers', async () => {
      await submitAnonymously(app, buildSubmission(quiz, 'strongly_agree'));
      const answersBefore = await dataSource.query<object[]>(
        `SELECT * FROM attempt_answers ORDER BY 2`,
      );

      const versionTwoId = await publishVersionTwo(app);

      const [attempt] = await attemptRows();
      expect(attempt?.quiz_version_id).toBe(quiz.versionId);
      expect(attempt?.quiz_version_id).not.toBe(versionTwoId);
      expect(await dataSource.query<object[]>(`SELECT * FROM attempt_answers ORDER BY 2`)).toEqual(
        answersBefore,
      );
    });

    it('does not allow stored answers to be edited', async () => {
      await submitAnonymously(app, buildSubmission(quiz));

      await expect(
        dataSource.query(`UPDATE attempt_answers SET option_key = 'strongly_agree'`),
      ).rejects.toThrow(/immutable/);
    });

    it('does not allow a version with attempts to be deleted', async () => {
      await submitAnonymously(app, buildSubmission(quiz));

      await expect(dataSource.query(`DELETE FROM quiz_versions WHERE version = 1`)).rejects.toThrow(
        /foreign key/,
      );
    });
  });

  describe('claiming', () => {
    const expectInvalidToken = async (promise: Promise<unknown>) => {
      await expect(promise).rejects.toMatchObject({
        response: { statusCode: 400, code: 'CLAIM_TOKEN_INVALID' },
      });
    };

    it('attaches the attempt to the user and consumes the token', async () => {
      const userId = await createUser(app);
      const claimToken = await submitAnonymously(app, buildSubmission(quiz));

      await attemptsService.claim(claimToken, userId);

      const [attempt] = await attemptRows();
      expect(attempt).toMatchObject({
        user_id: userId,
        claim_token_hash: null,
        claim_expires_at: null,
      });
      expect((await attemptsService.findCurrentForUser(userId))?.id).toBe(attempt?.id);
    });

    it('rejects a token that was already used, for the same and for another user', async () => {
      const userId = await createUser(app);
      const claimToken = await submitAnonymously(app, buildSubmission(quiz));
      await attemptsService.claim(claimToken, userId);

      await expectInvalidToken(attemptsService.claim(claimToken, userId));
      await expectInvalidToken(attemptsService.claim(claimToken, await createUser(app)));

      const [attempt] = await attemptRows();
      expect(attempt?.user_id).toBe(userId);
    });

    it('lets only one of two concurrent claims win', async () => {
      const claimToken = await submitAnonymously(app, buildSubmission(quiz));

      const [first, second] = [await createUser(app), await createUser(app)];

      const results = await Promise.allSettled([
        attemptsService.claim(claimToken, first),
        attemptsService.claim(claimToken, second),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    });

    it('rejects an expired token and leaves the attempt unowned', async () => {
      const claimToken = await submitAnonymously(app, buildSubmission(quiz));
      await dataSource.query(`UPDATE attempts SET claim_expires_at = now() - interval '1 second'`);

      await expectInvalidToken(attemptsService.claim(claimToken, await createUser(app)));

      const [attempt] = await attemptRows();
      expect(attempt?.user_id).toBeNull();
    });

    it('rejects a token that was never issued', async () => {
      await submitAnonymously(app, buildSubmission(quiz));

      await expectInvalidToken(attemptsService.claim('x'.repeat(43), await createUser(app)));
    });

    it('rolls back together with the transaction it takes part in', async () => {
      const userId = await createUser(app);
      const claimToken = await submitAnonymously(app, buildSubmission(quiz));

      await expect(
        dataSource.transaction(async (manager) => {
          await attemptsService.claim(claimToken, userId, manager);
          throw new Error('account creation failed');
        }),
      ).rejects.toThrow('account creation failed');

      // The token is still usable because the claim was rolled back.
      await attemptsService.claim(claimToken, userId);
      expect((await attemptsService.findCurrentForUser(userId))?.userId).toBe(userId);
    });
  });

  describe('retakes', () => {
    it('makes the new attempt current and keeps the earlier one with its answers', async () => {
      const userId = await createUser(app);
      await attemptsService.claim(
        await submitAnonymously(app, buildSubmission(quiz, 'strongly_disagree')),
        userId,
      );
      await attemptsService.claim(
        await submitAnonymously(app, buildSubmission(quiz, 'strongly_agree')),
        userId,
      );

      const attempts = await attemptsService.findRecentForUser(userId);
      expect(attempts).toHaveLength(2);

      const [current, earlier] = attempts;
      expect(current?.answers.map((answer) => answer.optionKey)).toEqual(
        Array(5).fill('strongly_agree'),
      );
      expect(earlier?.answers.map((answer) => answer.optionKey)).toEqual(
        Array(5).fill('strongly_disagree'),
      );
      expect((await attemptsService.findCurrentForUser(userId))?.id).toBe(current?.id);
    });

    it('attaches a submission made while signed in directly, without a claim token', async () => {
      const userId = await createUser(app);

      const result = await attemptsService.submit(buildSubmission(quiz), userId);

      expect(result.claimToken).toBeNull();
      const [attempt] = await attemptRows();
      expect(attempt).toMatchObject({ user_id: userId, claim_token_hash: null });
    });

    it('keeps the answer to a question that a newer version dropped', async () => {
      const userId = await createUser(app);
      await attemptsService.claim(await submitAnonymously(app, buildSubmission(quiz)), userId);

      await publishVersionTwo(app);
      const versionTwo = await fetchQuiz(app);
      await attemptsService.claim(
        await submitAnonymously(app, buildSubmission(versionTwo, 'yes')),
        userId,
      );

      const [current, earlier] = await attemptsService.findRecentForUser(userId);
      expect(current?.quizVersion.version).toBe(2);
      expect(earlier?.quizVersion.version).toBe(1);
      expect(earlier?.answers.map((answer) => answer.questionKey)).toContain('misplace_things');
      expect(current?.answers.map((answer) => answer.questionKey)).not.toContain('misplace_things');
    });

    it('keeps the more recently submitted attempt current when an older one is claimed late', async () => {
      const userId = await createUser(app);
      const olderToken = await submitAnonymously(app, buildSubmission(quiz, 'disagree'));
      await dataSource.query(`UPDATE attempts SET created_at = now() - interval '1 hour'`);
      const newerToken = await submitAnonymously(app, buildSubmission(quiz, 'agree'));

      await attemptsService.claim(newerToken, userId);
      await attemptsService.claim(olderToken, userId);

      const attempts = await attemptsService.findRecentForUser(userId);
      expect(attempts).toHaveLength(2);
      const current = await attemptsService.findCurrentForUser(userId);
      expect(current?.answers.every((answer) => answer.optionKey === 'agree')).toBe(true);
    });

    it('does not show one user the attempts of another', async () => {
      const first = await createUser(app);
      const second = await createUser(app);
      await attemptsService.claim(await submitAnonymously(app, buildSubmission(quiz)), first);

      expect(await attemptsService.findCurrentForUser(second)).toBeNull();
      expect(await attemptsService.findRecentForUser(first)).toHaveLength(1);
    });
  });
});
