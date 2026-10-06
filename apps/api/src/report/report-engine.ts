import type { Gender, ReportBlock, TraitLevel } from '@boosta/contracts';
import { Logger } from '@nestjs/common';

import type { ScoredAnswer } from './scoring';

/** One attempt as a report section sees it: scored with its own quiz version. */
export interface AttemptView {
  gender: Gender;
  score: number;
  level: TraitLevel;
  /** By question key. A question the attempt's quiz version did not have is absent. */
  answers: ReadonlyMap<string, ScoredAnswer>;
  /** Question keys of the quiz version the attempt was taken against. */
  questionKeys: ReadonlySet<string>;
  /** Number of that quiz version. */
  quizVersion: number;
  submittedAt: Date;
}

/** Everything a section may use. Sections depend on nothing else. */
export interface ReportContext extends AttemptView {
  /**
   * The user's earlier attempts, most recent first. Empty for a first attempt.
   * Only the most recent ones are loaded (see ATTEMPT_HISTORY_LIMIT), so the
   * last element is not necessarily the user's very first attempt.
   */
  previousAttempts: readonly AttemptView[];
}

/** A block as a section returns it; the engine adds the section's key. */
export type ReportBlockContent = ReportBlock extends infer Block
  ? Block extends ReportBlock
    ? Omit<Block, 'key'>
    : never
  : never;

/**
 * One section of the report.
 *
 * - `requires` lists the question keys the section reads from the current
 *   attempt. If that attempt's quiz version lacks any of them, the section is
 *   left out. A question key stands for a meaning, but its answer scale may
 *   differ between versions: compare `score / maxScore`, not raw values.
 * - `build` returns the block to show, or `null` when the section does not
 *   apply (for example a comparison with a previous attempt that does not
 *   exist). When reading `previousAttempts`, check their `questionKeys`:
 *   `requires` covers only the current attempt.
 */
export interface ReportSection {
  key: string;
  requires?: readonly string[];
  build(context: ReportContext): ReportBlockContent | null;
}

const logger = new Logger('ReportEngine');

/**
 * Builds the sections of a report, in order. A section that cannot be built
 * for this attempt is skipped, and so is one that fails: a defect in a single
 * section must not take the whole report away from the user.
 */
export function buildSections(
  sections: readonly ReportSection[],
  context: ReportContext,
): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  for (const section of sections) {
    const hasRequiredAnswers = (section.requires ?? []).every((questionKey) =>
      context.questionKeys.has(questionKey),
    );
    if (!hasRequiredAnswers) {
      continue;
    }
    try {
      const content = section.build(context);
      if (content !== null) {
        blocks.push({ ...content, key: section.key });
      }
    } catch (error) {
      logger.error(
        `Section "${section.key}" failed and was left out of the report`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
  return blocks;
}
