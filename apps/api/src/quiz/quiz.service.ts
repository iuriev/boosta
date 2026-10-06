import type { Quiz } from '@boosta/contracts';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QuizVersion } from './quiz-version.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizVersion) private readonly quizVersions: Repository<QuizVersion>,
  ) {}

  /** The version new attempts are taken against. */
  async getActiveVersion(): Promise<QuizVersion> {
    const version = await this.quizVersions.findOneBy({ isActive: true });
    if (!version) {
      // The database allows at most one active version but cannot require one.
      // None means a publishing migration forgot to move the flag: a deployment
      // fault, not a client error.
      throw new InternalServerErrorException('No active quiz version');
    }
    return version;
  }

  async getActiveQuiz(): Promise<Quiz> {
    return toPublicQuiz(await this.getActiveVersion());
  }
}

/** What a visitor may see: scores and the level threshold stay on the server. */
export function toPublicQuiz(version: QuizVersion): Quiz {
  return {
    versionId: version.id,
    version: version.version,
    questions: version.definition.questions.map(({ key, text }) => ({ key, text })),
    options: version.definition.options.map(({ key, label }) => ({ key, label })),
  };
}
