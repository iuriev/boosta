import { getMetadataArgsStorage } from 'typeorm';

import { QuizVersion } from './quiz-version.entity';

describe('QuizVersion.definition', () => {
  const column = getMetadataArgsStorage().columns.find(
    ({ target, propertyName }) => target === QuizVersion && propertyName === 'definition',
  );
  const transformer = column?.options.transformer;
  if (!transformer || Array.isArray(transformer)) {
    throw new Error('The definition column has no transformer');
  }
  const document = {
    schemaVersion: 1,
    questions: [{ key: 'first', text: 'First?' }],
    options: [{ key: 'yes', label: 'Yes', score: 1 }],
    scoring: { highThreshold: 50 },
  };

  it('loads a document of a supported format', () => {
    expect(transformer.from(document)).toBe(document);
  });

  it('fails to load a document of a format this build does not support', () => {
    expect(() => transformer.from({ ...document, schemaVersion: 2 }) as unknown).toThrow(
      /not supported/,
    );
  });

  it('leaves a column that was not selected alone', () => {
    expect(transformer.from(undefined)).toBeUndefined();
  });
});
