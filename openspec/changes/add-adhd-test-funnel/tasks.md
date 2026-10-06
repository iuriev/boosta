# Tasks

## 1. Workspace and tooling

- [x] 1.1 Create the pnpm workspace (`apps/api`, `apps/web`, `packages/contracts`), root `package.json` with `packageManager` and `engines`, `.nvmrc`, shared `tsconfig.base.json`; verify `pnpm install` succeeds
- [x] 1.2 Add the root ESLint flat config (typescript-eslint type-checked, simple-import-sort, prettier compatibility) and Prettier config with `lint`, `format` and `typecheck` scripts; verify `pnpm lint` and `pnpm format:check` pass on the empty workspace
- [x] 1.3 Add husky, lint-staged and commitlint (conventional config); verify a commit with a non-conventional message is rejected and a staged file is formatted on commit
- [x] 1.4 Add `docker-compose.dev.yml` with PostgreSQL and `.env.example` files; verify the database accepts connections with the documented credentials

## 2. API foundation

- [x] 2.1 Scaffold the NestJS app with validated environment config, global `ValidationPipe`, `/api` prefix, helmet and cookie parsing; verify the app boots and an unknown route returns a JSON 404
- [x] 2.2 Configure TypeORM with `synchronize: false`, a data source for the migration CLI and migrations applied on start; verify `pnpm --filter api migration:run` works against the dev database
- [x] 2.3 Add Swagger UI at `/api/docs` outside production; verify the page loads and lists the routes
- [x] 2.4 Add the e2e test harness (Testcontainers PostgreSQL, migrations, supertest against the real app) with one smoke test; verify `pnpm --filter api test:e2e` passes

## 3. Quiz versions

- [x] 3.1 Define the quiz and attempt types in `packages/contracts`; verify both apps typecheck against them
- [x] 3.2 Add the `quiz_versions` entity and migration with the partial unique index on the active flag; verify with a test that a second active version is rejected by the database
- [x] 3.3 Add the migration that publishes quiz version 1 as the default seed (the five questions from the design with stable keys, five options scored 4 to 0, threshold 60); verify with an e2e test that an empty database serves the five questions after startup and that starting again does not duplicate the version
- [x] 3.4 Implement `GET /api/quiz` returning the active version without scores or threshold; verify with e2e tests for the response shape and the absence of scoring data

## 4. Attempts

- [x] 4.1 Add the `attempts` and `attempt_answers` entities and migration with the constraints and the `(user_id, created_at DESC)` index from the design; verify the migration applies and reverts
- [x] 4.2 Implement attempt validation against a quiz version (complete, no duplicates, known keys, active version, valid gender); verify with unit tests for each rejection case in the spec
- [x] 4.3 Implement `POST /api/attempts` for anonymous visitors with claim token generation, hashed storage and 24-hour expiry; verify with e2e tests that a valid submission returns a token and an invalid one stores nothing
- [x] 4.4 Implement the claim service (lookup by hash, expiry, single use, attach without deleting earlier attempts) and the current-attempt query (most recently submitted); verify with e2e tests for reuse, expiry, a retake that keeps the earlier attempt, and a late claim of an older attempt

## 5. Authentication

- [x] 5.1 Add the `users` entity and migration with a case-insensitive unique email; verify with a test that the same email in a different case is rejected
- [x] 5.2 Implement the JWT cookie session, the global auth guard, `@Public()` and the optional-auth variant; verify with e2e tests that a protected route rejects a missing or tampered cookie
- [x] 5.3 Implement `POST /api/auth/register` including the existing-email-with-correct-password path; verify with e2e tests for success with a claim token, success without one (account with no attempt), an invalid claim token, short password, existing email with correct password and with wrong password
- [x] 5.4 Implement `POST /api/auth/login` (with optional claim), `POST /api/auth/logout` and `GET /api/auth/me`; verify with e2e tests for correct and wrong credentials, claim on sign-in and sign-out
- [x] 5.5 Make `POST /api/attempts` attach directly to a signed-in user; verify with an e2e test that after a signed-in retake the new attempt is current and the earlier one is still stored
- [x] 5.6 Add throttling to the register and login routes; verify with an e2e test that requests above the limit are rejected

## 6. Report

