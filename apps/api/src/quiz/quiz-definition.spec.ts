import { readQuizDefinition } from './quiz-definition';

describe('readQuizDefinition', () => {
  const document = {
    schemaVersion: 1,
    questions: [{ key: 'first', text: 'First?' }],
    options: [{ key: 'yes', label: 'Yes', score: 1 }],
    scoring: { highThreshold: 50 },
  };

  it('returns a document of a known format unchanged', () => {
    expect(readQuizDefinition(document)).toBe(document);
  });

  it.each([
    ['a newer format', 2],
    ['no format number', undefined],
    ['a format number of the wrong type', '1'],
  ])('refuses a document with %s instead of misreading it', (_name, schemaVersion) => {
    expect(() => readQuizDefinition({ ...document, schemaVersion })).toThrow(/not supported/);
  });
});
