# report Specification

## Purpose
Describes how a personal ADHD report is derived from a stored attempt: the score, the traits level and the sections shown, and how report logic can evolve independently of quiz versions.

## Requirements

### Requirement: Score calculation
The system SHALL compute a score from 0 to 100 for an attempt as the sum of the chosen options' scores divided by the maximum possible sum for the attempt's quiz version, multiplied by 100 and rounded to the nearest integer. Option scores SHALL be taken from the quiz version the attempt was taken against.

#### Scenario: All answers are "Strongly agree"
- **WHEN** every answer in an attempt is the highest-scoring option
- **THEN** the score is 100

#### Scenario: All answers are "Strongly disagree"
- **WHEN** every answer in an attempt is the lowest-scoring option
- **THEN** the score is 0

#### Scenario: Mixed answers on the first quiz version
- **WHEN** an attempt on the first quiz version has answers Agree, Agree, Neutral, Agree, Agree
- **THEN** the score is 70

### Requirement: Level determination
The system SHALL assign the level "High ADHD Traits" when the score is greater than or equal to the threshold of the attempt's quiz version, and "Low ADHD Traits" otherwise. The first quiz version SHALL use a threshold of 60.

#### Scenario: Score at the threshold
- **WHEN** an attempt on the first quiz version has a score of 60
- **THEN** the level is High ADHD Traits

#### Scenario: Score below the threshold
- **WHEN** an attempt on the first quiz version has a score of 55
- **THEN** the level is Low ADHD Traits

### Requirement: Report is built from the user's current attempt
The system SHALL return to an authenticated user the report for their current attempt (the most recently submitted one), containing the score, the level, the gender and an ordered list of sections. The report SHALL be computed at read time from the stored answers by the current report logic.

#### Scenario: User opens the report
- **WHEN** an authenticated user with an attempt requests their report
- **THEN** the system returns the score, level, gender and sections for that attempt

#### Scenario: User has retaken the quiz
- **WHEN** an authenticated user who owns several attempts requests their report
- **THEN** the score, level, gender and sections are those of the most recently submitted attempt

#### Scenario: Report logic changes after the attempt
- **WHEN** the report logic is updated after a user's attempt was stored
- **THEN** the next time the user opens the report it reflects the updated logic without the attempt being modified

#### Scenario: User has no attempt
- **WHEN** an authenticated user without an attempt requests their report
- **THEN** the system responds that no report exists

### Requirement: Report content varies by level and gender
The report SHALL contain, in order, the sections "Understanding Your Score", "Your Cognitive and Behavioral Strengths", "Your Emotional Regulation and Impulse Control" and "Frequently asked questions". The first three SHALL have distinct content for each combination of level and gender. The frequently asked questions SHALL depend on the level only.

#### Scenario: High traits, female
- **WHEN** a report is built for an attempt with a high level and female gender
- **THEN** the sections contain the high-level, female-specific content

#### Scenario: Low traits, male
- **WHEN** a report is built for an attempt with a low level and male gender
- **THEN** the sections contain the low-level, male-specific content and the low-level questions

### Requirement: Sections can depend on specific answers
A report section SHALL be able to declare the question keys it needs and to derive its content from the answers to those questions. The system SHALL omit a section from a report when the attempt's quiz version does not contain every question key the section needs, and SHALL still return the rest of the report.

#### Scenario: Required question is present
- **WHEN** a section that needs a given question key is evaluated for an attempt whose quiz version contains that question
- **THEN** the section is built using the answer to that question

#### Scenario: Required question is absent
- **WHEN** a section that needs a given question key is evaluated for an attempt whose quiz version does not contain that question
- **THEN** the section is omitted and the other sections are returned normally

### Requirement: Sections can use earlier attempts
The system SHALL make the user's earlier attempts, each with its quiz version and answers, available to report sections alongside the current attempt, so that a section can derive content from a user's history. A section that needs earlier attempts SHALL be omitted when the user has none.

#### Scenario: Section compares with the previous attempt
- **WHEN** a section that uses earlier attempts is evaluated for a user who has taken the quiz twice
- **THEN** the section is built with access to the answers of the earlier attempt

#### Scenario: First-time user
- **WHEN** a section that needs earlier attempts is evaluated for a user with a single attempt
- **THEN** the section is omitted and the other sections are returned normally

### Requirement: New sections apply to existing attempts
A section added to the report logic after an attempt was stored SHALL appear in that attempt's report when the data it needs is available, without any change to the stored attempt.

#### Scenario: Section added later
- **WHEN** a new section that needs only already-collected answers is added to the report logic
- **THEN** users who took the quiz before the section existed see it in their report

### Requirement: Sections are delivered as typed blocks
Each section in the report response SHALL carry a type from a fixed set of presentation block types together with its content, so that the web application renders a section by its type and a new section of an existing type requires no web application change.

#### Scenario: Web application renders the report
- **WHEN** the web application receives a report
- **THEN** it renders the score with the level, then each section in the given order according to its block type

### Requirement: Report page in the web application
The web application SHALL show the report only to a signed-in user. It SHALL display the score as "score / 100" with the level label, the sections in order, the frequently asked questions as expandable items, a sign-out control and a control to retake the test.

#### Scenario: User retakes the test from the report
- **WHEN** a signed-in user activates the retake control on the report page
- **THEN** the quiz start screen is shown and the user stays signed in

#### Scenario: Signed-out visitor opens the report page
- **WHEN** a visitor without a session opens the report page
- **THEN** the visitor is redirected to the sign-in page

#### Scenario: Signed-in user without an attempt opens the report page
- **WHEN** a signed-in user who has no attempt opens the report page
- **THEN** the user is redirected to the quiz start
