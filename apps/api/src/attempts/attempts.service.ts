import type { SubmitAttemptRequest, SubmitAttemptResponse } from '@boosta/contracts';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { QuizService } from '../quiz/quiz.service';
import { Attempt } from './attempt.entity';
import { AttemptAnswer } from './attempt-answer.entity';
import { findAnswerProblems } from './attempt-validation';
import { CLAIM_TOKEN_TTL_HOURS, generateClaimToken, hashClaimToken } from './claim-token';

/** How many of a user's attempts a report may look back on. */
export const ATTEMPT_HISTORY_LIMIT = 20;

@Injectable()
export class AttemptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly quizService: QuizService,
    @InjectRepository(Attempt) private readonly attempts: Repository<Attempt>,
  ) {}

  /**
   * Stores a finished quiz. Without a user the attempt is anonymous and the
   * caller receives a claim token; with a user it belongs to them at once.
   */
  async submit(
    request: SubmitAttemptRequest,
    userId: string | null,
  ): Promise<SubmitAttemptResponse> {
    const version = await this.quizService.findVersion(request.quizVersionId);
    if (!version?.isActive) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'QUIZ_VERSION_OUTDATED',
        'This quiz version is no longer available. Reload the quiz and try again.',
      );
    }

    const problems = findAnswerProblems(version.definition, request.answers);
    if (problems.length > 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'ATTEMPT_INVALID', problems);
    }

    const claimToken = userId === null ? generateClaimToken() : null;

    // Attempt and answers are written together or not at all.
    await this.dataSource.transaction(async (manager) => {
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(Attempt)
        .values({
          quizVersionId: version.id,
          gender: request.gender,
          userId,
          claimTokenHash: claimToken === null ? null : hashClaimToken(claimToken),
          // The database clock sets the expiry because the database clock checks it.
          claimExpiresAt:
            claimToken === null
              ? null
              : () => `now() + interval '${String(CLAIM_TOKEN_TTL_HOURS)} hours'`,
        })
        .returning('id')
        .execute();
      const attemptId = (inserted.raw as { id: string }[])[0]?.id;

      await manager.insert(
        AttemptAnswer,
        request.answers.map(({ questionKey, optionKey }) => ({
          attemptId,
          questionKey,
          optionKey,
        })),
      );
    });

    return { claimToken };
  }

  /**
   * Attaches an anonymous attempt to a user. One conditional UPDATE finds the
   * attempt by token hash, checks that it is unowned and unexpired, and
   * consumes the token, so two concurrent claims cannot both succeed. Earlier
   * attempts of the user are left untouched.
   *
   * Pass the caller's `manager` to make the claim part of a larger transaction
   * (for example together with creating the account).
   */
  async claim(
    claimToken: string,
    userId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    const claimed = await manager
      .createQueryBuilder()
      .update(Attempt)
      .set({ userId, claimTokenHash: null, claimExpiresAt: null })
      .where('claim_token_hash = :hash', { hash: hashClaimToken(claimToken) })
      .andWhere('user_id IS NULL')
      .andWhere('claim_expires_at > now()')
      .execute();

    if (claimed.affected !== 1) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'CLAIM_TOKEN_INVALID',
        'This quiz result can no longer be saved. Please take the quiz again.',
      );
    }
  }

  /**
   * A user's most recent attempts with their quiz versions and answers, most
   * recently submitted first. Answers come in no particular order; look them
   * up by question key.
   */
  findRecentForUser(userId: string, limit = ATTEMPT_HISTORY_LIMIT): Promise<Attempt[]> {
    return this.attempts.find({
      where: { userId },
      relations: { answers: true, quizVersion: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }

  /** The attempt the report is built from: the most recently submitted one. */
  async findCurrentForUser(userId: string): Promise<Attempt | null> {
    const [current] = await this.findRecentForUser(userId, 1);
    return current ?? null;
  }
}
