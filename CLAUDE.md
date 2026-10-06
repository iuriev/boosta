# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An ADHD test funnel: an anonymous quiz, account creation, a personal report and sign-in. A pnpm
workspace with two separate applications and one shared package:

- `apps/api` — NestJS 12, TypeORM 1.x, PostgreSQL. CommonJS application.
- `apps/web` — Next.js 16 (App Router), React 19, CSS Modules. Next.js 16 differs from earlier
  versions (for example `proxy.ts` replaces middleware); its version-matched docs are in
  `apps/web/node_modules/next/dist/docs/`.
- `packages/contracts` — TypeScript **types only** for the HTTP API. It has no runtime code and
  exports only a `types` condition: import from it with `import type`, and keep runtime values
  (such as lists for validation) in the app that needs them.

`README.md` explains how to run the project and summarises the architecture; `docs/` has the
details (architecture and trade-offs, API, design notes, working method). Behavior is
specified in `openspec/specs/` (requirements with scenarios); read the relevant spec before changing
behavior. The change that built the project is archived in
`openspec/changes/archive/2026-10-06-add-adhd-test-funnel/` (`proposal.md`, `design.md`, `tasks.md`). New
behavior starts as a new OpenSpec change under `openspec/changes/`, which is merged into the specs
when it is archived.

## Commands

Node ≥ 24.11 is required (TypeORM 1.x; Jest also needs it to load the ESM-only NestJS packages).
Run `nvm use` first; the pinned pnpm comes from `corepack enable`.

```bash
pnpm install
pnpm db:up                 # development PostgreSQL in Docker (docker-compose.dev.yml)
pnpm dev                   # API on :3001 and web on :3000 (dev:api / dev:web for one)

pnpm lint                  # ESLint for the whole workspace (lint:fix to autofix)
pnpm format                # Prettier (format:check in CI)
pnpm typecheck
pnpm test                  # unit tests: API (Jest) and web components (Vitest)
pnpm test:e2e              # API end-to-end tests; starts PostgreSQL with Testcontainers
pnpm test:browser          # Playwright test of the funnel; needs the system running on :3000
pnpm build

docker compose up --build  # the whole system, production builds, on http://localhost:3000
```

Single tests in the API (from `apps/api`; the scripts already pass the Node flag Jest needs):

```bash
pnpm test scoring                    # unit tests in files matching a name
pnpm test -t "is high at exactly"    # by test name
pnpm test:e2e auth                   # one e2e file
```

In the web app (from `apps/web`): `pnpm test quiz-flow` runs the Vitest files matching a name;
`pnpm test:browser --project=desktop` runs the browser test at one size (`E2E_BASE_URL` points it
at another address; use `localhost`, not `127.0.0.1`, against the development server).

The Docker setup runs production builds with two switches set for plain HTTP on localhost:
`COOKIE_SECURE=false` and `API_DOCS_ENABLED=true`. Their defaults follow `NODE_ENV`.

Migrations: `pnpm --filter @boosta/api migration:run | migration:revert | migration:show`. They
build first and use the compiled data source. The API also applies pending migrations on start.

## Architecture

The design rests on a few invariants. Changes that break them break the point of the project.

- **Quiz versions are immutable.** A version is one row in `quiz_versions` with the whole quiz as
  JSON (`schemaVersion`, questions with stable keys, options with scores, the level threshold). A trigger rejects
  edits, a partial unique index allows one active version, and a CHECK constraint
  (`quiz_definition_is_valid`) rejects a malformed document or an unknown `schemaVersion`. A new
  document structure is a new `schemaVersion`: a member of the `QuizDefinition` union and a branch
  in the CHECK function, never a rewrite of published versions. To change the quiz, add a migration
  that inserts a new version and moves the active flag; never edit a published version or its
  migration. Migrations are listed explicitly in `apps/api/src/database/migrations/index.ts` and
  use raw SQL only.
- **Attempts store raw answers, nothing derived.** `attempts` plus one `attempt_answers` row per
  question (keys only). Score, level and report are never stored. Answers cannot be updated and must use
  keys that exist in the attempt's quiz version, and an attempt's quiz version, gender and
  `created_at` cannot change (triggers). Attempts are never deleted on a retake: the current attempt is the most recently
  submitted one.
