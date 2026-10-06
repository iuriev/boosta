import type { Report } from '@boosta/contracts';
import { HttpStatus, Injectable } from '@nestjs/common';

import type { Attempt } from '../attempts/attempt.entity';
import { AttemptsService } from '../attempts/attempts.service';
import { ApiException } from '../common/api.exception';
import { LEVEL_LABELS } from './content/report-content';
import { REPORT_SECTIONS } from './report-definition';
import { type AttemptView, buildSections, type ReportSection } from './report-engine';
import { scoreAttempt } from './scoring';

@Injectable()
export class ReportService {
  constructor(private readonly attemptsService: AttemptsService) {}

  /**
   * The report for the user's current attempt, computed now from the stored
   * answers by the current report logic. Nothing is cached or persisted, so a
   * change to the logic shows up the next time the report is opened.
   */
  async getForUser(userId: string): Promise<Report> {
    const report = buildReport(await this.attemptsService.findRecentForUser(userId));
    if (!report) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'REPORT_NOT_FOUND',
        'Take the quiz to get your report.',
      );
    }
    return report;
  }
}

/**
 * Builds the report from a user's attempts, most recently submitted first: the
 * first one is the subject of the report, the rest are its history. Returns
 * null when there are no attempts. A pure function of its arguments.
 */
export function buildReport(
  attempts: readonly Attempt[],
  sections: readonly ReportSection[] = REPORT_SECTIONS,
): Report | null {
  const [current, ...earlier] = attempts;
  if (!current) {
    return null;
  }
  const view = toAttemptView(current);
  return {
    score: view.score,
    level: view.level,
    levelLabel: LEVEL_LABELS[view.level],
    gender: view.gender,
    submittedAt: view.submittedAt.toISOString(),
    sections: buildSections(sections, { ...view, previousAttempts: earlier.map(toAttemptView) }),
  };
}

/** Scores an attempt with its own quiz version, which makes attempts from different versions comparable. */
function toAttemptView(attempt: Attempt): AttemptView {
  const { definition } = attempt.quizVersion;
  const { score, level, answers } = scoreAttempt(definition, attempt.answers);
  return {
    gender: attempt.gender,
    score,
    level,
    answers,
    questionKeys: new Set(definition.questions.map((question) => question.key)),
    quizVersion: attempt.quizVersion.version,
    submittedAt: attempt.createdAt,
  };
}
