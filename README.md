# ADHD test funnel

A quiz → account creation → personal report → sign-in flow, built as a test task.

A visitor takes an ADHD traits quiz without signing in, creates an account to keep the result, and
can come back later to see the report or take the quiz again.

- **API** — NestJS, TypeORM, PostgreSQL (`apps/api`)
- **Web** — Next.js App Router, CSS Modules (`apps/web`)
- **Contracts** — TypeScript types of the HTTP API, shared by both (`packages/contracts`)

The two applications are separate: each has its own package, Dockerfile and process. The web app
talks to the API over HTTP only.

The solution is not deployed; it runs locally with one command.

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
| `pnpm test`                                  | Unit tests                                                    |
| `pnpm test:e2e`                              | API end-to-end tests on a throwaway PostgreSQL (needs Docker) |
| `pnpm lint` / `pnpm lint:fix`                | ESLint, including import order                                |
| `pnpm format` / `pnpm format:check`          | Prettier                                                      |
| `pnpm typecheck`                             | TypeScript in every package                                   |
| `pnpm build`                                 | Build both applications                                       |
| `pnpm --filter @boosta/api migration:run`    | Apply migrations by hand (the API also does it on start)      |
| `pnpm --filter @boosta/api migration:revert` | Revert the latest migration                                   |

