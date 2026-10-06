import type { Quiz, SubmitAttemptRequest } from '@boosta/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

/**
 * Removes everything tests create and restores what the migrations created:
 * no attempts, quiz version 1 only and active. All e2e files share one
 * database, so each file calls this after every test.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.query(`TRUNCATE "attempts" CASCADE`);
  await dataSource.query(`UPDATE "quiz_versions" SET "is_active" = false WHERE "version" <> 1`);
  await dataSource.query(`UPDATE "quiz_versions" SET "is_active" = true WHERE "version" = 1`);
  await dataSource.query(`DELETE FROM "quiz_versions" WHERE "version" <> 1`);
}

export async function fetchQuiz(app: INestApplication<App>): Promise<Quiz> {
  const response = await request(app.getHttpServer()).get('/api/quiz').expect(200);
  return response.body as Quiz;
}

/** A complete, valid submission for the given quiz: every question answered with `optionKey`. */
export function buildSubmission(
  quiz: Quiz,
  optionKey = 'agree',
  overrides: Partial<SubmitAttemptRequest> = {},
): SubmitAttemptRequest {
  return {
    quizVersionId: quiz.versionId,
    gender: 'female',
    answers: quiz.questions.map((question) => ({ questionKey: question.key, optionKey })),
    ...overrides,
  };
}

/** Submits anonymously and returns the claim token. */
export async function submitAnonymously(
  app: INestApplication<App>,
  submission: SubmitAttemptRequest,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/attempts')
    .send(submission)
    .expect(201);
  const { claimToken } = response.body as { claimToken: string | null };
  if (claimToken === null) {
    throw new Error('Expected a claim token for an anonymous submission');
  }
  return claimToken;
}

/** Publishes and activates a second quiz version the way a migration would. */
export async function publishVersionTwo(app: INestApplication): Promise<string> {
  const definition = JSON.stringify({
    questions: [
      { key: 'lose_track_of_time', text: 'I lose track of time' },
      { key: 'restless_when_idle', text: 'I feel restless when I have nothing to do' },
    ],
    options: [
      { key: 'yes', label: 'Yes', score: 1 },
      { key: 'no', label: 'No', score: 0 },
    ],
    scoring: { highThreshold: 50 },
  });
  return app.get(DataSource).transaction(async (manager) => {
    const [row] = await manager.query<{ id: string }[]>(
      `INSERT INTO "quiz_versions" ("version", "is_active", "definition")
       VALUES (2, false, $1) RETURNING "id"`,
      [definition],
    );
    await manager.query(`UPDATE "quiz_versions" SET "is_active" = false WHERE "version" = 1`);
    await manager.query(`UPDATE "quiz_versions" SET "is_active" = true WHERE "version" = 2`);
    if (!row) {
      throw new Error('Version 2 was not inserted');
    }
    return row.id;
  });
}
