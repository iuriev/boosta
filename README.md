# ADHD test funnel

A quiz → account creation → personal report → sign-in flow, built as a test task.

A visitor takes an ADHD traits quiz without signing in, creates an account to keep the result, and
can come back later to see the report or take the quiz again.

- **API** — NestJS, TypeORM, PostgreSQL (`apps/api`)
- **Web** — Next.js App Router, CSS Modules (`apps/web`)
- **Contracts** — TypeScript types of the HTTP API, shared by both (`packages/contracts`)

The two applications are separate: each has its own package, Dockerfile and process, and the web
app talks to the API over HTTP only. The solution is not deployed; it runs locally with one command.

## Run it

### With Docker (the quickest way)

Requires Docker only.

```bash
docker compose up --build
```

Then open **<http://localhost:3000>**.

- The database starts empty. The API applies its migrations on start, which creates the schema
  and the default quiz, so there is nothing to seed by hand.
- Swagger UI: <http://localhost:3001/api/docs>
- Stop with `Ctrl+C`. `docker compose down -v` also removes the database volume.
- The containers run in production mode with three relaxations for a local run: a default signing
  secret, a session cookie without the `Secure` flag (plain HTTP) and Swagger UI switched on.
- If port 3000 or 3001 is taken: `WEB_PORT=3100 API_PORT=3101 docker compose up --build`.

### For development

Requires **Node.js ≥ 24.11** (see `.nvmrc`), **pnpm 12** (through `corepack enable`) and Docker
for the database.

```bash
nvm use                                         # Node from .nvmrc
corepack enable                                 # provides the pinned pnpm
pnpm install

cp apps/api/.env.example apps/api/.env          # defaults work as they are
cp apps/web/.env.example apps/web/.env.local

pnpm db:up                                      # PostgreSQL in Docker
pnpm dev                                        # API on :3001 and web on :3000, both watching
```

If port 5432 is taken, copy `.env.example` to `.env` in the repository root, change
`POSTGRES_PORT`, and use the same port in `DATABASE_URL` in `apps/api/.env`.

### Try the flow

1. Choose Male or Female on the start screen.
2. Answer the five questions. Choosing an option marks it; the arrow moves on.
3. Create an account (any email, password of 8 characters or more) — the report opens.
4. From the report: **Retake test** to take the quiz again, **Sign out**, then sign in again.

Four answers of "Agree" or stronger give a High traits report; mostly "Disagree" gives a Low one.
The report text differs for Male and Female.

## Commands

| Command                                      | What it does                                                  |
| -------------------------------------------- | ------------------------------------------------------------- |
| `docker compose up --build`                  | The whole system in containers                                |
| `pnpm dev`                                   | API and web in watch mode (`dev:api`, `dev:web` for one)      |
| `pnpm db:up` / `pnpm db:down`                | Start / stop the development PostgreSQL                       |
| `pnpm test`                                  | Unit tests of the API and component tests of the web app      |
| `pnpm test:e2e`                              | API end-to-end tests on a throwaway PostgreSQL (needs Docker) |
| `pnpm test:browser`                          | Browser test of the whole funnel (needs the system running)   |
| `pnpm lint` / `pnpm lint:fix`                | ESLint, including import order                                |
| `pnpm format` / `pnpm format:check`          | Prettier                                                      |
| `pnpm typecheck`                             | TypeScript in every package                                   |
| `pnpm build`                                 | Build both applications                                       |
| `pnpm --filter @boosta/api migration:run`    | Apply migrations by hand (the API also does it on start)      |
| `pnpm --filter @boosta/api migration:revert` | Revert the latest migration                                   |

