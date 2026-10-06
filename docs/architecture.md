# Architecture

How the system is built and why. The [README](../README.md) has the short version.

## Key decisions

### 1. A quiz version is immutable data

A quiz version is one database row holding the whole quiz as a JSON document: questions with
stable keys, answer options with their scores, and the threshold between "low" and "high".
Versions are published by migrations and never edited — a database trigger rejects changes to a
published version, and a partial unique index allows only one active version.

The document's shape is checked by the database as well (a `CHECK` constraint): questions and
options need unique keys, scores must be numbers that are not negative, and the threshold must lie
between 0 and 100.

Changing the quiz means publishing a new version. Earlier attempts keep pointing at the version
they were answered under, so they are always interpreted with the right questions and weights.

### 2. An attempt stores raw answers and nothing derived

An attempt records the quiz version, the gender and one `(question key, option key)` row per
answer. Question and option keys are strings rather than numeric ids on purpose: a key names the meaning of
a question and stays the same across quiz versions, which lets a report section ask for an answer
without knowing the version. A trigger rejects an answer whose keys are not in the quiz version of
its attempt, which gives the integrity a foreign key would. No score, level or report is stored. Stored answers cannot be edited (another trigger),
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

## Handling future changes

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
  a document fits better than normalised tables. Its shape is still enforced by the database. With
  an admin UI or a shared question bank, questions would move to their own table. All questions of a version share one set of
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
