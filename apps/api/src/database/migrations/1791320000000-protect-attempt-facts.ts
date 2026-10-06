import type { MigrationInterface, QueryRunner } from 'typeorm';

const CHECK_KEYS_BODY = (guardUnknownAttempt: boolean): string => `
  CREATE OR REPLACE FUNCTION attempt_answers_check_keys() RETURNS trigger AS $$
  DECLARE
    quiz_definition jsonb;
  BEGIN
    SELECT v.definition INTO quiz_definition
    FROM attempts a
    JOIN quiz_versions v ON v.id = a.quiz_version_id
    WHERE a.id = NEW.attempt_id;
${
  guardUnknownAttempt
    ? `
    -- An unknown attempt is the foreign key's error to report, not this one's.
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
`
    : ''
}
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(quiz_definition->'questions') AS question
      WHERE question->>'key' = NEW.question_key
    ) THEN
      RAISE EXCEPTION 'question "%" is not part of the quiz version of attempt %',
        NEW.question_key, NEW.attempt_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(quiz_definition->'options') AS option
      WHERE option->>'key' = NEW.option_key
    ) THEN
      RAISE EXCEPTION 'option "%" is not part of the quiz version of attempt %',
        NEW.option_key, NEW.attempt_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
`;

/**
 * Closes the gap the answer-key trigger left open. That trigger checks an
 * answer when it is inserted; it does not notice the attempt being pointed at
 * another quiz version afterwards, which would silently re-score the same
 * answers with different weights. A foreign key from answers to question rows
 * would have refused that, so the database now refuses it too.
 *
 * What an attempt records as fact (its quiz version, gender and submission
 * time) can no longer change. Ownership still can: claiming an attempt sets
 * `user_id` and clears the claim token.
 *
 * Deleting answers stays possible on purpose: the cascade from `attempts`
 * needs it, and so would removing a user's data on request.
 */
export class ProtectAttemptFacts1791320000000 implements MigrationInterface {
  name = 'ProtectAttemptFacts1791320000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION attempts_prevent_fact_change() RETURNS trigger AS $$
      BEGIN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.quiz_version_id IS DISTINCT FROM OLD.quiz_version_id
           OR NEW.gender IS DISTINCT FROM OLD.gender
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
          RAISE EXCEPTION 'the quiz version, gender and submission time of an attempt are immutable'
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "attempts_facts_immutable"
      BEFORE UPDATE ON "attempts"
      FOR EACH ROW EXECUTE FUNCTION attempts_prevent_fact_change()
    `);

    await queryRunner.query(CHECK_KEYS_BODY(true));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CHECK_KEYS_BODY(false));
    await queryRunner.query(`DROP TRIGGER "attempts_facts_immutable" ON "attempts"`);
    await queryRunner.query(`DROP FUNCTION attempts_prevent_fact_change()`);
  }
}
