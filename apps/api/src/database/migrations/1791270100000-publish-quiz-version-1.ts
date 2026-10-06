import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The default quiz from the design. It doubles as the seed: migrations run when
 * the API starts, so a fresh database can serve the quiz immediately.
 *
 * To change the quiz, add a migration that inserts a new version and moves the
 * active flag; never edit this one. For the same reason the document is not
 * typed with the application's `QuizDefinition`: that type may evolve, this
 * migration must keep compiling unchanged.
 */
const definition = {
  questions: [
    { key: 'lose_track_of_time', text: 'I easily lose track of time when doing something I enjoy' },
    { key: 'misplace_things', text: 'I often misplace things like my phone, keys, or wallet' },
    {
      key: 'struggle_to_finish_tasks',
      text: 'I frequently start tasks but struggle to finish them',
    },
    {
      key: 'hard_to_stay_focused',
      text: 'I find it hard to stay focused during conversations or meetings',
    },
    {
      key: 'forget_daily_tasks',
      text: 'I often forget about daily tasks like appointments or returning calls',
    },
  ],
  options: [
    { key: 'strongly_agree', label: 'Strongly agree', score: 4 },
    { key: 'agree', label: 'Agree', score: 3 },
    { key: 'neutral', label: 'Neutral', score: 2 },
    { key: 'disagree', label: 'Disagree', score: 1 },
    { key: 'strongly_disagree', label: 'Strongly disagree', score: 0 },
  ],
  scoring: { highThreshold: 60 },
};

export class PublishQuizVersion11791270100000 implements MigrationInterface {
  name = 'PublishQuizVersion11791270100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "quiz_versions" ("version", "is_active", "definition") VALUES (1, true, $1)`,
      [JSON.stringify(definition)],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "quiz_versions" WHERE "version" = 1`);
  }
}
