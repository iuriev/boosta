# ADHD test funnel

A quiz → account creation → personal report → sign-in flow, built as a test task.
Visitors take an ADHD traits quiz without signing in, create an account to keep the result, and
come back later to see their report or take the quiz again.

- **API** — NestJS, TypeORM, PostgreSQL (`apps/api`)
- **Web** — Next.js (`apps/web`) — _in progress_
- **Contracts** — TypeScript types of the HTTP API, shared by both (`packages/contracts`)

> **Status.** The API is complete and tested. The web application, the one-command
> `docker compose up` setup and CI are the next steps; this file will be extended with them.
> Everything described below about the API works today.

## Run it locally

Requirements: **Node.js ≥ 24.11** (see `.nvmrc`), **pnpm 12** (through `corepack enable`) and
**Docker**.

```bash
nvm use                                   # Node from .nvmrc
corepack enable                           # provides the pinned pnpm
pnpm install

cp apps/api/.env.example apps/api/.env    # defaults work as they are
pnpm db:up                                # PostgreSQL in Docker
pnpm dev:api                              # API on http://localhost:3001
```

The API applies its migrations on start, so the database schema and the default quiz (five
questions) exist as soon as it is up. There is no separate seeding step.

- Swagger UI: <http://localhost:3001/api/docs>
- Health check: <http://localhost:3001/api/health>

If port 5432 is taken, copy `.env.example` to `.env` in the repository root, change
`POSTGRES_PORT`, and use the same port in `DATABASE_URL` in `apps/api/.env`.

### Try the flow in Swagger

1. `GET /api/quiz` — copy `versionId`.
2. `POST /api/attempts` with that id, a gender and one answer per question — returns a
   `claimToken`.
3. `POST /api/auth/register` with an email, a password and the `claimToken` — creates the account,
   attaches the result and sets the session cookie.
4. `GET /api/report` — the personal report.
5. `POST /api/auth/logout`, then `POST /api/auth/login` to come back.

`claimToken` is optional: registering without it creates an account with no result yet.

## Commands

| Command                                      | What it does                                                   |
| -------------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev:api`                               | API in watch mode                                              |
| `pnpm db:up` / `pnpm db:down`                | Start / stop the development PostgreSQL                        |
| `pnpm test`                                  | Unit tests                                                     |
| `pnpm test:e2e`                              | End-to-end tests against a throwaway PostgreSQL (needs Docker) |
| `pnpm lint` / `pnpm lint:fix`                | ESLint, including import order                                 |
| `pnpm format` / `pnpm format:check`          | Prettier                                                       |
| `pnpm typecheck`                             | TypeScript in every package                                    |
| `pnpm build`                                 | Build every package                                            |
| `pnpm --filter @boosta/api migration:run`    | Apply migrations by hand (the API also does it on start)       |
| `pnpm --filter @boosta/api migration:revert` | Revert the latest migration                                    |

Commits follow [Conventional Commits](https://www.conventionalcommits.org); a git hook checks the
message and formats staged files.

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

## How it is built

### Quiz versions are immutable data

A quiz version is one row holding the whole quiz as a JSON document: questions with stable keys,
answer options with their scores, and the threshold between "low" and "high". Versions are
published by migrations and never edited — a database trigger rejects changes to a published
version, and a partial unique index allows one active version.

Changing the quiz means publishing a new version. Earlier attempts keep pointing at the version
they were answered under, so they are always interpreted correctly.

### Attempts store raw answers, nothing derived

An attempt records the quiz version, the gender and one `(question key, option key)` row per
answer. No score, level or report is stored. Answers cannot be edited (another trigger), and
attempts are never deleted when a user takes the quiz again: the most recently submitted attempt
is simply the current one.

### The report is computed when it is read

`GET /report` scores the current attempt with the weights of **its own** quiz version and then
runs the **current** report definition — an ordered list of sections in code — over it. Each
section is a small object:

```ts
interface ReportSection {
  key: string;
  requires?: readonly string[]; // question keys the section reads
  build(context: ReportContext): ReportBlockContent | null;
}
```

- A section that reads specific answers lists their question keys in `requires`. Attempts from
  quiz versions without those questions do not get that section; the rest of the report is
  unaffected.
- A section added later appears in the reports of existing attempts as well.
- A section can read the user's earlier attempts (`context.previousAttempts`, the most recent 20),
  each scored with its own quiz version. Total scores are comparable across versions; individual
  answers carry their scale (`score` and `maxScore`) because a later version may change it.
- A section that fails is logged and left out; the rest of the report is still returned.

Sections are returned as typed presentation blocks (`text`, `checklist`, `text-with-bullets`,
`faq`). The web app will render a block by its type without knowing which sections exist, so a new
section built from an existing block type needs no frontend change.

Report copy comes from the Figma design. The design contains an answer only for the first FAQ
question of each level; the other answers were written for this implementation.

### Anonymous first, account later

Finishing the quiz stores the attempt immediately and returns a one-time claim token. Only its
SHA-256 hash is stored, it expires after 24 hours, and claiming is a single conditional `UPDATE`,
so a token cannot be used twice. Registering or signing in with the token attaches the attempt to
the account.

### Authentication

Deliberately minimal, as the task asks: a signed token (7 days) in an `httpOnly`, `SameSite=Lax`
cookie, bcrypt password hashes, one global guard that protects every route unless it is marked
public. Credential routes are rate-limited and accept JSON only, which prevents a form on another
site from signing a visitor in to someone else's account.

## Working method

The project is specified with [OpenSpec](https://github.com/Fission-AI/OpenSpec) in
`openspec/changes/add-adhd-test-funnel/`: a proposal, behavior specs with scenarios, a design
document and a task list. Implementation follows the task list one group at a time with Claude
Code. Each group is reviewed by a read-only `code-reviewer` subagent and verified against the spec
scenarios by a `qa-tester` subagent (both defined in `.claude/agents/`) before it is committed.

## Still to come

- The web application (`apps/web`).
- `docker compose up` for the whole system, and CI.
- Sections on trade-offs, on how the solution handles future quiz and report changes, and on what
  was left out and why.
