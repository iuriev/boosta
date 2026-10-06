import type { Quiz } from '@boosta/contracts';

/** A short quiz: enough questions to have a first, a middle and a last one. */
export const QUIZ: Quiz = {
  versionId: 'version-1',
  version: 1,
  questions: [
    { key: 'focus', text: 'I find it hard to stay focused' },
    { key: 'memory', text: 'I often misplace things' },
    { key: 'time', text: 'I easily lose track of time' },
  ],
  options: [
    { key: 'agree', label: 'Agree' },
    { key: 'neutral', label: 'Neutral' },
    { key: 'disagree', label: 'Disagree' },
  ],
};
