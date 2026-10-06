# Tasks

## 1. Workspace and tooling

- [ ] 1.1 Create the pnpm workspace (`apps/api`, `apps/web`, `packages/contracts`), root `package.json` with `packageManager` and `engines`, `.nvmrc`, shared `tsconfig.base.json`; verify `pnpm install` succeeds
- [ ] 1.2 Add the root ESLint flat config (typescript-eslint type-checked, simple-import-sort, prettier compatibility) and Prettier config with `lint`, `format` and `typecheck` scripts; verify `pnpm lint` and `pnpm format:check` pass on the empty workspace
- [ ] 1.3 Add husky, lint-staged and commitlint (conventional config); verify a commit with a non-conventional message is rejected and a staged file is formatted on commit
- [ ] 1.4 Add `docker-compose.dev.yml` with PostgreSQL and `.env.example` files; verify the database accepts connections with the documented credentials

## 2. API foundation

- [ ] 2.1 Scaffold the NestJS app with validated environment config, global `ValidationPipe`, `/api` prefix, helmet and cookie parsing; verify the app boots and an unknown route returns a JSON 404
- [ ] 2.2 Configure TypeORM with `synchronize: false`, a data source for the migration CLI and migrations applied on start; verify `pnpm --filter api migration:run` works against the dev database
- [ ] 2.3 Add Swagger UI at `/api/docs` outside production; verify the page loads and lists the routes
- [ ] 2.4 Add the e2e test harness (Testcontainers PostgreSQL, migrations, supertest against the real app) with one smoke test; verify `pnpm --filter api test:e2e` passes

## 3. Quiz versions

- [ ] 3.1 Define the quiz and attempt types in `packages/contracts`; verify both apps typecheck against them
- [ ] 3.2 Add the `quiz_versions` entity and migration with the partial unique index on the active flag; verify with a test that a second active version is rejected by the database
- [ ] 3.3 Add the migration that publishes quiz version 1 (five questions with stable keys, five options scored 4 to 0, threshold 60); verify the row exists after migrating
- [ ] 3.4 Implement `GET /api/quiz` returning the active version without scores or threshold; verify with e2e tests for the response shape and the absence of scoring data

## 4. Attempts

- [ ] 4.1 Add the `attempts` and `attempt_answers` entities and migration with the unique constraints from the design; verify the migration applies and reverts
- [ ] 4.2 Implement attempt validation against a quiz version (complete, no duplicates, known keys, active version, valid gender); verify with unit tests for each rejection case in the spec
- [ ] 4.3 Implement `POST /api/attempts` for anonymous visitors with claim token generation, hashed storage and 24-hour expiry; verify with e2e tests that a valid submission returns a token and an invalid one stores nothing
- [ ] 4.4 Implement the claim service (lookup by hash, expiry, single use, atomic replacement of the user's previous attempt); verify with e2e tests for reuse, expiry and replacement

## 5. Authentication

- [ ] 5.1 Add the `users` entity and migration with a case-insensitive unique email; verify with a test that the same email in a different case is rejected
- [ ] 5.2 Implement the JWT cookie session, the global auth guard, `@Public()` and the optional-auth variant; verify with e2e tests that a protected route rejects a missing or tampered cookie
- [ ] 5.3 Implement `POST /api/auth/register` including the existing-email-with-correct-password path; verify with e2e tests for success, missing claim token, short password, existing email with correct password and with wrong password
- [ ] 5.4 Implement `POST /api/auth/login` (with optional claim), `POST /api/auth/logout` and `GET /api/auth/me`; verify with e2e tests for correct and wrong credentials, claim on sign-in and sign-out
- [ ] 5.5 Make `POST /api/attempts` attach directly to a signed-in user and replace the previous attempt; verify with an e2e test for a signed-in retake
- [ ] 5.6 Add throttling to the register and login routes; verify with an e2e test that requests above the limit are rejected

## 6. Report

- [ ] 6.1 Define the report response and block union in `packages/contracts`; verify both apps typecheck against them
- [ ] 6.2 Implement score and level calculation from an attempt and its quiz version; verify with unit tests for the scenarios in the report spec (0, 100, 70, the threshold boundary)
- [ ] 6.3 Implement the report engine (ordered sections, `requires` check, `null` skipping); verify with unit tests using test-only sections that a section with a present key is built from the answer and a section with an absent key is omitted
- [ ] 6.4 Transcribe the report copy from Figma into content modules and implement the four sections for both levels and genders; verify with unit tests that each of the four level and gender combinations yields the expected section order and distinct content
- [ ] 6.5 Implement `GET /api/report` for the current user; verify with e2e tests for the authenticated report, the unauthenticated rejection, the no-attempt case and isolation between two users

## 7. Web application

- [ ] 7.1 Scaffold the Next.js app with the `/api` rewrite, a typed API client for browser and server use, global styles and design tokens; verify the app builds and the rewrite reaches the API
- [ ] 7.2 Build the shared UI (header with logo, button, text field, progress bar, option list, footer) with CSS Modules; verify they render on the pages that use them
- [ ] 7.3 Implement the start screen with gender selection and the quiz flow with `sessionStorage` persistence, back navigation and submission; verify manually that reload restores progress and that finishing the quiz leads to account creation
- [ ] 7.4 Implement the account creation and sign-in pages with react-hook-form and zod, server error display, pending claim token handling and redirects; verify manually registration, existing-email sign-in, wrong password and direct access without a claim token
- [ ] 7.5 Implement the report page as a server component with the score gauge, block renderers, FAQ accordion, sign-out and redirects for 401 and 404; verify manually all four report variants and both redirects
- [ ] 7.6 Handle the signed-in retake and the outdated-quiz-version response; verify manually that a signed-in retake updates the report and an outdated version restarts the quiz

## 8. Delivery

- [ ] 8.1 Add Dockerfiles for both apps and `docker-compose.yml` that starts PostgreSQL, the API and the web app; verify `docker compose up --build` serves the full flow on a clean machine state
- [ ] 8.2 Add the GitHub Actions workflow for lint, typecheck, unit tests, e2e tests and build; verify the workflow passes on the pushed branch
- [ ] 8.3 Write the README (how to run and test, key architectural decisions, trade-offs including the registration shortcut and its proper design, how quiz and report changes are handled, what was not done and why); verify every documented command runs as written
- [ ] 8.4 Write `CLAUDE.md` with the commands and architecture overview for future sessions; verify the documented commands match the root scripts

## 9. Integration check

- [ ] 9.1 Run the full flow against docker-compose: quiz, account creation, report, sign out, sign in, retake with a different outcome; verify each step matches the specs
- [ ] 9.2 Run `openspec validate add-adhd-test-funnel --strict` together with `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`; verify all pass

## Workflow follow-up

- Archive the change after the integration check passes.