- [x] 6.1 Define the report response and block union in `packages/contracts`; verify both apps typecheck against them
- [x] 6.2 Implement score and level calculation from an attempt and its quiz version; verify with unit tests for the scenarios in the report spec (0, 100, 70, the threshold boundary)
- [x] 6.3 Implement the report engine (ordered sections, `requires` check, `null` skipping, `previousAttempts` in the context); verify with unit tests using test-only sections that a section with a present key is built from the answer, a section with an absent key is omitted, and a history-based section is built for a user with two attempts and omitted for a user with one
- [x] 6.4 Read the report copy from the Figma copy through the Figma MCP server into content modules and implement the four sections for both levels and genders; verify with unit tests that each of the four level and gender combinations yields the expected section order and distinct content
- [x] 6.5 Implement `GET /api/report` for the current user; verify with e2e tests for the authenticated report, the report following the latest attempt after a retake, the unauthenticated rejection, the no-attempt case and isolation between two users

## 7. Web application

- [x] 7.0 Load the `modern-web-guidance` skill and note in the group's commit body which of its recommendations shaped the markup, CSS and client code; verify the skill was consulted before the first component is written
- [x] 7.1 Scaffold the Next.js app with the `/api` rewrite and a typed API client for browser and server use; verify the app builds and the rewrite reaches the API
- [x] 7.1a Build the design system from the Figma copy through the Figma MCP server (`get_design_context` and `get_variable_defs` on every desktop and mobile frame): color, typography, spacing and radius tokens as CSS custom properties, Geologica and Inter through `next/font`, and the logo, illustration and icons downloaded into `apps/web/public`; verify every token value is traceable to a Figma style and no file references a Figma URL
- [x] 7.2 Build the shared UI (header with logo, button, text field, progress bar, option list, footer) with CSS Modules using only design-system tokens; verify each component against the Figma screenshot of its frame at 390 and 1440 widths
- [x] 7.3 Implement the start screen with gender selection and the quiz flow with back and forward arrows, the "current/total" counter, `sessionStorage` persistence and submission from the last question; verify manually that the forward arrow is disabled until an answer is chosen, reload restores progress and finishing the quiz leads to account creation
- [x] 7.4 Implement the account creation and sign-in pages with react-hook-form and zod, server error display, pending claim token handling, the "Already have an account? Sign in" and "Create account" links and redirects (report when the account has an attempt, quiz start when it does not); verify manually registration, existing-email sign-in, wrong password, and registration without a finished quiz followed by taking the quiz
- [x] 7.5 Implement the report page as a server component with the score gauge, block renderers, FAQ accordion, sign-out, "Retake test" and redirects for 401 and 404; verify manually all four report variants at 390 and 1440 widths against the Figma frames, and both redirects
- [x] 7.6 Add the header link that shows "Sign in" or "My report" by session state, and handle the signed-in retake and the outdated-quiz-version response; verify manually that a signed-in retake updates the report and an outdated version restarts the quiz

## 8. Delivery

- [x] 8.1 Add Dockerfiles for both apps and `docker-compose.yml` that starts PostgreSQL, the API and the web app; verify that `docker compose up --build` on empty volumes serves the start screen and the five seeded questions with no extra command
- [ ] 8.2 Add the GitHub Actions workflow for lint, typecheck, unit tests, e2e tests and build; verify the workflow passes on the pushed branch
- [x] 8.3 Write the README (how to run and test, key architectural decisions, trade-offs including the registration shortcut and its proper design, how quiz and report changes are handled, what was not done and why, and the AI-assisted workflow with OpenSpec, the project subagents and the skills used); verify every documented command runs as written
- [x] 8.4 Write `CLAUDE.md` with the commands and architecture overview for future sessions; verify the documented commands match the root scripts

## 9. Integration check

- [ ] 9.1 Run the full flow against docker-compose: quiz, account creation, report, sign out, sign in, retake with a different outcome; verify each step matches the specs
- [ ] 9.2 Run the `code-reviewer` subagent over the whole codebase and the `qa-tester` subagent over every spec scenario; verify there are no blocking findings and no failing scenarios
- [ ] 9.3 Run `openspec validate add-adhd-test-funnel --strict` together with `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`; verify all pass

## Workflow follow-up

- Archive the change after the integration check passes.
