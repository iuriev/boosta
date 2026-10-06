import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** The placeholder shipped in .env.example. Public, so never acceptable in production. */
export const EXAMPLE_JWT_SECRET = 'change-me-to-a-long-random-string-0123456789';

/** Reads "true" / "false" from the environment; anything else is left for validation to reject. */
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Environment variables the API needs. Validated once at startup so that a
 * missing or malformed value stops the process instead of failing later.
 */
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must be a postgres:// URL' })
  DATABASE_URL!: string;

  /** Signs session tokens. Anyone who knows it can impersonate any user. */
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET!: string;

  /**
   * Whether the session cookie is marked Secure. Defaults to true in
   * production. Set to false only to run a production build over plain HTTP,
   * as the local docker-compose setup does.
   */
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  COOKIE_SECURE?: boolean;

  /** Whether Swagger UI is served at /api/docs. Defaults to true outside production. */
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  API_DOCS_ENABLED?: boolean;

  /** bcrypt cost factor. Lowered only in tests, where hashing speed does not matter. */
  @Type(() => Number)
  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS = 12;

  /**
   * Express `trust proxy` setting, for example `loopback` or `uniquelocal`.
   * Set it to the network the web server calls from; leave it unset when
   * clients reach the API directly.
   */
  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;

  /**
   * Registration and sign-in requests allowed per minute for one email from one
   * client. A client as a whole may send ten times as many.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_PER_MINUTE = 10;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors.flatMap((error) => Object.values(error.constraints ?? {})).join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  if (env.NODE_ENV === NodeEnv.Production && env.JWT_SECRET === EXAMPLE_JWT_SECRET) {
    throw new Error('Invalid environment: JWT_SECRET is the value from .env.example');
  }
  return env;
}
