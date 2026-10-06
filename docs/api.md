# API

Swagger UI is the live reference: <http://localhost:3001/api/docs>.

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

Errors that the web app branches on carry a stable `code`:

| Code                       | Status | Meaning                                                         |
| -------------------------- | ------ | --------------------------------------------------------------- |
| `QUIZ_VERSION_OUTDATED`    | 409    | The submitted quiz version is unknown or no longer active       |
| `ATTEMPT_INVALID`          | 400    | The answers do not match the quiz version                       |
| `CLAIM_TOKEN_INVALID`      | 400    | The claim token is unknown, already used or expired             |
| `INVALID_CREDENTIALS`      | 401    | Unknown email or wrong password (not distinguished)             |
| `EMAIL_ALREADY_REGISTERED` | 409    | Registration with an existing email and a password that differs |
| `REPORT_NOT_FOUND`         | 404    | The signed-in user has not taken the quiz yet                   |
