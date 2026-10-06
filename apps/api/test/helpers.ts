import type { AuthResponse, Quiz, SubmitAttemptRequest } from '@boosta/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

/**
 * Removes everything tests create and restores what the migrations created:
 * no users, no attempts, quiz version 1 only and active. All e2e files share one
 * database, so each file calls this after every test.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.query(`TRUNCATE "users", "attempts" CASCADE`);
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
    schemaVersion: 1,
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

/**
 * Moves the submission time of every stored attempt into the past. The database
 * refuses this in normal operation, so the guard is lifted for the one statement.
 */
export async function backdateAttempts(app: INestApplication, interval: string): Promise<void> {
  await app.get(DataSource).transaction(async (manager) => {
    await manager.query(`ALTER TABLE "attempts" DISABLE TRIGGER "attempts_facts_immutable"`);
    await manager.query(`UPDATE "attempts" SET "created_at" = now() - $1::interval`, [interval]);
    await manager.query(`ALTER TABLE "attempts" ENABLE TRIGGER "attempts_facts_immutable"`);
  });
}

let userCounter = 0;

/** Inserts an account directly, for tests that need an owner but not the auth flow. */
export async function createUser(app: INestApplication): Promise<string> {
  userCounter += 1;
  const [row] = await app
    .get(DataSource)
    .query<{ id: string }[]>(
      `INSERT INTO "users" ("email", "password_hash") VALUES ($1, 'not-a-real-hash') RETURNING "id"`,
      [`user-${String(userCounter)}-${String(Date.now())}@example.com`],
    );
  if (!row) {
    throw new Error('User was not inserted');
  }
  return row.id;
}

export const PASSWORD = 'correct horse battery';

export interface Session {
  /** `session=...`, ready for a Cookie header. */
  cookie: string;
  /** The raw Set-Cookie header, for asserting attributes. */
  setCookie: string;
  body: AuthResponse;
}

function readSession(response: request.Response): Session {
  const setCookie = (response.headers['set-cookie'] as unknown as string[] | undefined)?.find(
    (header) => header.startsWith('session='),
  );
  if (!setCookie) {
    throw new Error('The response did not set a session cookie');
  }
  return {
    cookie: setCookie.split(';')[0] ?? '',
    setCookie,
    body: response.body as AuthResponse,
  };
}

export async function register(
  app: INestApplication<App>,
  email: string,
  claimToken?: string,
  password = PASSWORD,
): Promise<Session> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password, claimToken })
    .expect(201);
  return readSession(response);
}

export async function login(
  app: INestApplication<App>,
  email: string,
  claimToken?: string,
  password = PASSWORD,
): Promise<Session> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password, claimToken })
    .expect(200);
  return readSession(response);
}
