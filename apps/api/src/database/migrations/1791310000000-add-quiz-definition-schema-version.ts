import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives the quiz document a format number, `schemaVersion`.
 *
 * A quiz version number says which content a document holds; `schemaVersion`
 * says which structure it has. Published versions are never rewritten, so once
 * a second structure exists (per-question options, question weights, more than
 * one threshold) old and new documents live side by side, and every reader has
 * to know which one it is looking at without guessing from the fields.
 *
 * Existing documents are stamped as format 1. This is the one sanctioned
 * rewrite of a published version: it labels the structure the document already
 * has and changes nothing that validation or scoring reads.
 *
 * The CHECK constraint now dispatches on the format and rejects formats it
 * does not know. Introducing format 2 means a migration that adds
 * `quiz_definition_v2_is_valid`, a branch here and in
 * `attempt_answers_check_keys`, and a second member in the application's
 * `QuizDefinition` union.
 */
export class AddQuizDefinitionSchemaVersion1791310000000 implements MigrationInterface {
  name = 'AddQuizDefinitionSchemaVersion1791310000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_versions" DROP CONSTRAINT "quiz_versions_definition_valid"`,
    );

    await queryRunner.query(
      `ALTER TABLE "quiz_versions" DISABLE TRIGGER "quiz_versions_immutable"`,
    );
    await queryRunner.query(`
      UPDATE "quiz_versions"
      SET "definition" = "definition" || '{"schemaVersion": 1}'::jsonb
      WHERE "definition"->'schemaVersion' IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "quiz_versions" ENABLE TRIGGER "quiz_versions_immutable"`);

    await queryRunner.query(
      `ALTER FUNCTION quiz_definition_is_valid(jsonb) RENAME TO quiz_definition_v1_is_valid`,
    );
    // Never NULL: a CHECK constraint lets NULL through.
    await queryRunner.query(`
      CREATE FUNCTION quiz_definition_is_valid(definition jsonb) RETURNS boolean
      LANGUAGE plpgsql IMMUTABLE AS $$
      BEGIN
        IF jsonb_typeof(definition) IS DISTINCT FROM 'object'
           OR jsonb_typeof(definition->'schemaVersion') IS DISTINCT FROM 'number' THEN
          RETURN false;
        END IF;

        CASE (definition->>'schemaVersion')::numeric
          WHEN 1 THEN RETURN quiz_definition_v1_is_valid(definition);
          ELSE RETURN false;
        END CASE;
      END;
      $$
    `);

    // Adding the constraint checks every existing row, which proves the stamp above.
    await queryRunner.query(`
      ALTER TABLE "quiz_versions"
      ADD CONSTRAINT "quiz_versions_definition_valid" CHECK (quiz_definition_is_valid("definition"))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_versions" DROP CONSTRAINT "quiz_versions_definition_valid"`,
    );
    await queryRunner.query(`DROP FUNCTION quiz_definition_is_valid(jsonb)`);
    await queryRunner.query(
      `ALTER FUNCTION quiz_definition_v1_is_valid(jsonb) RENAME TO quiz_definition_is_valid`,
    );

    await queryRunner.query(
      `ALTER TABLE "quiz_versions" DISABLE TRIGGER "quiz_versions_immutable"`,
    );
    await queryRunner.query(
      `UPDATE "quiz_versions" SET "definition" = "definition" - 'schemaVersion'`,
    );
    await queryRunner.query(`ALTER TABLE "quiz_versions" ENABLE TRIGGER "quiz_versions_immutable"`);

    await queryRunner.query(`
      ALTER TABLE "quiz_versions"
      ADD CONSTRAINT "quiz_versions_definition_valid" CHECK (quiz_definition_is_valid("definition"))
    `);
  }
}