Commits follow [Conventional Commits](https://www.conventionalcommits.org); a git hook checks the
message and formats staged files. CI (GitHub Actions) runs lint, typecheck, all tests and the
build, and starts the Docker setup on an empty database.

## Key architectural decisions

### 1. A quiz version is immutable data

A quiz version is one database row holding the whole quiz as a JSON document: questions with
stable keys, answer options with their scores, and the threshold between "low" and "high".
Versions are published by migrations and never edited — a database trigger rejects changes to a
published version, and a partial unique index allows only one active version.

Changing the quiz means publishing a new version. Earlier attempts keep pointing at the version
they were answered under, so they are always interpreted with the right questions and weights.

### 2. An attempt stores raw answers and nothing derived

An attempt records the quiz version, the gender and one `(question key, option key)` row per
answer. No score, level or report is stored. Stored answers cannot be edited (another trigger),
and attempts are never deleted: when a user takes the quiz again, the most recently submitted
attempt simply becomes the current one, and the earlier ones stay available as history.

### 3. The report is computed when it is read

`GET /api/report` scores the current attempt with the weights of **its own** quiz version, then
runs the **current** report definition over it. The definition is an ordered list of sections in
code (`apps/api/src/report/report-definition.ts`); each section is a small object:

```ts
interface ReportSection {
  key: string;
  requires?: readonly string[]; // question keys the section reads
  build(context: ReportContext): ReportBlockContent | null;
}
```

Scoring lives with the quiz version (data); what the report says about the score lives in code.
The two can change independently.

### 4. The web app renders blocks, not sections

Sections are returned as typed presentation blocks (`text`, `checklist`, `text-with-bullets`,
`faq`). The web app renders a block by its type and does not know which sections exist, so a new
section built from an existing block type needs no frontend change. An unknown block type is
skipped rather than breaking the page.

### 5. Anonymous first, account later

Finishing the quiz stores the attempt at once and returns a one-time **claim token**. Only its
SHA-256 hash is stored, it expires after 24 hours, and claiming is a single conditional `UPDATE`,
so a token cannot be used twice. Registering or signing in with the token attaches the attempt to
the account. A signed-in user who takes the quiz gets the attempt attached directly.

### 6. One origin for the browser

The browser only talks to the Next.js app. `apps/web/src/proxy.ts` forwards `/api/*` to the API at
run time, so the session cookie is first-party, there is no CORS configuration, and one web build
works against any API address. Pages that need data are server components: they call the API with
the visitor's cookie and decide redirects before anything is rendered.

### 7. Minimal authentication, as the brief asks

A signed token (7 days) in an `httpOnly`, `SameSite=Lax` cookie; bcrypt password hashes; one
global guard that protects every route unless it is explicitly marked public. `GET /api/report`
takes no identifier, so there is no way to ask for another user's report.

## How the solution handles future changes

| Change                                          | What a developer does                                                                                     | What happens to existing users                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Reword a question                               | Publish a new quiz version (a migration), keeping the question's key                                      | Nothing: their attempts still point at the old version                                    |
| Add or remove a question                        | Publish a new version                                                                                     | Old attempts are scored with their own version; answers to a removed question stay stored |
| Change option scores or the threshold           | Publish a new version                                                                                     | Old scores do not change                                                                  |
| Change the wording or logic of a report section | Edit the section or its content in `apps/api/src/report`                                                  | Everyone sees the new report the next time they open it                                   |
| Add a section that depends on a specific answer | Add a `ReportSection` with `requires: ['question_key']` and list it in the report definition              | It appears for every attempt whose quiz version has that question, and not for the others |
| Add a section that uses earlier attempts        | Add a `ReportSection` that reads `context.previousAttempts` and returns `null` when there are none        | It appears for users who have taken the quiz more than once                               |
| Add a section built from a new kind of block    | Add the block type to `packages/contracts` and a renderer in `apps/web/src/features/report/report-blocks` | An older web build skips the unknown block                                                |

Details that make this safe:

- A section that fails is logged and left out; the rest of the report is still returned.
- A section sees the user's 20 most recent attempts, each scored with its own quiz version.
- Every answer a section sees carries its scale (`score` and `maxScore`), because a later version
  may score the same question differently. Total scores are comparable across versions.
- A user who is in the middle of the quiz when a new version is published is told that the quiz
  was updated and starts again; nothing is stored against a retired version.

Two mechanisms that the brief asks for but the design does not show — a section that depends on
specific answers, and a section that uses a user's earlier attempts — are implemented and covered
by tests with test-only sections (`report-engine.spec.ts`, `report.service.spec.ts`). The four
sections that ship are the ones in the design, which depend on level and gender only.

## Trade-offs

- **Level from a score threshold.** The level is "High" when the score is 60 or more (out of 100).
  The designer's note in Figma suggests another rule ("two or more Agree/Strongly agree answers");
  a single threshold was chosen so that the score and the level can never contradict each other.
  The threshold is data in the quiz version.
- **Report computed on read, not stored.** New sections reach old attempts for free and there is
  nothing to migrate when report logic changes. The cost: a user's report can change after they
  have seen it, and every read recomputes it. Scores stay stable because weights are frozen in the
  quiz version. If reports had to be reproducible exactly, a stored snapshot would be added.
- **Quiz content in the database, report content in code.** Publishing a quiz version or changing
  report copy needs a deploy. In exchange every change is reviewed, tested and versioned, and no
  rule language has to be stored in data. An admin UI would move this the other way.
- **A quiz version as one JSON document.** It is read and written as a whole and never edited, so
  a document fits better than normalised tables. All questions of a version share one set of
  answer options; per-question options would need a new document shape.
- **Answers as rows, not JSON.** Slightly more writes, but future sections and analytics can query
  answers by question key.
- **Stateless session token.** No session table and no refresh tokens, as the brief asks. The cost
  is that a session cannot be revoked before it expires: signing out clears the cookie in the
  browser, but a copy of the cookie stays valid for up to 7 days.
- **Registration with an existing email signs the user in** when the password matches. This was a
  deliberate shortcut to keep the flow short, and it is not how a real product should behave: it
  turns the registration form into a second login form and reveals whether an email is registered.
  The proper design is to always answer "check your inbox", confirm ownership of the email by a
  link, and attach the quiz result only after an explicit sign-in. That needs email delivery,
  which the brief excludes.
- **Rate limiting by client address and email, in memory.** Sign-in and registration are limited to
  10 requests per minute for one email from one client, with a cap of 100 per client. The web app
  does not pass on forwarding headers sent by the browser, so a client cannot choose the address it
  is counted under. Without a load balancer in front, the API therefore sees the web server as the
  only client: guessing one account's password is still limited, but someone can exhaust another
  person's allowance for a minute. Behind a load balancer, set `TRUST_FORWARDED_HEADERS=true` on
  the web app and `TRUST_PROXY` on the API. Counters live in the API process, so several API
  instances would need a shared store.
- **CSS Modules with tokens instead of a UI kit.** More CSS to write, no dependency, and full
  control over markup and accessibility.

## What was not done, and why

- **Deployment.** Optional in the brief. The Docker setup runs production builds locally.
- **Email confirmation and password recovery.** Excluded by the brief.
- **Automated frontend tests.** The time went into API tests (66 unit, 118 end-to-end), where the
  logic lives. The web app was verified by hand in the browser against every spec scenario, on
  mobile and desktop widths and with the keyboard only. Component tests for the quiz flow and the
  forms, and one browser test of the whole funnel, would be the next step.
- **A screen listing earlier attempts.** All attempts are kept and available to report sections,
  but the design has no such screen.
- **An admin interface** for quiz versions and report content.
- **Account deletion and data export**, and removal of old answers on request.
- **Cleanup of unclaimed anonymous attempts.** They expire for claiming after 24 hours but the rows
  stay; a scheduled job would delete them.
- **Session revocation**, and a shared store for rate-limit counters (see trade-offs).
- **Dark theme and translations.** The design has neither.
- **A notice when a just-finished result could not be saved** for a user who already has a report
  and signs in with an expired claim token. They see their previous report.

## Design notes

Design tokens (colors, type styles, spacing), the logo, illustration and icons come from the Figma
file. Sizes that differ between the 390px and 1440px frames are `clamp()` values running between
the two, so the layout is fluid; every length is in `rem`. The Figma API limit on the free plan cut
the extraction short, so the mobile report and the High report were built from the same tokens and
from screenshots rather than from exact values.

Deliberate differences from the design:

- Inputs have visible labels and a "Show" control for the password; the design has placeholders
  only.
- One input style and one button size on all screens; the design varies them between screens.
- On mobile, the sign-in button sits under the fields instead of at the bottom of the screen, where
  the keyboard would cover it.
- The progress bar fills with the question number; the design shows the same fill everywhere.
- The quiz arrows are darker and sit higher than in the design, to be easier to see and reach.
- The gauge needle follows the score linearly; in the design it does not match the number.
- Links the flows need but the design lacks: "Sign in" / "My report" in the header, "Retake test"
  on the report, and links between the two account pages.
- "Focus" instead of the design's "Focuse".
- FAQ answers: the design has an answer only for the first question of each report; the other
  answers were written for this implementation.

## API

All routes are under `/api`. Every route requires a session unless marked public.

| Method | Path             | Access  | Purpose                                                                        |
| ------ | ---------------- | ------- | ------------------------------------------------------------------------------ |
| GET    | `/quiz`          | public  | The active quiz version, without scores                                        |
| POST   | `/attempts`      | public  | Submit answers. Anonymous: returns a claim token. Signed in: attached directly |
| POST   | `/auth/register` | public  | Create an account, optionally attaching an attempt, and start a session        |
| POST   | `/auth/login`    | public  | Sign in, optionally attaching an attempt                                       |
| POST   | `/auth/logout`   | public  | Clear the session cookie                                                       |
| GET    | `/auth/me`       | session | The signed-in user                                                             |
| GET    | `/report`        | session | The report for the user's most recent attempt                                  |
| GET    | `/health`        | public  | Liveness and database check                                                    |

Request bodies must be JSON. `claimToken` is optional on both account routes.

## Working method

The project was specified before it was built, with
[OpenSpec](https://github.com/Fission-AI/OpenSpec), in `openspec/changes/add-adhd-test-funnel/`:
a proposal, behavior specs with scenarios, a design document and a task list. Implementation
followed the task list one group at a time with Claude Code:

1. Implement a task group.
2. A read-only **code-reviewer** subagent reviews the diff against the specs and the invariants of
   the design.
3. A read-only **qa-tester** subagent runs the checks and exercises the running system — `curl`
   and SQL for the API, a real browser for the web app — against the spec scenarios.
4. Fix what they found, then commit.

Both subagents are defined in `.claude/agents/`. Their reviews found real problems that were fixed
before the commits: a way to sign a visitor in to someone else's account through a cross-site form,
a bypass of the rate limit through a forged header, a request that crashed sign-in, and several
tests that would have passed with the behaviour they were meant to prove removed.

Frontend work followed the `modern-web-guidance` skill (labelled inputs with autocomplete, native
radios in a fieldset, `details` for the FAQ, cascade layers, logical properties, visible focus,
reduced-motion and forced-colors support), and the design system was read from Figma through the
Figma MCP server.
