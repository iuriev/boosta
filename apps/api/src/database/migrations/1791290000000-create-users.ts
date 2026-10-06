import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1791290000000 implements MigrationInterface {
  name = 'CreateUsers1791290000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // citext makes the unique constraint on email case-insensitive.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" citext NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // No cascade: a user's attempts are never removed as a side effect.
    await queryRunner.query(`
      ALTER TABLE "attempts"
      ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "attempts_user_id_fkey"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
