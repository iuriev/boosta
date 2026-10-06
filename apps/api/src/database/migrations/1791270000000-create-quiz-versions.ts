import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizVersions1791270000000 implements MigrationInterface {
  name = 'CreateQuizVersions1791270000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "quiz_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "version" integer NOT NULL UNIQUE,
        "is_active" boolean NOT NULL DEFAULT false,
        "definition" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // At most one active version, enforced by the database.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "quiz_versions_single_active"
      ON "quiz_versions" ("is_active") WHERE "is_active"
    `);

    // A published version is immutable: only its active flag may change.
    await queryRunner.query(`
      CREATE FUNCTION quiz_versions_prevent_content_change() RETURNS trigger AS $$
      BEGIN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.version IS DISTINCT FROM OLD.version
           OR NEW.definition IS DISTINCT FROM OLD.definition
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
          RAISE EXCEPTION 'quiz version % is immutable; publish a new version instead', OLD.version
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "quiz_versions_immutable"
      BEFORE UPDATE ON "quiz_versions"
      FOR EACH ROW EXECUTE FUNCTION quiz_versions_prevent_content_change()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quiz_versions"`);
    await queryRunner.query(`DROP FUNCTION quiz_versions_prevent_content_change()`);
  }
}
