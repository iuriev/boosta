# Proposal

## Why

The repository is empty and the test task asks for a complete ADHD test funnel: an anonymous quiz, account creation, a personal report and sign-in for returning users. The brief's main architectural demand is that quiz questions and report logic will keep changing without corrupting the data of users who took earlier versions, so the first implementation has to establish versioned quiz data and a report engine that is decoupled from it.

## What Changes

- Add a public quiz: gender selection followed by Likert-scale questions served by the API from the active quiz version.
- Add anonymous attempt submission: answers are validated and stored on the server as soon as the quiz is finished, before any account exists, and handed back to the client as a one-time claim token.
- Add minimal email + password accounts: registration at the end of the quiz (the main path) or before taking it, a separate sign-in screen, sign-out, and a session carried in an httpOnly cookie.
- Add attempt claiming: registering or signing in with a claim token attaches the attempt to the account. Every attempt of a user is kept; the most recently submitted one is the current attempt and drives the report, so a retake updates the result without deleting earlier answers.
- Add the personal report: a score from 0 to 100, a High or Low ADHD traits level, and an ordered list of sections whose content varies by level and gender. The report is computed on every read from the stored answers by the current report logic.
- Add a section mechanism in which a section declares the question keys it needs and is omitted when an attempt's quiz version does not contain them.
- Add project tooling: pnpm workspace, ESLint and Prettier with import sorting, git hooks with commitlint, CI, docker-compose, Swagger UI and a README covering architecture, trade-offs, future changes and omissions.

Out of scope: email confirmation, password recovery, a UI for browsing earlier attempts, an admin UI for quiz or report content, deployment, frontend automated tests.

## Capabilities

### New Capabilities

- `quiz`: versioned quiz definitions and delivery of the active version to anonymous visitors.
- `quiz-attempts`: submission and validation of answers, anonymous storage, claiming an attempt for an account, and retakes that preserve earlier attempts.
- `report`: scoring, level determination and assembly of report sections from an attempt, including sections that depend on specific answers.
- `user-auth`: account creation, sign-in, sign-out, the session cookie and access control to a user's own data.

### Modified Capabilities

None.

## Impact

- New applications: `apps/api` (NestJS) and `apps/web` (Next.js), plus `packages/contracts` with shared API types.
- New PostgreSQL schema: quiz versions, attempts, attempt answers, users.
- New HTTP API under `/api`: quiz, attempts, auth and report endpoints, documented with Swagger.
- New infrastructure files: docker-compose, Dockerfiles, GitHub Actions workflow, git hooks.
