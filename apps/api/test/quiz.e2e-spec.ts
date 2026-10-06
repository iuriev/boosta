import type { Quiz } from '@boosta/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { resetDatabase } from './helpers';
import { createTestApp } from './test-app';

const SAMPLE_DEFINITION = JSON.stringify({
  questions: [{ key: 'sample_question', text: 'Sample?' }],
  options: [
    { key: 'yes', label: 'Yes', score: 1 },
    { key: 'no', label: 'No', score: 0 },
  ],
  scoring: { highThreshold: 50 },
});

describe('Quiz (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const getQuiz = async (): Promise<Quiz> => {
    const response = await request(app.getHttpServer()).get('/api/quiz').expect(200);
    return response.body as Quiz;
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/quiz', () => {
    it('serves the default quiz on a database that only had migrations applied', async () => {
      const quiz = await getQuiz();

      expect(quiz.version).toBe(1);
      expect(quiz.versionId).toMatch(/^[0-9a-f-]{36}$/);
      expect(quiz.questions).toEqual([
        {
          key: 'lose_track_of_time',
          text: 'I easily lose track of time when doing something I enjoy',
        },
        { key: 'misplace_things', text: 'I often misplace things like my phone, keys, or wallet' },
        {
          key: 'struggle_to_finish_tasks',
          text: 'I frequently start tasks but struggle to finish them',
        },
        {
          key: 'hard_to_stay_focused',
          text: 'I find it hard to stay focused during conversations or meetings',
        },
        {
          key: 'forget_daily_tasks',
          text: 'I often forget about daily tasks like appointments or returning calls',
        },
      ]);
      expect(quiz.options).toEqual([
        { key: 'strongly_agree', label: 'Strongly agree' },
        { key: 'agree', label: 'Agree' },
        { key: 'neutral', label: 'Neutral' },
        { key: 'disagree', label: 'Disagree' },
        { key: 'strongly_disagree', label: 'Strongly disagree' },
      ]);
    });

    it('needs no authentication', async () => {
      await request(app.getHttpServer()).get('/api/quiz').unset('Cookie').expect(200);
    });

    it('does not expose option scores or the level threshold', async () => {
      const response = await request(app.getHttpServer()).get('/api/quiz').expect(200);

      expect(response.text).not.toMatch(/score|scoring|threshold/i);
    });
  });

  describe('seeding', () => {
    it('stores the scoring of the default quiz: options worth 4 to 0, threshold 60', async () => {
      const [row] = await dataSource.query<{ scores: number[]; threshold: number }[]>(`
        SELECT
          ARRAY(SELECT (option->>'score')::int FROM jsonb_array_elements(definition->'options') AS option) AS scores,
          (definition->'scoring'->>'highThreshold')::int AS threshold
        FROM quiz_versions WHERE version = 1
      `);

      expect(row).toEqual({ scores: [4, 3, 2, 1, 0], threshold: 60 });
    });

    it('does not duplicate the default quiz when the application starts again', async () => {
      const secondApp = await createTestApp();
      await secondApp.close();

      const rows = await dataSource.query<{ version: number; is_active: boolean }[]>(
        `SELECT version, is_active FROM quiz_versions`,
      );
      expect(rows).toEqual([{ version: 1, is_active: true }]);
    });
  });

  describe('versioning', () => {
    it('rejects a second active version', async () => {
      await expect(
        dataSource.query(
          `INSERT INTO quiz_versions (version, is_active, definition) VALUES (2, true, $1)`,
          [SAMPLE_DEFINITION],
        ),
      ).rejects.toThrow(/quiz_versions_single_active/);
    });

    it('rejects changes to the content of a published version', async () => {
      await expect(
        dataSource.query(`UPDATE quiz_versions SET definition = $1 WHERE version = 1`, [
          SAMPLE_DEFINITION,
        ]),
      ).rejects.toThrow(/immutable/);
      await expect(
        dataSource.query(`UPDATE quiz_versions SET version = 7 WHERE version = 1`),
      ).rejects.toThrow(/immutable/);
      await expect(
        dataSource.query(`UPDATE quiz_versions SET id = gen_random_uuid() WHERE version = 1`),
      ).rejects.toThrow(/immutable/);

      expect((await getQuiz()).questions).toHaveLength(5);
    });

    it('fails without leaking details when no version is active', async () => {
      await dataSource.query(`UPDATE quiz_versions SET is_active = false`);

      const response = await request(app.getHttpServer()).get('/api/quiz').expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        message: 'No active quiz version',
        error: 'Internal Server Error',
      });
    });

    it('serves a newly activated version and keeps the previous one intact', async () => {
      const [before] = await dataSource.query<{ id: string; definition: unknown }[]>(
        `SELECT id, definition FROM quiz_versions WHERE version = 1`,
      );

      // What a publishing migration does: insert, then move the active flag.
      await dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO quiz_versions (version, is_active, definition) VALUES (2, false, $1)`,
          [SAMPLE_DEFINITION],
        );
        await manager.query(`UPDATE quiz_versions SET is_active = false WHERE version = 1`);
        await manager.query(`UPDATE quiz_versions SET is_active = true WHERE version = 2`);
      });

      const quiz = await getQuiz();
      expect(quiz.version).toBe(2);
      expect(quiz.questions).toEqual([{ key: 'sample_question', text: 'Sample?' }]);

      const [after] = await dataSource.query<{ id: string; definition: unknown }[]>(
        `SELECT id, definition FROM quiz_versions WHERE version = 1`,
      );
      expect(after).toEqual(before);
    });
  });
});
