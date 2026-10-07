# user-auth Specification

## Purpose
Provides the minimal account and session behavior needed for a user to reach their own report: registration after or before the quiz, sign-in, sign-out and access control.

## Requirements

### Requirement: Registration after the quiz
The system SHALL create an account from an email, a password and a valid claim token, attach the claimed attempt to it and start a session. This is the primary path: a visitor takes the quiz anonymously and then creates an account to see the report.

#### Scenario: Successful registration after the quiz
- **WHEN** a visitor submits a new email, a valid password and a valid claim token
- **THEN** an account is created, the attempt is attached to it and a session is started

#### Scenario: Registration with an invalid claim token
- **WHEN** a registration request carries a claim token that is unknown, already used or expired
- **THEN** the system rejects it, creates no account and tells the client that the quiz has to be taken again

### Requirement: Registration before the quiz
The system SHALL also create an account from an email and a password without a claim token and start a session. Such an account has no attempt and therefore no report until its owner takes the quiz.

#### Scenario: Successful registration without a quiz
- **WHEN** a visitor submits a new email and a valid password without a claim token
- **THEN** an account without an attempt is created and a session is started

#### Scenario: Quiz taken after registration
- **WHEN** a user who registered without a quiz finishes the quiz while signed in
- **THEN** the attempt is attached to the account directly and the report is available

### Requirement: Credential rules
The system SHALL require a syntactically valid email and a password of 8 to 72 characters. Emails SHALL be compared case-insensitively and ignoring surrounding whitespace, and SHALL be unique across accounts.

#### Scenario: Password too short
- **WHEN** a registration request has a password shorter than 8 characters
- **THEN** the system rejects it with a validation error and creates no account

#### Scenario: Same email in a different case
- **WHEN** a user registered as "user@example.com" signs in as "User@Example.com"
- **THEN** the system treats it as the same account

### Requirement: Registration with an already registered email
When a registration request uses an email that already belongs to an account, the system SHALL sign the user in and attach the claimed attempt if the password matches that account, and SHALL otherwise reject the request, saying that the email already has an account, without creating a session or attaching the attempt.

#### Scenario: Existing email, correct password
- **WHEN** a visitor finishes the quiz and submits the registration form with an existing account's email and its correct password
- **THEN** the user is signed in and the new attempt becomes the account's current attempt

#### Scenario: Existing email, correct password, invalid claim token
- **WHEN** a visitor submits the registration form with an existing account's email, its correct password and a claim token that is unknown, already used or expired
- **THEN** the user is signed in, no attempt is claimed and the response says so

#### Scenario: Existing email, wrong password
- **WHEN** a visitor submits the registration form with an existing account's email and a wrong password
- **THEN** the system rejects the request, starts no session and leaves the attempt unclaimed

### Requirement: Sign-in
The system SHALL start a session for a request with an email and password that match an account. A request with an unknown email or a wrong password SHALL be rejected with the same error in both cases. A sign-in request MAY carry a claim token, in which case the attempt is claimed as part of signing in.

#### Scenario: Correct credentials
- **WHEN** a user submits the email and password of their account
- **THEN** a session is started and the user can open their report

#### Scenario: Sign-in with an invalid claim token
- **WHEN** a user submits correct credentials together with a claim token that is unknown, already used or expired
- **THEN** the user is signed in, no attempt is claimed and the response says so

#### Scenario: Wrong credentials
- **WHEN** a sign-in request has an unknown email or a wrong password
- **THEN** the system rejects it with a generic invalid-credentials error

#### Scenario: Password longer than an account can have
- **WHEN** a sign-in request has a password longer than the registration limit, even one that begins with the account's password
- **THEN** the system rejects it with the same generic invalid-credentials error

### Requirement: Session cookie
The system SHALL carry the session in a cookie that is not readable by scripts, is sent only on same-site requests and expires after 7 days. In production it SHALL be marked secure unless the deployment explicitly turns that off to serve plain HTTP, as the local container setup does. Passwords SHALL be stored only as salted hashes.

#### Scenario: Production over plain HTTP
- **WHEN** the system runs in production mode with the secure flag explicitly turned off
- **THEN** the session cookie is set without the secure attribute and keeps the http-only and same-site attributes

