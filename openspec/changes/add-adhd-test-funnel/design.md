# Design

## Context

The repository is empty. The brief fixes Next.js, NestJS and PostgreSQL, requires the client and server to be separate applications, and asks for minimal authentication. The Figma file is view-only and serves as a structural reference: a gender selection screen, five Likert questions, an account creation form, a sign-in form and four report variants (Low or High traits, Male or Female) that share one structure. See `proposal.md` for motivation and `specs/` for the behavior contract.

Decisions already made with the product owner and treated as constraints here:

- Level comes from a score threshold only; the designer's sticky note ("2 or more Agree/Strongly agree means High") is not used.
- The report is computed at read time; nothing derived is stored.
- The answer-dependent section mechanism is built and tested, but no section beyond the Figma design is added.
- An attempt is stored anonymously as soon as the quiz is finished.
- Every attempt is kept; the most recently submitted attempt of a user is the current one and drives the report. There is no UI for earlier attempts.
- Registering with an existing email and a correct password signs the user in (a deliberate shortcut, see Risks).
- Both orders are allowed: quiz then account (the brief's main path) and account then quiz. The brief describes account creation after the quiz and does not forbid the other order, so the claim token is optional at registration and an account may exist without an attempt.
- The quiz is navigated with the back and forward arrows from the design; selecting an option does not advance.
- Links that the design lacks but the flows need are added: "Sign in" or "My report" in the header, "Already have an account? Sign in" on account creation, "Retake test" on the report.
- Answers to the FAQ items that are collapsed in Figma (which contains the answer only for the first item of each report) are written by us.

## Goals / Non-Goals

**Goals:**

- Quiz content can change by publishing a new version without touching stored attempts.
- Report logic can change, and new sections can appear for old attempts, by changing backend code only.
- The web application renders a report without knowing which sections exist.
- One command starts the whole system; one command runs all checks.

**Non-Goals:**

- Runtime editing of quiz or report content (no admin UI, no rule language stored in data).
- Refresh tokens, session revocation, email flows, OAuth.
- A UI for browsing or comparing earlier attempts.
- Frontend automated tests, deployment, internationalization.

## Decisions

### Repository layout: pnpm workspace with two apps and a contracts package

```
apps/api            NestJS application
apps/web            Next.js application
packages/contracts  TypeScript types of the HTTP API (no runtime code)
```

The apps build, run and deploy independently, which satisfies "separate applications". `packages/contracts` holds only types (request and response shapes, the report block union), so both sides fail to compile when the contract drifts. Alternative considered: two unrelated folders with duplicated types — simpler, but the contract would drift silently. Alternative considered: generating a client from OpenAPI — more machinery than five endpoints justify.

### Data model

```
quiz_versions     id uuid PK, version int UNIQUE, is_active bool,
                  definition jsonb, created_at
                  partial UNIQUE index on (is_active) WHERE is_active
attempts          id uuid PK, quiz_version_id FK, gender enum(male,female),
                  user_id FK NULL, claim_token_hash text NULL UNIQUE,
                  claim_expires_at timestamptz NULL, created_at
                  index on (user_id, created_at DESC)
attempt_answers   attempt_id FK ON DELETE CASCADE, question_key text,
                  option_key text, PK (attempt_id, question_key)
users             id uuid PK, email citext UNIQUE, password_hash text, created_at
```

- `quiz_versions.definition` is one immutable JSON document: ordered questions (`key`, `text`), ordered options (`key`, `label`, `score`) and `scoring.highThreshold`. A version is read and written as a whole and never edited, so a document fits better than normalized question and option tables, and it is impossible to edit one question of a published version by accident. Versions are published by migrations, which makes each publication reviewable and reproducible. Because the API applies pending migrations on start, a fresh installation has quiz version 1 as soon as it is up, with no separate seeding command; running migrations again is a no-op. The partial unique index enforces "exactly one active version" in the database.
- `attempt_answers` is a table rather than a JSON column because answers are the long-lived asset: future report sections and analytics query them by `question_key`. It stores keys, not scores or texts, so it stays valid whatever happens to later versions.
- A user owns any number of attempts. The current attempt is the one with the latest `created_at` (the submission time), found through the `(user_id, created_at DESC)` index. A retake only inserts or attaches a row and never deletes one, so answers given under earlier quiz versions survive and remain available to future report sections. Ordering by submission time rather than claim time means that claiming an old anonymous attempt late cannot push a newer result out of the report.
- No score, level or report is stored. Both are pure functions of the attempt and its quiz version.

Alternative considered: storing `score` and `level` on the attempt. Rejected because the owner chose read-time computation; the README records that a stored snapshot would be the first thing to add if scores must never change retroactively.

### Scoring lives in the quiz version, report logic lives in code

Option scores and the threshold are part of the immutable quiz version, so the score of an old attempt is always computed with the weights it was answered under. What the report says about that score lives in backend code and is always the current logic. This split is the answer to "questions may change" and "report logic may change" being independent axes.

### Report engine

A report definition is an ordered array of section objects registered in the report module:

```ts
interface ReportSection {
  key: string;
  requires?: string[];                       // question keys
  build(ctx: ReportContext): ReportBlock | null;
}
// ReportContext: { gender, score, level, answers: Map<questionKey, { optionKey, score }>,
//                  previousAttempts: PreviousAttempt[] }   // newest first, each with its own
//                                                          // gender, score, level and answers
```

The engine computes the score and level, then for each section skips it when a required question key is missing from the attempt's quiz version, calls `build`, and drops `null` results. `ReportBlock` is a discriminated union defined in `packages/contracts`: `text`, `checklist`, `text-with-bullets` and `faq`. The API returns `{ score, level, gender, sections: ReportBlock[] }`.

- A new section for old attempts is one new object in the array.
- A section that depends on answers reads `ctx.answers` and declares `requires`; attempts from versions without that question simply do not get it.
- A section that depends on a user's history reads `ctx.previousAttempts` and returns `null` when it is empty. Earlier attempts are scored with their own quiz version, so they are comparable even across versions. No such section ships now; the context field and a test-only section prove the path.
- The web application switches on `block.type`, so new sections of an existing type need no frontend change.

Section texts are TypeScript modules keyed by level and gender next to the sections that use them. Alternative considered: content and display rules in the database — it allows edits without a deploy but needs a rule language and an editor, neither of which exists here.

### HTTP API

All routes are under `/api`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/quiz` | none | Active quiz version without scores |
| POST | `/attempts` | optional | Submit answers; returns `claimToken`, or attaches directly when signed in |
| POST | `/auth/register` | none | Create account (or sign in on existing email), claim attempt when a token is sent, set cookie |
| POST | `/auth/login` | none | Sign in, optionally claim attempt, set cookie |
| POST | `/auth/logout` | none | Clear cookie |
| GET | `/auth/me` | required | Current user |
| GET | `/report` | required | Report for the current user's attempt |

`/report` takes no identifier, so there is no way to ask for another user's report. Input is validated with class-validator DTOs and a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). Errors use Nest's standard JSON shape with a stable `code` field for the cases the UI branches on (`QUIZ_VERSION_OUTDATED`, `INVALID_CREDENTIALS`, `CLAIM_TOKEN_INVALID`, `REPORT_NOT_FOUND`). Swagger UI is served at `/api/docs` outside production.

### Claim token

`POST /attempts` generates 32 random bytes, returns them base64url-encoded and stores only their SHA-256 hash with a 24-hour expiry. Claiming looks the attempt up by hash, checks expiry and that it is still unowned, sets `user_id` and nulls the hash in one transaction, which makes the token single-use. A fast hash is appropriate because the token is high-entropy, unlike a password.

### Authentication

`@nestjs/jwt` signs a JWT (`sub` = user id, 7-day expiry) that is set as an `httpOnly`, `SameSite=Lax` cookie, `Secure` in production. One global guard reads the cookie; routes opt out with a `@Public()` decorator and `POST /attempts` uses an optional variant. Passwords are hashed with bcrypt at cost 12; the 72-character maximum in the spec is bcrypt's input limit. `helmet` and `@nestjs/throttler` (on the two credential routes) are enabled. Alternative considered: Passport strategies — more boilerplate for two endpoints. Alternative considered: server-side sessions — revocable, but more infrastructure than the brief wants.

### Same-origin cookies through a Next.js rewrite

The browser talks only to the Next.js origin; `next.config` rewrites `/api/:path*` to the API's internal URL. The cookie is therefore first-party, there is no CORS configuration, and `SameSite=Lax` gives CSRF protection for the state-changing POSTs. Server components call the API directly over the internal URL and forward the incoming `cookie` header.

### Frontend structure

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | server | Start screen with Male and Female; fetches the quiz |
| `/quiz` | client | One question at a time; state mirrored to `sessionStorage` |
| `/signup` | client | Account creation; sends the pending claim token when there is one |
| `/signin` | client | Sign-in; sends a pending claim token if one exists |
| `/report` | server | Fetches `/report` with the cookie; redirects on 401 or 404 |

Quiz state is a single reducer (`gender`, `answers`, `index`, `quizVersionId`, `claimToken`) persisted to `sessionStorage`. Selecting an option only marks it; the forward arrow, disabled until the question is answered, moves on and submits on the last question, and the back arrow on the first question returns to the start screen. The header shows "Sign in" or "My report" depending on `GET /auth/me`. A signed-in user who retakes the quiz is sent straight to `/report`, since the API attaches the attempt directly. A `QUIZ_VERSION_OUTDATED` response clears the stored state and restarts the quiz. Forms use react-hook-form with zod schemas local to the web app. Styling is CSS Modules with design tokens as CSS custom properties, approximating the Figma layout.

### Tooling

- Node 24 (`.nvmrc`, `engines`), pnpm via `packageManager`, TypeScript `strict` with a shared base `tsconfig`.
- One root ESLint flat config: `typescript-eslint` type-checked rules, `eslint-plugin-simple-import-sort`, `eslint-config-next` scoped to `apps/web`, `eslint-config-prettier`. Prettier formats everything.
- husky + lint-staged (ESLint and Prettier on staged files) and commitlint with the conventional config.
- Jest for API unit tests and e2e tests; e2e tests start PostgreSQL with Testcontainers, run migrations and drive the real Nest application through supertest.
- TypeORM runs with `synchronize: false`; schema and quiz versions change only through migrations, which the API applies on start.
- `docker-compose.yml` starts PostgreSQL, the API and the web app; `docker-compose.dev.yml` starts only PostgreSQL for local development.
- GitHub Actions runs lint, typecheck, tests and build on every push and pull request.

### AI-assisted workflow

The project is built with Claude Code and keeps its working agreement in the repository:

- OpenSpec holds the proposal, specs, design and tasks; implementation follows `tasks.md` one group at a time.
- `.claude/agents/code-reviewer.md` is a read-only subagent that reviews each group's diff against the specs and the invariants of this design before the commit.
- `.claude/agents/qa-tester.md` is a read-only subagent that runs the checks and exercises the running API and database against the spec scenarios.
- Frontend work loads the `modern-web-guidance` skill first, so markup, CSS and client-side code follow current platform practice (native form validation hooks, `details`-based disclosure for the FAQ, logical properties, container-friendly layout, accessible focus states).

The README describes this workflow in a short section.

## Risks / Trade-offs

- [Registering with an existing email signs the user in, so the registration form confirms that an email is registered and doubles as a login form] → Requested as a time-saving shortcut. The README documents it as temporary and describes the proper flow: always answer "check your inbox", verify email ownership, and attach the attempt only after an explicit sign-in.
- [Attempts are never deleted, so a user's rows grow with every retake and there is no way for a user to remove old answers] → Rows are small and retakes are rare. Deleting an account and its attempts is listed in the README as not done.
- [Earlier attempts are loaded for every report although no shipped section uses them yet] → One indexed query bounded by a small limit; it keeps the section contract honest instead of promising a capability that was never exercised.
- [Read-time computation means a report can change for a user who has already seen it when the logic changes] → Accepted by the owner. Scores stay stable because weights are frozen in the quiz version; only wording and sections move.
- [The threshold rule differs from the designer's sticky note] → Chosen by the owner so that score and level can never contradict each other. The threshold is data in the quiz version, so it can be tuned by publishing a version.
- [Unclaimed anonymous attempts accumulate] → Tokens expire after 24 hours and rows are tiny; a periodic cleanup job is listed in the README as not done.
- [An account can exist without an attempt, a state the design has no screen for] → Such a user is always sent to the quiz start instead of the report, and the first attempt submitted while signed in is attached directly.
- [A stateless JWT cannot be revoked before it expires] → Acceptable for a report-only product; sign-out clears the cookie.
- [Publishing quiz versions through migrations requires a deploy] → Acceptable without an admin UI; it also gives review and history for free.
- [Figma has no answer text for the collapsed FAQ items] → Short answers are written in the tone of the design, without medical claims, and the README marks them as authored placeholder content.
- [The Figma file is view-only, so copy is transcribed by hand] → Section texts are taken from the Figma layer tree and checked against the rendered frames when the content module is written.