Commits follow [Conventional Commits](https://www.conventionalcommits.org); a git hook checks the
message and formats staged files. CI (GitHub Actions) runs lint, typecheck, all tests and the
build, then starts the Docker setup on an empty database and runs the browser test against it.

The browser test needs Chromium once: `pnpm --filter @boosta/web exec playwright install chromium`.

## Key architectural decisions

1. **A quiz version is immutable data.** One database row holds the whole quiz as JSON: questions
   with stable keys, options with scores, and the level threshold. Versions are published by
   migrations and never edited (a database trigger enforces it); changing the quiz means publishing
   a new version. The document names its own format (`schemaVersion`), so a future structure can
   live next to the current one.
2. **An attempt stores raw answers and nothing derived.** It records the quiz version, the gender
   and one row per answer. No score or report is stored, and attempts are never deleted. Database
   triggers keep an attempt's version, gender and answers as they were submitted: on a retake the newest attempt becomes the current one.
3. **The report is computed when it is read.** The attempt is scored with the weights of its own
   quiz version, then the current report definition — an ordered list of small section objects in
   code — is run over it.
4. **The web app renders blocks, not sections.** The API returns typed presentation blocks
   (`text`, `checklist`, `text-with-bullets`, `faq`); the web app renders by type and does not know
   which sections exist.
5. **Anonymous first, account later.** Finishing the quiz stores the attempt and returns a one-time
   claim token (stored hashed, 24 hours); registering or signing in with it attaches the attempt.
6. **One origin for the browser.** The Next.js app forwards `/api/*` to the API, so the session
   cookie is first-party and there is no CORS setup. Pages are server components that decide
   redirects before rendering.
7. **Minimal authentication, as the brief asks.** A signed token in an `httpOnly` cookie, bcrypt
   hashes, and one global guard that protects every route unless it is marked public.

Details: [docs/architecture.md](docs/architecture.md).

## How the solution handles future changes

- **Quiz questions, options, scores or the threshold change:** publish a new quiz version. Existing
  attempts keep pointing at the version they were answered under, so their scores and data do not
  change.
- **Report wording or logic changes:** edit the section in `apps/api/src/report`. Every user sees
  the new report the next time they open it; nothing is migrated.
- **A new section that depends on a specific answer:** add a section that lists the question keys
  it needs. It appears for every attempt whose quiz version has those questions and is left out for
  the others.
- **A new section that uses earlier attempts:** sections receive the user's previous attempts, each
  scored with its own quiz version, so comparisons work across versions.
- **A new kind of content:** add a block type; an older web build skips blocks it does not know.

The two mechanisms for new sections — a specific answer and earlier attempts — are not used by the
four sections in the design, so they are proven by tests with test-only sections. The full table of changes and their effect on existing
users is in [docs/architecture.md](docs/architecture.md#handling-future-changes).

## Trade-offs

- **Level from a score threshold** (High at 60 of 100) rather than the rule in the designer's note,
  so that the score and the level can never contradict each other.
- **Report computed on read, not stored.** New sections reach old attempts for free, but a report
  can change after the user has seen it.
- **Quiz content in the database, report content in code.** Changes need a deploy; in exchange they
  are reviewed, tested and versioned, and no rule language is stored in data.
- **Stateless session token.** No session table, but a session cannot be revoked before it expires.
- **Registration with an existing email signs the user in** when the password matches. A deliberate
  shortcut: a real product should confirm the email by a link instead, which needs email delivery.
- **In-memory rate limiting** by client and email. Enough for one API instance; several would need
  a shared store. Without a load balancer in front, all visitors count as one client.
- **One set of answer options per quiz version.** Mixed scales or reverse-scored questions would
  need a second document format.

Each of these is explained in [docs/architecture.md](docs/architecture.md#trade-offs).

## What was not done, and why

- **Deployment.** Optional in the brief. The Docker setup runs production builds locally.
- **Email confirmation and password recovery.** Excluded by the brief.
- **A screen listing earlier attempts.** All attempts are kept and available to report sections,
  but the design has no such screen.
- **An admin interface** for quiz versions and report content.
- **Account deletion and data export**, and removal of old answers on request.
- **Cleanup of unclaimed anonymous attempts.** They expire for claiming after 24 hours but the rows
  stay; a scheduled job would delete them. Submitting the quiz is also not rate-limited.
- **Session revocation**, and a shared store for rate-limit counters (see trade-offs).
- **Dark theme and translations.** The design has neither.
- **A notice when a just-finished result could not be saved** for a user who already has a report
  and signs in with an expired claim token. They see their previous report.

## Tests

- **API:** 73 unit tests (scoring, report engine, validation, guards) and 146 end-to-end tests that
  run the real application against PostgreSQL, including the database constraints and triggers.
- **Web:** 79 component and unit tests (quiz flow, forms, report blocks, storage, proxy) and a
  browser test of the whole funnel at desktop and mobile sizes.

## More

- [docs/architecture.md](docs/architecture.md) — decisions, future changes and trade-offs in full
- [docs/api.md](docs/api.md) — routes and error codes
- [docs/design-notes.md](docs/design-notes.md) — how the Figma design was used and where the
  implementation differs
- [docs/working-method.md](docs/working-method.md) — OpenSpec, the reviewer and tester subagents,
  and the skills used
- `openspec/changes/add-adhd-test-funnel/` — proposal, behavior specs, design and tasks
