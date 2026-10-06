import type { Gender } from '@boosta/contracts';

/** Runtime list for validation and the database enum; the type lives in the contracts package. */
export const GENDERS = ['male', 'female'] as const satisfies readonly Gender[];
