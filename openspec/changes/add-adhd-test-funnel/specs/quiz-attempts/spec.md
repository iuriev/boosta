# Spec Delta

## Purpose

Covers how a finished quiz is submitted, validated and stored, how an anonymous attempt becomes owned by an account, and what happens when a user takes the quiz again.

## ADDED Requirements

### Requirement: Anonymous attempt submission
The system SHALL accept an attempt from an unauthenticated visitor, consisting of the quiz version identifier, the gender and one answer per question. On success it SHALL store the attempt without an owner and return a claim token.

#### Scenario: Visitor finishes the quiz
- **WHEN** an unauthenticated visitor submits a complete, valid set of answers for the active quiz version
- **THEN** the system stores an unowned attempt bound to that quiz version and returns a claim token

### Requirement: Attempt validation
The system SHALL reject a submission that references a quiz version that is not active, has a gender other than male or female, omits a question, answers a question twice, or uses a question key or option key that does not exist in that version. A rejected submission SHALL store nothing.

#### Scenario: Missing answer
- **WHEN** a submission omits the answer to one of the version's questions
- **THEN** the system rejects it with a validation error and stores no attempt

#### Scenario: Unknown option
- **WHEN** a submission contains an option key that the version does not define
- **THEN** the system rejects it with a validation error and stores no attempt

#### Scenario: Outdated quiz version
- **WHEN** a submission references a quiz version that is no longer active
- **THEN** the system rejects it with an error that tells the client to reload the quiz

### Requirement: Attempts keep their quiz version and raw answers
The system SHALL store, for every attempt, the quiz version it was taken against, the gender and the raw answer chosen for each question key. Stored answers SHALL NOT be modified when a new quiz version is published.

#### Scenario: Quiz changes after an attempt
- **WHEN** a new quiz version replaces a question after an attempt was stored
- **THEN** the stored attempt still references its original version and its original answers

### Requirement: Claim token is secret, single-use and expiring
A claim token SHALL be unguessable, SHALL be usable once, and SHALL expire 24 hours after the attempt is submitted. The system SHALL NOT store the token in a form that allows it to be read back.

#### Scenario: Token reused
- **WHEN** a claim token that was already used to claim an attempt is presented again
- **THEN** the system rejects it

#### Scenario: Token expired
- **WHEN** a claim token is presented more than 24 hours after the attempt was submitted
- **THEN** the system rejects it

### Requirement: Claiming an attempt
The system SHALL attach an unowned attempt to an account when a valid claim token is presented during registration or sign-in. After claiming, the attempt SHALL be the account's current attempt.

#### Scenario: Claim during registration
- **WHEN** a visitor registers with a valid claim token
- **THEN** the new account owns the attempt and its report is available immediately

#### Scenario: Claim during sign-in
- **WHEN** an existing user signs in with a valid claim token
- **THEN** the attempt becomes the user's current attempt

### Requirement: A retake replaces the current attempt
A user SHALL have at most one attempt. When a user who already has an attempt claims or submits a new one, the system SHALL replace the previous attempt with the new one atomically, so that the user never ends up with no attempt or with two.

#### Scenario: Signed-in user retakes the quiz
- **WHEN** a signed-in user submits a new complete attempt
- **THEN** the new attempt is attached to the user directly, the previous attempt is removed and no claim token is returned

#### Scenario: Returning user retakes while signed out
- **WHEN** a user with an existing attempt takes the quiz while signed out and then signs in with the claim token
- **THEN** the new attempt replaces the previous one
