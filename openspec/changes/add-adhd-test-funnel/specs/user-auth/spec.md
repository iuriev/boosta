# Spec Delta

## Purpose

Provides the minimal account and session behavior needed for a user to reach their own report: registration after the quiz, sign-in, sign-out and access control.

## ADDED Requirements

### Requirement: Registration after the quiz
The system SHALL create an account from an email, a password and a valid claim token, attach the claimed attempt to it and start a session. Registration without a valid claim token SHALL be rejected, because an account exists only to hold a report.

#### Scenario: Successful registration
- **WHEN** a visitor submits a new email, a valid password and a valid claim token
- **THEN** an account is created, the attempt is attached to it and a session is started

#### Scenario: Registration without a claim token
- **WHEN** a registration request has no claim token or an invalid one
- **THEN** the system rejects it and creates no account

### Requirement: Credential rules
The system SHALL require a syntactically valid email and a password of 8 to 72 characters. Emails SHALL be compared case-insensitively and ignoring surrounding whitespace, and SHALL be unique across accounts.

#### Scenario: Password too short
- **WHEN** a registration request has a password shorter than 8 characters
- **THEN** the system rejects it with a validation error and creates no account

#### Scenario: Same email in a different case
- **WHEN** a user registered as "user@example.com" signs in as "User@Example.com"
- **THEN** the system treats it as the same account

### Requirement: Registration with an already registered email
When a registration request uses an email that already belongs to an account, the system SHALL sign the user in and attach the claimed attempt if the password matches that account, and SHALL reject the request without revealing whether the password was wrong otherwise.

#### Scenario: Existing email, correct password
- **WHEN** a visitor finishes the quiz and submits the registration form with an existing account's email and its correct password
- **THEN** the user is signed in and the new attempt replaces the account's previous attempt

#### Scenario: Existing email, wrong password
- **WHEN** a visitor submits the registration form with an existing account's email and a wrong password
- **THEN** the system rejects the request, starts no session and leaves the attempt unclaimed

### Requirement: Sign-in
The system SHALL start a session for a request with an email and password that match an account. A request with an unknown email or a wrong password SHALL be rejected with the same error in both cases. A sign-in request MAY carry a claim token, in which case the attempt is claimed as part of signing in.

#### Scenario: Correct credentials
- **WHEN** a user submits the email and password of their account
- **THEN** a session is started and the user can open their report

#### Scenario: Wrong credentials
- **WHEN** a sign-in request has an unknown email or a wrong password
- **THEN** the system rejects it with a generic invalid-credentials error

### Requirement: Session cookie
The system SHALL carry the session in a cookie that is not readable by scripts, is sent only on same-site requests, is marked secure in production and expires after 7 days. Passwords SHALL be stored only as salted hashes.

#### Scenario: Session established
- **WHEN** a user registers or signs in successfully
- **THEN** the response sets the session cookie with the http-only and same-site attributes

### Requirement: Sign-out
The system SHALL end the session on sign-out by clearing the session cookie.

#### Scenario: User signs out
- **WHEN** a signed-in user signs out
- **THEN** the session cookie is cleared and a later report request is rejected as unauthenticated

### Requirement: Users access only their own data
The system SHALL serve report and account data only for the authenticated user of the request, and SHALL NOT accept a user or attempt identifier from the client to select whose report is returned.

#### Scenario: Unauthenticated report request
- **WHEN** a request without a valid session asks for a report
- **THEN** the system rejects it as unauthenticated

#### Scenario: Two users
- **WHEN** two different users each request their report
- **THEN** each receives only the report built from their own attempt

### Requirement: Throttling of credential endpoints
The system SHALL limit the rate of registration and sign-in requests per client and reject requests above the limit.

#### Scenario: Too many sign-in attempts
- **WHEN** a client exceeds the allowed number of sign-in requests within the limit window
- **THEN** further requests are rejected until the window passes

### Requirement: Account screens in the web application
The web application SHALL show the account creation form after the quiz is submitted and a separate sign-in page reachable at any time. Both SHALL validate the email and password before sending, show server errors next to the form, and take the user to the report on success.

#### Scenario: Account creation opened without a finished quiz
- **WHEN** a visitor opens the account creation page without a pending claim token
- **THEN** the visitor is redirected to the quiz start

#### Scenario: Successful sign-in
- **WHEN** a user submits valid credentials on the sign-in page
- **THEN** the user is taken to the report page
