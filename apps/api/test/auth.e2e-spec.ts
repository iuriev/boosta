import type { ApiErrorBody, AuthResponse, MeResponse, Quiz } from '@boosta/contracts';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { AttemptsService } from '../src/attempts/attempts.service';
import {
  buildSubmission,
  fetchQuiz,
  login,
  PASSWORD,
  register,
  resetDatabase,
  submitAnonymously,
} from './helpers';
import { createTestApp } from './test-app';

const EMAIL = 'user@example.com';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let attemptsService: AttemptsService;
  let quiz: Quiz;

  const http = () => request(app.getHttpServer());
  const countUsers = async () =>
    (await dataSource.query<{ count: string }[]>(`SELECT count(*) FROM users`))[0]?.count;
  const optionKeysOfCurrentAttempt = async (userId: string) =>
    (await attemptsService.findCurrentForUser(userId))?.answers.map((answer) => answer.optionKey);
  const finishQuiz = (optionKey = 'agree') =>
    submitAnonymously(app, buildSubmission(quiz, optionKey));

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

  describe('session', () => {
    it('rejects a protected route without a cookie', async () => {
      const response = await http().get('/api/auth/me').expect(401);

      expect(response.body).toMatchObject({ statusCode: 401, message: 'Sign in to continue' });
    });

    it('rejects a tampered cookie', async () => {
      const { cookie } = await register(app, EMAIL);
      const tampered = `${cookie.slice(0, -3)}abc`;

      await http().get('/api/auth/me').set('Cookie', tampered).expect(401);
    });

    it('rejects a token signed with another secret', async () => {
      const { body } = await register(app, EMAIL);
      const forged = await new JwtService({ secret: 'x'.repeat(40) }).signAsync({
        sub: body.user.id,
      });

      await http().get('/api/auth/me').set('Cookie', `session=${forged}`).expect(401);
    });

    it('rejects an expired token', async () => {
      const { body } = await register(app, EMAIL);
      const expired = await app
        .get(JwtService)
        .signAsync({ sub: body.user.id }, { expiresIn: -10 });

      await http().get('/api/auth/me').set('Cookie', `session=${expired}`).expect(401);
    });

    it('rejects a valid token whose account no longer exists', async () => {
      const { cookie } = await register(app, EMAIL);
      await dataSource.query(`DELETE FROM users`);

      await http().get('/api/auth/me').set('Cookie', cookie).expect(401);
    });

    it('sets an http-only, same-site cookie that lasts seven days', async () => {
      const { setCookie } = await register(app, EMAIL);

      expect(setCookie).toMatch(/; HttpOnly/);
      expect(setCookie).toMatch(/; SameSite=Lax/);
      expect(setCookie).toMatch(/; Path=\//);
      expect(setCookie).toMatch(/; Max-Age=604800/);
      // Not marked Secure outside production, so it works over http://localhost.
      expect(setCookie).not.toMatch(/; Secure/);
    });

    it('rejects a token whose subject is not a user id', async () => {
      const odd = await app.get(JwtService).signAsync({ sub: 'admin' });

      await http().get('/api/auth/me').set('Cookie', `session=${odd}`).expect(401);
    });

    it('rejects an unsigned token', async () => {
      const { body } = await register(app, EMAIL);
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: body.user.id })}.`;

      await http().get('/api/auth/me').set('Cookie', `session=${unsigned}`).expect(401);
    });

    it('keeps public routes public, even with a bad cookie', async () => {
      await http().get('/api/quiz').set('Cookie', 'session=garbage').expect(200);
      await http().get('/api/health').expect(200);
    });
  });

  describe('cross-site form posts', () => {
    it.each(['application/x-www-form-urlencoded', 'text/plain', 'multipart/form-data'])(
      'refuses a %s body, so a foreign form cannot sign a visitor in',
      async (contentType) => {
        await register(app, EMAIL);

        const response = await http()
          .post('/api/auth/login')
          .set('Content-Type', contentType)
          .send(`email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`)
          .expect(415);

        expect(response.headers['set-cookie']).toBeUndefined();
      },
    );

    it('refuses form-encoded registration and quiz submission', async () => {
      await http()
        .post('/api/auth/register')
        .type('form')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(415);
      await http().post('/api/attempts').type('form').send({ gender: 'male' }).expect(415);
      expect(await countUsers()).toBe('0');
    });
  });

  describe('POST /api/auth/register', () => {
    it('creates an account after the quiz, attaches the attempt and starts a session', async () => {
      const claimToken = await finishQuiz('strongly_agree');

      const { body, cookie } = await register(app, EMAIL, claimToken);

      expect(body).toEqual({
        user: { id: expect.any(String) as string, email: EMAIL },
        hasAttempt: true,
        attemptClaimed: true,
      });
      expect(await optionKeysOfCurrentAttempt(body.user.id)).toEqual(
        Array(5).fill('strongly_agree'),
      );

      const me = await http().get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body).toEqual({ user: body.user, hasAttempt: true } satisfies MeResponse);
    });

    it('creates an account before the quiz, without an attempt', async () => {
      const { body } = await register(app, EMAIL);

      expect(body).toMatchObject({ hasAttempt: false, attemptClaimed: false });
      expect(await attemptsService.findCurrentForUser(body.user.id)).toBeNull();
    });

    it('stores the password only as a bcrypt hash', async () => {
      await register(app, EMAIL);

      const [user] = await dataSource.query<{ password_hash: string }[]>(
        `SELECT password_hash FROM users`,
      );
      expect(user?.password_hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      expect(user?.password_hash).not.toContain(PASSWORD);
    });

    it('never returns the password or its hash', async () => {
      const response = await http()
        .post('/api/auth/register')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(201);

      expect(response.text).not.toMatch(/password|\$2[aby]\$/i);
    });

    it('rejects an invalid claim token and creates no account', async () => {
      const usedToken = await finishQuiz();
      await register(app, 'first@example.com', usedToken);

      for (const claimToken of [usedToken, 'x'.repeat(43)]) {
        const response = await http()
          .post('/api/auth/register')
          .send({ email: EMAIL, password: PASSWORD, claimToken })
          .expect(400);

        expect((response.body as ApiErrorBody).code).toBe('CLAIM_TOKEN_INVALID');
        expect(response.headers['set-cookie']).toBeUndefined();
      }
      expect(await countUsers()).toBe('1');
    });

    it('rejects an expired claim token and creates no account', async () => {
      const claimToken = await finishQuiz();
      await dataSource.query(`UPDATE attempts SET claim_expires_at = now() - interval '1 second'`);

      const response = await http()
        .post('/api/auth/register')
        .send({ email: EMAIL, password: PASSWORD, claimToken })
        .expect(400);

      expect((response.body as ApiErrorBody).code).toBe('CLAIM_TOKEN_INVALID');
      expect(await countUsers()).toBe('0');
    });

    it.each([
      ['a password shorter than 8 characters', { email: EMAIL, password: 'short12' }],
      ['a password longer than 72 characters', { email: EMAIL, password: 'a'.repeat(73) }],
      ['a password longer than 72 bytes', { email: EMAIL, password: 'é'.repeat(40) }],
      ['a malformed email', { email: 'not-an-email', password: PASSWORD }],
      ['a missing email', { password: PASSWORD }],
      ['a missing password', { email: EMAIL }],
      ['an unexpected property', { email: EMAIL, password: PASSWORD, role: 'admin' }],
    ])('rejects %s', async (_name, body) => {
      await http().post('/api/auth/register').send(body).expect(400);

      expect(await countUsers()).toBe('0');
    });

    it('accepts a password of exactly 8 and exactly 72 characters', async () => {
      await register(app, 'eight@example.com', undefined, 'a'.repeat(8));
      await register(app, 'seventy-two@example.com', undefined, 'a'.repeat(72));
    });

    it('creates one account when the same registration is submitted twice at once', async () => {
      const claimToken = await finishQuiz();
      const submit = () =>
        http().post('/api/auth/register').send({ email: EMAIL, password: PASSWORD, claimToken });

      const responses = await Promise.all([submit(), submit()]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
      expect(await countUsers()).toBe('1');
      const [first, second] = responses.map((response) => response.body as AuthResponse);
      expect(first?.user.id).toBe(second?.user.id);
      expect(await attemptsService.findRecentForUser(first?.user.id ?? '')).toHaveLength(1);
    });

    it('treats the same email in a different case or with spaces as the same account', async () => {
      await register(app, EMAIL);

      const response = await http()
        .post('/api/auth/register')
        .send({ email: '  User@Example.COM ', password: 'another password' })
        .expect(409);

      expect((response.body as ApiErrorBody).code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(await countUsers()).toBe('1');
    });

    it('rejects the same email in a different case at the database level', async () => {
      await register(app, EMAIL);

      await expect(
        dataSource.query(
          `INSERT INTO users (email, password_hash) VALUES ('USER@example.com', 'x')`,
        ),
      ).rejects.toThrow(/duplicate key/);
    });

    describe('with an email that already has an account', () => {
      it('signs in and makes the new attempt current when the password matches', async () => {
        const first = await register(app, EMAIL, await finishQuiz('strongly_disagree'));
        const claimToken = await finishQuiz('strongly_agree');

        const response = await http()
          .post('/api/auth/register')
          .send({ email: EMAIL, password: PASSWORD, claimToken })
          .expect(200);
        const body = response.body as AuthResponse;

        expect(body).toEqual({ user: first.body.user, hasAttempt: true, attemptClaimed: true });
        expect(response.headers['set-cookie']).toBeDefined();
        expect(await countUsers()).toBe('1');
        expect(await optionKeysOfCurrentAttempt(body.user.id)).toEqual(
          Array(5).fill('strongly_agree'),
        );
        // The earlier attempt is still there.
        expect(await attemptsService.findRecentForUser(body.user.id)).toHaveLength(2);
      });

      it('signs in without claiming when the claim token is no longer valid', async () => {
        const first = await register(app, EMAIL, await finishQuiz('strongly_disagree'));

        const response = await http()
          .post('/api/auth/register')
          .send({ email: EMAIL, password: PASSWORD, claimToken: 'x'.repeat(43) })
          .expect(200);

        expect(response.body).toEqual({
          user: first.body.user,
          hasAttempt: true,
          attemptClaimed: false,
        });
        expect(await attemptsService.findRecentForUser(first.body.user.id)).toHaveLength(1);
      });

      it('rejects a wrong password, starts no session and leaves the attempt unclaimed', async () => {
        const first = await register(app, EMAIL, await finishQuiz('strongly_disagree'));
        const claimToken = await finishQuiz('strongly_agree');

        const response = await http()
          .post('/api/auth/register')
          .send({ email: EMAIL, password: 'a wrong password', claimToken })
          .expect(409);

        expect((response.body as ApiErrorBody).code).toBe('EMAIL_ALREADY_REGISTERED');
        expect(response.headers['set-cookie']).toBeUndefined();
        expect(await optionKeysOfCurrentAttempt(first.body.user.id)).toEqual(
          Array(5).fill('strongly_disagree'),
        );

        // The token was not consumed: the user can still sign in properly and keep the result.
        const session = await login(app, EMAIL, claimToken);
        expect(session.body.attemptClaimed).toBe(true);
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('starts a session for correct credentials', async () => {
      const registered = await register(app, EMAIL, await finishQuiz());

      const { body, cookie } = await login(app, EMAIL);

      expect(body).toEqual({ user: registered.body.user, hasAttempt: true, attemptClaimed: false });
      await http().get('/api/auth/me').set('Cookie', cookie).expect(200);
    });

    it('accepts the email in a different case', async () => {
      await register(app, EMAIL);

      await login(app, 'User@Example.com');
    });

    it('rejects a wrong password and an unknown email with the same response', async () => {
      await register(app, EMAIL);

      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email: EMAIL, password: 'a wrong password' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: PASSWORD })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect((wrongPassword.body as ApiErrorBody).code).toBe('INVALID_CREDENTIALS');
      expect(wrongPassword.headers['set-cookie']).toBeUndefined();
    });

    it('treats a password longer than any stored one as a wrong password', async () => {
      // bcrypt would read only the first 72 bytes and find them correct.
      const longest = 'a'.repeat(72);
      await register(app, EMAIL, undefined, longest);

      const response = await http()
        .post('/api/auth/login')
        .send({ email: EMAIL, password: `${longest}a` })
        .expect(401);

      expect((response.body as ApiErrorBody).code).toBe('INVALID_CREDENTIALS');
      await login(app, EMAIL, undefined, longest);
    });

    it('claims an attempt taken while signed out and makes it current', async () => {
      const registered = await register(app, EMAIL, await finishQuiz('strongly_disagree'));

      const { body } = await login(app, EMAIL, await finishQuiz('strongly_agree'));

      expect(body).toMatchObject({ hasAttempt: true, attemptClaimed: true });
      expect(await optionKeysOfCurrentAttempt(registered.body.user.id)).toEqual(
        Array(5).fill('strongly_agree'),
      );
      expect(await attemptsService.findRecentForUser(registered.body.user.id)).toHaveLength(2);
    });

    it('still signs in when the claim token is no longer valid, without claiming', async () => {
      await register(app, EMAIL);

      const { body } = await login(app, EMAIL, 'x'.repeat(43));

      expect(body).toMatchObject({ hasAttempt: false, attemptClaimed: false });
    });

    it.each([null, ''])('treats a claim token of %p as absent', async (claimToken) => {
      await register(app, EMAIL);

      const signedIn = await http()
        .post('/api/auth/login')
        .send({ email: EMAIL, password: PASSWORD, claimToken })
        .expect(200);
      expect(signedIn.body).toMatchObject({ attemptClaimed: false });

      const registered = await http()
        .post('/api/auth/register')
        .send({ email: 'other@example.com', password: PASSWORD, claimToken })
        .expect(201);
      expect(registered.body).toMatchObject({ hasAttempt: false, attemptClaimed: false });
    });

    it('reports no attempt for an account that has not taken the quiz', async () => {
      await register(app, EMAIL);

      expect((await login(app, EMAIL)).body.hasAttempt).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the session cookie', async () => {
      const { cookie } = await register(app, EMAIL);

      const response = await http().post('/api/auth/logout').set('Cookie', cookie).expect(204);

      // The session is stateless, so signing out is the browser dropping the
      // cookie: the header must clear exactly the cookie that was set.
      const cleared = (response.headers['set-cookie'] as unknown as string[])[0];
      expect(cleared).toMatch(/^session=;/);
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(cleared).toMatch(/; Path=\//);
      expect(cleared).toMatch(/; HttpOnly/);
      expect(cleared).toMatch(/; SameSite=Lax/);
    });

    it('succeeds without a session', async () => {
      await http().post('/api/auth/logout').expect(204);
    });
  });

  describe('POST /api/attempts while signed in', () => {
    it('attaches the attempt directly, makes it current and keeps the earlier one', async () => {
      const { body, cookie } = await register(app, EMAIL, await finishQuiz('strongly_disagree'));

      const response = await http()
        .post('/api/attempts')
        .set('Cookie', cookie)
        .send(buildSubmission(quiz, 'strongly_agree'))
        .expect(201);

      expect(response.body).toEqual({ claimToken: null });
      expect(await optionKeysOfCurrentAttempt(body.user.id)).toEqual(
        Array(5).fill('strongly_agree'),
      );
      const attempts = await attemptsService.findRecentForUser(body.user.id);
      expect(attempts).toHaveLength(2);
      expect(attempts[1]?.answers.map((answer) => answer.optionKey)).toEqual(
        Array(5).fill('strongly_disagree'),
      );
    });

    it('gives the first attempt to a user who registered before taking the quiz', async () => {
      const { body, cookie } = await register(app, EMAIL);

      await http()
        .post('/api/attempts')
        .set('Cookie', cookie)
        .send(buildSubmission(quiz))
        .expect(201);

      const me = await http().get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body).toEqual({ user: body.user, hasAttempt: true });
    });

    it('treats a bad cookie as an anonymous submission', async () => {
      const response = await http()
        .post('/api/attempts')
        .set('Cookie', 'session=garbage')
        .send(buildSubmission(quiz))
        .expect(201);

      expect((response.body as { claimToken: string | null }).claimToken).toEqual(
        expect.any(String),
      );
    });

    it('treats a session whose account no longer exists as an anonymous submission', async () => {
      const { cookie } = await register(app, EMAIL);
      await dataSource.query(`DELETE FROM users`);

      const response = await http()
        .post('/api/attempts')
        .set('Cookie', cookie)
        .send(buildSubmission(quiz))
        .expect(201);

      // The result is not lost: a new account can claim it.
      const { claimToken } = response.body as { claimToken: string };
      const { body } = await register(app, 'new@example.com', claimToken);
      expect(body).toMatchObject({ hasAttempt: true, attemptClaimed: true });
    });
  });

  describe('data isolation', () => {
    it('gives each user only their own account and attempt', async () => {
      const alice = await register(app, 'alice@example.com', await finishQuiz('strongly_agree'));
      const bob = await register(app, 'bob@example.com', await finishQuiz('strongly_disagree'));

      const aliceMe = await http().get('/api/auth/me').set('Cookie', alice.cookie).expect(200);
      const bobMe = await http().get('/api/auth/me').set('Cookie', bob.cookie).expect(200);

      expect((aliceMe.body as MeResponse).user.email).toBe('alice@example.com');
      expect((bobMe.body as MeResponse).user.email).toBe('bob@example.com');
      expect(await optionKeysOfCurrentAttempt(alice.body.user.id)).toEqual(
        Array(5).fill('strongly_agree'),
      );
      expect(await optionKeysOfCurrentAttempt(bob.body.user.id)).toEqual(
        Array(5).fill('strongly_disagree'),
      );
    });
  });
});
