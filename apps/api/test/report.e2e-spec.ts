import type { ApiErrorBody, Quiz, Report, ReportBlock } from '@boosta/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import {
  buildSubmission,
  fetchQuiz,
  login,
  publishVersionTwo,
  register,
  resetDatabase,
  type Session,
  submitAnonymously,
} from './helpers';
import { createTestApp } from './test-app';

describe('Report (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let quiz: Quiz;

  const http = () => request(app.getHttpServer());

  /** Takes the quiz with the given options, one per question, and registers. */
  const registerWithAnswers = async (
    email: string,
    optionKeys: string[],
    gender: 'male' | 'female' = 'female',
  ): Promise<Session> => {
    const claimToken = await submitAnonymously(app, {
      quizVersionId: quiz.versionId,
      gender,
      answers: quiz.questions.map((question, index) => ({
        questionKey: question.key,
        optionKey: optionKeys[index] ?? 'neutral',
      })),
    });
    return register(app, email, claimToken);
  };

  const getReport = async (session: Session): Promise<Report> => {
    const response = await http().get('/api/report').set('Cookie', session.cookie).expect(200);
    return response.body as Report;
  };

  const sectionOf = (report: Report, key: string): ReportBlock | undefined =>
    report.sections.find((section) => section.key === key);

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
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

  describe('GET /api/report', () => {
    it('returns the score, level, gender and ordered sections of the attempt', async () => {
      const session = await registerWithAnswers(
        'high@example.com',
        ['agree', 'agree', 'neutral', 'agree', 'agree'],
        'female',
      );

      const report = await getReport(session);

      expect(report).toMatchObject({
        score: 70,
        level: 'high',
        levelLabel: 'High ADHD Traits',
        gender: 'female',
      });
      expect(new Date(report.submittedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
      expect(report.sections.map((section) => [section.key, section.type])).toEqual([
        ['understanding-your-score', 'text'],
        ['strengths', 'checklist'],
        ['emotional-regulation', 'text-with-bullets'],
        ['faq', 'faq'],
      ]);
      expect(sectionOf(report, 'understanding-your-score')).toMatchObject({
        text: expect.stringContaining('In women') as string,
      });
    });

    it('returns the low-level, male content for a low score from a male respondent', async () => {
      const session = await registerWithAnswers(
        'low@example.com',
        ['disagree', 'neutral', 'disagree', 'strongly_disagree', 'neutral'],
        'male',
      );

      const report = await getReport(session);

      // 1 + 2 + 1 + 0 + 2 = 6 of 20
      expect(report).toMatchObject({
        score: 30,
        level: 'low',
        levelLabel: 'Low ADHD Traits',
        gender: 'male',
      });
      expect(sectionOf(report, 'understanding-your-score')).toMatchObject({
        text: expect.stringMatching(/minimal ADHD traits.*In men/) as string,
      });
      expect(sectionOf(report, 'emotional-regulation')).toMatchObject({ type: 'text' });
      expect(sectionOf(report, 'faq')).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({ question: 'Is a low score something to be proud of?' }),
        ]) as unknown,
      });
    });

    it.each([
      [['agree', 'agree', 'neutral', 'neutral', 'neutral'], 60, 'high'],
      [['agree', 'neutral', 'neutral', 'neutral', 'neutral'], 55, 'low'],
      [Array<string>(5).fill('strongly_agree'), 100, 'high'],
      [Array<string>(5).fill('strongly_disagree'), 0, 'low'],
    ])('scores %j as %i, %s traits', async (optionKeys, score, level) => {
      const session = await registerWithAnswers('boundary@example.com', optionKeys);

      expect(await getReport(session)).toMatchObject({ score, level });
    });

    it('exposes no answers, option scores or thresholds', async () => {
      const session = await registerWithAnswers('user@example.com', Array<string>(5).fill('agree'));

      const response = await http().get('/api/report').set('Cookie', session.cookie).expect(200);

      expect(response.text).not.toMatch(/highThreshold|optionKey|questionKey|strongly_agree/);
      expect(Object.keys(response.body as object).sort()).toEqual(
        ['gender', 'level', 'levelLabel', 'score', 'sections', 'submittedAt'].sort(),
      );
    });

    it('rejects a request without a session', async () => {
      await http().get('/api/report').expect(401);
      await http().get('/api/report').set('Cookie', 'session=garbage').expect(401);
    });

    it('answers 404 with a code for a user who has not taken the quiz', async () => {
      const session = await register(app, 'new@example.com');

      const response = await http().get('/api/report').set('Cookie', session.cookie).expect(404);

      expect(response.body as ApiErrorBody).toMatchObject({
        statusCode: 404,
        code: 'REPORT_NOT_FOUND',
      });
    });
  });

  describe('data isolation', () => {
    it('gives each user only the report built from their own attempt', async () => {
      const alice = await registerWithAnswers(
        'alice@example.com',
        Array<string>(5).fill('strongly_agree'),
        'female',
      );
      const bob = await registerWithAnswers(
        'bob@example.com',
        Array<string>(5).fill('strongly_disagree'),
        'male',
      );

      expect(await getReport(alice)).toMatchObject({ score: 100, level: 'high', gender: 'female' });
      expect(await getReport(bob)).toMatchObject({ score: 0, level: 'low', gender: 'male' });
    });

    it('ignores any attempt to select another user', async () => {
      const alice = await registerWithAnswers(
        'alice@example.com',
        Array<string>(5).fill('strongly_agree'),
      );
      const bob = await registerWithAnswers(
        'bob@example.com',
        Array<string>(5).fill('strongly_disagree'),
      );

      const response = await http()
        .get('/api/report')
        .query({ userId: alice.body.user.id, attemptId: 'anything' })
        .set('X-User-Id', alice.body.user.id)
        .set('Cookie', bob.cookie)
        .expect(200);

      expect(response.body).toMatchObject({ score: 0 });
      await http().get(`/api/report/${alice.body.user.id}`).set('Cookie', bob.cookie).expect(404);
    });
  });

  describe('retakes', () => {
    it('follows the most recently submitted attempt, including a change of gender', async () => {
      const session = await registerWithAnswers(
        'user@example.com',
        Array<string>(5).fill('strongly_disagree'),
        'male',
      );
      expect(await getReport(session)).toMatchObject({ score: 0, level: 'low', gender: 'male' });

      await http()
        .post('/api/attempts')
        .set('Cookie', session.cookie)
        .send(buildSubmission(quiz, 'strongly_agree', { gender: 'female' }))
        .expect(201);

      expect(await getReport(session)).toMatchObject({
        score: 100,
        level: 'high',
        gender: 'female',
      });
    });

    it('follows an attempt taken while signed out once it is claimed by signing in', async () => {
      await registerWithAnswers('user@example.com', Array<string>(5).fill('strongly_disagree'));
      const claimToken = await submitAnonymously(app, buildSubmission(quiz, 'strongly_agree'));

      const session = await login(app, 'user@example.com', claimToken);

      expect(await getReport(session)).toMatchObject({ score: 100, level: 'high' });
    });
  });

  describe('when the quiz or the stored data changes', () => {
    it('still serves the report of an attempt taken against a replaced quiz version', async () => {
      const session = await registerWithAnswers('user@example.com', [
        'agree',
        'agree',
        'neutral',
        'agree',
        'agree',
      ]);
      const before = await getReport(session);

      await publishVersionTwo(app);

      // Scored with version 1 weights and threshold, although version 2 is active.
      expect(await getReport(session)).toEqual(before);
    });

    it('scores an attempt on a newer version with that version, and keeps the older attempt', async () => {
      const session = await registerWithAnswers(
        'user@example.com',
        Array<string>(5).fill('strongly_disagree'),
      );
      await publishVersionTwo(app);
      const versionTwo = await fetchQuiz(app);

      // Version 2: two yes/no questions, threshold 50. One "yes" of two is 50: high.
      await http()
        .post('/api/attempts')
        .set('Cookie', session.cookie)
        .send({
          quizVersionId: versionTwo.versionId,
          gender: 'female',
          answers: [
            { questionKey: 'lose_track_of_time', optionKey: 'yes' },
            { questionKey: 'restless_when_idle', optionKey: 'no' },
          ],
        })
        .expect(201);

      expect(await getReport(session)).toMatchObject({ score: 50, level: 'high' });
      const [{ count } = { count: '0' }] = await dataSource.query<{ count: string }[]>(
        `SELECT count(*) FROM attempts`,
      );
      expect(count).toBe('2');
    });

    it('computes the report on every read instead of storing it', async () => {
      const session = await registerWithAnswers(
        'user@example.com',
        Array<string>(5).fill('strongly_agree'),
      );
      await getReport(session);

      const columns = await dataSource.query<{ column_name: string }[]>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name IN ('attempts', 'attempt_answers', 'users')`,
      );

      expect(columns.map((column) => column.column_name).join(' ')).not.toMatch(
        /score|level|report/,
      );
    });
  });
});