- **The report is computed on read.** `apps/api/src/report`: `scoreAttempt` scores an attempt with
  its **own** quiz version; `buildReport` (a pure function) turns a user's attempts into a report
  by running `REPORT_SECTIONS`, an ordered list of `ReportSection` objects. A section declares the
  question keys it needs in `requires` (it is omitted when the attempt's version lacks them), may
  read `context.previousAttempts`, returns `null` to be left out, and is skipped if it throws. The
  engine stamps the section key on the block.
- **Blocks, not sections, cross the wire.** The API returns typed blocks (`text`, `checklist`,
  `text-with-bullets`, `faq`) and the web app renders by `type` in
  `apps/web/src/features/report/report-blocks`, ignoring types it does not know.
- **Anonymous attempt, then claim.** `POST /api/attempts` stores an unowned attempt and returns a
  claim token (stored as a SHA-256 hash, 24 hours, single use through one conditional `UPDATE`).
  Register and login accept the token and attach the attempt. When the caller is signed in the
  attempt is attached directly.
- **Auth.** A JWT in an `httpOnly` cookie. `SessionGuard` is global: every route is protected
  unless marked `@Public()`. Use `@CurrentUser()` on protected routes and `@OptionalUser()` on
  public ones. Never accept a user or attempt id from the client to select data.
- **One origin.** Browsers call `/api/*` on the web app; `apps/web/src/proxy.ts` forwards to
  `API_URL` at run time and drops client-sent forwarding headers. Server components call the API
  through `apps/web/src/lib/api/server-api.ts`, which forwards the visitor's cookie.
- The API accepts JSON bodies only (it answers 415 otherwise); this is what prevents cross-site
  form posts from signing a visitor in.

Errors the UI branches on carry a stable `code` (`ApiErrorCode` in `packages/contracts`), thrown
with `ApiException`.

## Conventions

- Everything written — code, comments, docs, commit messages — is in English.
- Commits follow Conventional Commits; a husky hook runs lint-staged and commitlint.
- TypeScript is strict, with type-checked ESLint rules and sorted imports. Types used in decorated
  signatures in the API must be imported with `import type` (`isolatedModules` with decorator
  metadata).
- **Web components:** one folder per component (`name/name.tsx`, `name/name.module.css`,
  `name/index.ts`), with its test next to it (`name/name.test.tsx`). Non-component modules (schemas, storage) stay
  as files at the feature root.
- **CSS:** design tokens are custom properties in `apps/web/src/app/globals.css`, named after the
  Figma styles. Every length is in `rem` (hairlines use `--border-width`); sizes that differ between
  the 390px and 1440px frames are `clamp()` values. Prefer plain, readable rules; use logical
  properties, `:focus-visible` outlines and the existing `.visually-hidden` utility.
- **Web routes and API calls:** page paths come from `apps/web/src/config/routes.ts` (`ROUTES`,
  `homeFor`, `startWithNotice`), never from string literals. Components call the services in
  `apps/web/src/lib/api` (`authService`, `attemptsService`, and `server-api.ts` for server
  components); importing the HTTP client into a page or component is a lint error. API paths live
  in `lib/api/endpoints.ts`.
- Browser-only state (quiz progress, the pending claim token) lives in `sessionStorage` behind the
  external stores in `apps/web/src/features/quiz/quiz-storage.ts`; read it with the provided hooks,
  not in effects.
- **API tests:** e2e tests boot the real application against a Testcontainers database shared by
  all files; call `resetDatabase(app)` after each test and use the helpers in
  `apps/api/test/helpers.ts`. Settings read at startup (rate limit, `NODE_ENV`) are tested in
  separate files that set the environment before loading the app. Tests do not read `.env`.
- **Web tests:** Vitest with Testing Library (`apps/web/src/**/*.test.ts(x)`). `src/test/setup.ts`
  replaces `next/navigation` with the recording `router` from `src/test/router.ts` and resets the
  session stores; mock a service with `vi.mock('@/lib/api/...')`, not `fetch`. Find elements by
  role and accessible name. The Playwright test in `apps/web/e2e` drives a running system and
  creates a new account on every run.

## Working agreement

Work follows the `tasks.md` of the active OpenSpec change one group at a time. After implementing a group, run the `code-reviewer`
subagent on the diff and then the `qa-tester` subagent against the spec scenarios (both in
`.claude/agents/`), fix what they find, and make one commit for the group. Load the
`modern-web-guidance` skill before any HTML, CSS or client-side work in `apps/web`.

Local-only files that must not be committed: the brief PDF in `docs/` (the Markdown files there are tracked), Figma extracts in `.tmp-figma/`,
and `.env` files.
