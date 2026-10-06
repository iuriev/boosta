import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves two guarantees from the application into the database:
 *
 * - a quiz version cannot be stored unless its JSON document has the shape
 *   that scoring and the quiz endpoint rely on;
 * - an answer cannot be stored unless its question and option keys exist in
 *   the quiz version of its attempt. This is the referential integrity a
 *   foreign key would give if questions were rows instead of JSON.
 *
 * The application still validates first, to answer with a helpful error; these
 * checks are the backstop for anything that reaches the tables another way.
 */
export class AddDataIntegrityChecks1791300000000 implements MigrationInterface {
  name = 'AddDataIntegrityChecks1791300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Written as a sequence of checks so that each cast runs only after the
    // type it needs has been confirmed, and so the result is never NULL (a
    // CHECK constraint lets NULL through).
    await queryRunner.query(`
      CREATE FUNCTION quiz_definition_is_valid(definition jsonb) RETURNS boolean
      LANGUAGE plpgsql IMMUTABLE AS $$
      DECLARE
        item jsonb;
        seen_keys text[] := '{}';
        has_positive_score boolean := false;
      BEGIN
        IF jsonb_typeof(definition) IS DISTINCT FROM 'object' THEN
          RETURN false;
        END IF;

        -- questions: a non-empty array of { key, text } with unique keys
        IF jsonb_typeof(definition->'questions') IS DISTINCT FROM 'array'
           OR jsonb_array_length(definition->'questions') = 0 THEN
          RETURN false;
        END IF;
        FOR item IN SELECT * FROM jsonb_array_elements(definition->'questions') LOOP
          IF jsonb_typeof(item->'key') IS DISTINCT FROM 'string' OR item->>'key' = ''
             OR jsonb_typeof(item->'text') IS DISTINCT FROM 'string' OR item->>'text' = ''
             OR item->>'key' = ANY (seen_keys) THEN
            RETURN false;
          END IF;
          seen_keys := seen_keys || (item->>'key');
        END LOOP;

        -- options: a non-empty array of { key, label, score } with unique keys,
        -- no negative score and at least one score above zero
        IF jsonb_typeof(definition->'options') IS DISTINCT FROM 'array'
           OR jsonb_array_length(definition->'options') = 0 THEN
          RETURN false;
        END IF;
        seen_keys := '{}';
        FOR item IN SELECT * FROM jsonb_array_elements(definition->'options') LOOP
          IF jsonb_typeof(item->'key') IS DISTINCT FROM 'string' OR item->>'key' = ''
             OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string' OR item->>'label' = ''
             OR jsonb_typeof(item->'score') IS DISTINCT FROM 'number'
             OR item->>'key' = ANY (seen_keys) THEN
            RETURN false;
          END IF;
          IF (item->>'score')::numeric < 0 THEN
            RETURN false;
          END IF;
          IF (item->>'score')::numeric > 0 THEN
            has_positive_score := true;
          END IF;
          seen_keys := seen_keys || (item->>'key');
        END LOOP;
        IF NOT has_positive_score THEN
          RETURN false;
        END IF;

        -- scoring.highThreshold: a number from 0 to 100
        IF jsonb_typeof(definition->'scoring'->'highThreshold') IS DISTINCT FROM 'number' THEN
          RETURN false;
        END IF;
        RETURN (definition->'scoring'->>'highThreshold')::numeric BETWEEN 0 AND 100;
      END;
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE "quiz_versions"
      ADD CONSTRAINT "quiz_versions_definition_valid" CHECK (quiz_definition_is_valid("definition"))
    `);

    await queryRunner.query(`
      CREATE FUNCTION attempt_answers_check_keys() RETURNS trigger AS $$
      DECLARE
        quiz_definition jsonb;
      BEGIN
        SELECT v.definition INTO quiz_definition
        FROM attempts a
        JOIN quiz_versions v ON v.id = a.quiz_version_id
        WHERE a.id = NEW.attempt_id;

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
    `);
    await queryRunner.query(`
      CREATE TRIGGER "attempt_answers_valid_keys"
      BEFORE INSERT ON "attempt_answers"
      FOR EACH ROW EXECUTE FUNCTION attempt_answers_check_keys()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "attempt_answers_valid_keys" ON "attempt_answers"`);
    await queryRunner.query(`DROP FUNCTION attempt_answers_check_keys()`);
    await queryRunner.query(
      `ALTER TABLE "quiz_versions" DROP CONSTRAINT "quiz_versions_definition_valid"`,
    );
    await queryRunner.query(`DROP FUNCTION quiz_definition_is_valid(jsonb)`);
  }
}
