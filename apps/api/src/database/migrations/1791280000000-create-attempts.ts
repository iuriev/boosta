import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttempts1791280000000 implements MigrationInterface {
  name = 'CreateAttempts1791280000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "attempt_gender" AS ENUM ('male', 'female')`);

    // The foreign key to quiz_versions has no cascade: a version that has
    // attempts cannot be deleted or re-keyed.
    // user_id gets its foreign key when the users table is created.
    await queryRunner.query(`
      CREATE TABLE "attempts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "quiz_version_id" uuid NOT NULL REFERENCES "quiz_versions" ("id"),
        "gender" "attempt_gender" NOT NULL,
        "user_id" uuid,
        "claim_token_hash" text UNIQUE,
        "claim_expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "attempts_owned_or_claimable" CHECK (
          ("user_id" IS NOT NULL AND "claim_token_hash" IS NULL AND "claim_expires_at" IS NULL)
          OR
          ("user_id" IS NULL AND "claim_token_hash" IS NOT NULL AND "claim_expires_at" IS NOT NULL)
        )
      )
    `);

    // Finds a user's current (most recently submitted) attempt. Anonymous
    // attempts are never looked up this way, so they stay out of the index.
    await queryRunner.query(`
      CREATE INDEX "attempts_user_created_at"
      ON "attempts" ("user_id", "created_at" DESC) WHERE "user_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "attempt_answers" (
        "attempt_id" uuid NOT NULL REFERENCES "attempts" ("id") ON DELETE CASCADE,
        "question_key" text NOT NULL,
        "option_key" text NOT NULL,
        PRIMARY KEY ("attempt_id", "question_key")
      )
    `);

    // What a user answered is a historical fact: it is never edited.
    await queryRunner.query(`
      CREATE FUNCTION attempt_answers_prevent_update() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'attempt answers are immutable'
          USING ERRCODE = 'restrict_violation';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "attempt_answers_immutable"
      BEFORE UPDATE ON "attempt_answers"
      FOR EACH ROW EXECUTE FUNCTION attempt_answers_prevent_update()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attempt_answers"`);
    await queryRunner.query(`DROP FUNCTION attempt_answers_prevent_update()`);
    await queryRunner.query(`DROP TABLE "attempts"`);
    await queryRunner.query(`DROP TYPE "attempt_gender"`);
  }
}
