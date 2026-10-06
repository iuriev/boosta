# Spec Delta

## Purpose

Defines how quiz content is versioned and how the currently active quiz is delivered to visitors, so that questions can change without affecting earlier attempts.

## ADDED Requirements

### Requirement: Active quiz is available without authentication
The system SHALL return the active quiz version to any visitor without requiring authentication. The response SHALL contain the version identifier, the ordered questions with their stable keys and texts, and the ordered answer options with their stable keys and labels. The response SHALL NOT expose option scores or the scoring threshold.

#### Scenario: Anonymous visitor loads the quiz
- **WHEN** a visitor without a session requests the active quiz
- **THEN** the system returns the active version identifier, five questions in order and five answer options from "Strongly agree" to "Strongly disagree"

#### Scenario: Scoring details are not exposed
- **WHEN** a visitor requests the active quiz
- **THEN** the response contains no option scores and no level threshold

### Requirement: The first quiz version exists on a fresh installation
The system SHALL provide the first quiz version, with the five questions and five answer options from the design, as part of its own startup on an empty database. No manual seeding step SHALL be needed before the quiz can be taken.

#### Scenario: First start on an empty database
- **WHEN** the system is started for the first time with an empty database and a visitor opens the web application
- **THEN** the start screen is shown and the quiz presents its five questions

#### Scenario: Restart with existing data
- **WHEN** the system is restarted with a database that already contains the first quiz version
- **THEN** the quiz version is not duplicated and existing attempts are untouched

### Requirement: Quiz versions are immutable
The system SHALL treat a published quiz version as immutable. Changing questions, options, option scores or the level threshold SHALL be done by publishing a new version, never by editing an existing one.

#### Scenario: A new version is published
- **WHEN** a new quiz version with different questions is published and activated
- **THEN** the previous version and every attempt that references it remain unchanged and readable

### Requirement: A quiz version has a well-formed definition
The system SHALL refuse to store a quiz version whose definition is malformed, whichever way it is written to the database. A definition is well-formed when it has at least one question, each with a unique non-empty key and a text; at least one option, each with a unique non-empty key, a label and a numeric score that is not negative, with at least one score above zero; and a level threshold between 0 and 100.

#### Scenario: Malformed definition published
- **WHEN** a quiz version is inserted with a missing threshold, duplicate keys, a negative score or no questions
- **THEN** the database rejects it and no version is stored

### Requirement: Exactly one quiz version is active
The system SHALL have exactly one active quiz version at any time, and new attempts SHALL be accepted only against it.

#### Scenario: Activating a new version
- **WHEN** a new quiz version is activated
- **THEN** the previously active version stops being active and the active-quiz request returns the new version

### Requirement: Question keys are stable identifiers
Each question SHALL have a key that identifies its meaning independently of its text and position. A question that is kept across versions SHALL keep its key, and a key SHALL NOT be reused for a question with a different meaning.

#### Scenario: Question text is reworded in a new version
- **WHEN** a new version rewords a question without changing its meaning
- **THEN** the question keeps the same key in the new version

### Requirement: Quiz flow in the web application
The web application SHALL ask the visitor to choose Male or Female before the first question, then present one question at a time with a progress indicator and the position in the form "current/total". Each question SHALL have a back control and a forward control. The forward control SHALL be disabled until the current question is answered, and on the last question it SHALL submit the quiz.

#### Scenario: Visitor answers a question
- **WHEN** the visitor selects an option
- **THEN** the option is shown as selected, the forward control becomes enabled and the same question stays on screen

#### Scenario: Visitor moves forward
- **WHEN** the visitor activates the forward control on an answered question that is not the last one
- **THEN** the next question is shown

#### Scenario: Visitor finishes the quiz
- **WHEN** the visitor activates the forward control on the answered last question
- **THEN** the answers are submitted

#### Scenario: Visitor goes back
- **WHEN** the visitor activates the back control
- **THEN** the previous question is shown with its selected option, which can be changed; on the first question the start screen is shown

#### Scenario: Progress survives a page reload
- **WHEN** the visitor reloads the page in the middle of the quiz
- **THEN** the selected gender and the answers given so far are restored
