import { EXAMPLE_JWT_SECRET, NodeEnv, validateEnv } from './env';

describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
  };

  it('applies defaults and converts numeric strings', () => {
    const env = validateEnv({ ...valid, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
  });

  it('rejects a missing database URL', () => {
    expect(() => validateEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('rejects a database URL for another engine', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects a missing or short session secret', () => {
    expect(() => validateEnv({ DATABASE_URL: valid.DATABASE_URL })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('rejects the example session secret in production only', () => {
    const withExample = { ...valid, JWT_SECRET: EXAMPLE_JWT_SECRET };

    expect(() => validateEnv({ ...withExample, NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(validateEnv(withExample).JWT_SECRET).toBe(EXAMPLE_JWT_SECRET);
  });

  it('reads boolean switches and rejects anything that is not true or false', () => {
    const env = validateEnv({ ...valid, COOKIE_SECURE: 'false', API_DOCS_ENABLED: 'true' });

    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.API_DOCS_ENABLED).toBe(true);
    expect(validateEnv(valid).COOKIE_SECURE).toBeUndefined();
    expect(() => validateEnv({ ...valid, COOKIE_SECURE: 'yes' })).toThrow(/COOKIE_SECURE/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
