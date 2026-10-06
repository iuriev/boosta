import type { Gender } from './attempt.js';

export type TraitLevel = 'high' | 'low';

/**
 * Report sections are delivered as typed presentation blocks. The web app
 * renders a block by its `type` and knows nothing about which sections exist,
 * so a new section built from an existing block type needs no frontend change.
 * `key` identifies the section and is stable; use it as a list key, not for logic.
 *
 * A deployed web app can be older than the API, so a renderer must skip a
 * block whose `type` it does not know instead of failing.
 */
interface BlockBase {
  key: string;
  title: string;
}

/** A titled paragraph. `callout` asks for visual emphasis. */
export interface TextBlock extends BlockBase {
  type: 'text';
  text: string;
  variant?: 'callout';
}

/** A titled list of positive statements, each shown with a check mark. */
export interface ChecklistBlock extends BlockBase {
  type: 'checklist';
  intro?: string;
  items: string[];
}

/** A paragraph that leads into a bulleted list, optionally followed by a closing paragraph. */
export interface TextWithBulletsBlock extends BlockBase {
  type: 'text-with-bullets';
  intro: string;
  items: string[];
  outro?: string;
}

/** Questions with answers, shown collapsed. */
export interface FaqBlock extends BlockBase {
  type: 'faq';
  items: { question: string; answer: string }[];
}

export type ReportBlock = TextBlock | ChecklistBlock | TextWithBulletsBlock | FaqBlock;

/** Response of `GET /api/report`: the report for the signed-in user's current attempt. */
export interface Report {
  /** 0 to 100. */
  score: number;
  level: TraitLevel;
  /** Human-readable level, for example "High ADHD Traits". */
  levelLabel: string;
  gender: Gender;
  /** When the attempt behind this report was submitted (ISO 8601). */
  submittedAt: string;
  sections: ReportBlock[];
}