#### Scenario: Session established
- **WHEN** a user registers or signs in successfully
- **THEN** the response sets the session cookie with the http-only and same-site attributes

### Requirement: Sign-out
The system SHALL end the session on sign-out by clearing the session cookie.

#### Scenario: User signs out
- **WHEN** a signed-in user signs out
- **THEN** the session cookie is cleared and a later report request is rejected as unauthenticated

#### Scenario: User signs out in the middle of the quiz
- **WHEN** a signed-in user signs out on the quiz screen
- **THEN** the answers given so far are discarded and the sign-in screen opens

### Requirement: Users access only their own data
The system SHALL serve report and account data only for the authenticated user of the request, and SHALL NOT accept a user or attempt identifier from the client to select whose report is returned.

#### Scenario: Unauthenticated report request
- **WHEN** a request without a valid session asks for a report
- **THEN** the system rejects it as unauthenticated

#### Scenario: Two users
- **WHEN** two different users each request their report
- **THEN** each receives only the report built from their own attempt

### Requirement: Credential endpoints accept JSON only
The system SHALL refuse request bodies that are not JSON, so that a form on another site cannot submit credentials and sign a visitor in to an account chosen by that site.

#### Scenario: Cross-site form post
- **WHEN** a sign-in request arrives with a form-encoded, multipart or plain-text body
- **THEN** the system rejects it and sets no session cookie

### Requirement: Throttling of credential endpoints
The system SHALL limit the combined rate of registration and sign-in requests for one email from one client, and SHALL also cap the total such requests from one client across all emails. Requests above either limit SHALL be rejected. A client SHALL NOT be able to choose the address it is counted under.

#### Scenario: Too many attempts on one account
- **WHEN** a client exceeds the allowed number of sign-in or registration requests for one email within the limit window
- **THEN** further requests for that email are rejected until the window passes

#### Scenario: Many accounts from one client
- **WHEN** a client spreads its requests over many emails and exceeds the per-client cap
- **THEN** further requests are rejected until the window passes

#### Scenario: Forged forwarding header
- **WHEN** a browser sends its own `X-Forwarded-For` header with a request to the web application
- **THEN** the header is not passed on to the API and does not change how the request is counted

### Requirement: Entry points to sign-in and the report
The web application SHALL show a "Sign in" link in the header of the start screen and the quiz for a visitor without a session. For a signed-in user it SHALL show "My report" in its place when the user has a report, and "Sign out" when the user has not taken the quiz yet. The account creation page SHALL link to the sign-in page for visitors who already have an account. The start screen SHALL be shown to signed-in users as well, so that a retake follows the same path as a first attempt.

#### Scenario: Visitor without a session opens the start screen
- **WHEN** a visitor without a session opens the start screen
- **THEN** the header shows a "Sign in" link

#### Scenario: Signed-in user opens the start screen
- **WHEN** a signed-in user who has a report opens the start screen
- **THEN** the start screen is shown with a "My report" link in the header instead of "Sign in"

#### Scenario: Signed-in user without a report opens the start screen
- **WHEN** a signed-in user who has not taken the quiz opens the start screen
- **THEN** the header shows "Sign out" and no link to a report

#### Scenario: Visitor with a finished quiz already has an account
- **WHEN** a visitor on the account creation page follows the link to sign in and signs in
- **THEN** the finished attempt is claimed and the report is shown

### Requirement: Account screens in the web application
The web application SHALL show the account creation form after the quiz is submitted and a separate sign-in page reachable at any time. Both SHALL validate the email and password before sending, show server errors next to the form, and on success take the user to the report, or to the quiz start when the account has no attempt yet. The sign-in page SHALL link to the account creation page.

#### Scenario: Account created without a finished quiz
- **WHEN** a visitor opens the account creation page without a pending claim token and registers
- **THEN** the account is created and the visitor is taken to the quiz start

#### Scenario: Account created after the quiz
- **WHEN** a visitor with a pending claim token registers
- **THEN** the visitor is taken to the report page

#### Scenario: Successful sign-in
- **WHEN** a user who has an attempt submits valid credentials on the sign-in page
- **THEN** the user is taken to the report page

#### Scenario: Sign-in without an attempt
- **WHEN** a user who has no attempt submits valid credentials on the sign-in page
- **THEN** the user is taken to the quiz start
