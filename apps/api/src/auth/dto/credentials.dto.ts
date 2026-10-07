import type { AuthResponse, AuthUser, CredentialsRequest, MeResponse } from '@boosta/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
/** Bounds the work of a sign-in request; no stored password is this long. */
export const LOGIN_PASSWORD_MAX_LENGTH = 1024;

/**
 * bcrypt reads only the first 72 bytes of its input. A longer password would
 * be silently truncated, so it is rejected instead; the limit is in bytes
 * because a character may take more than one.
 */
function MaxBytes(max: number, options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'maxBytes',
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} must be at most ${String(max)} bytes long`, ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value) <= max,
      },
    });
  };
}

/** Clients often send null or an empty string for "no token"; both mean the field is absent. */
const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  value === null || value === '' ? undefined : value;

/** The one spelling of an email: what is stored, looked up and rate-limited. */
export const normalizeEmail = (email: string): string =>
  email.normalize('NFC').trim().toLowerCase();

const normalizeEmailField = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? normalizeEmail(value) : value;

/**
 * Sign-in does not repeat the registration rules, so that an old or odd
 * password gets a plain "invalid credentials"; it only bounds the size.
 */
export class LoginDto implements CredentialsRequest {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(normalizeEmailField)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'correct horse battery' })
  @IsString()
  @MinLength(1)
  @MaxLength(LOGIN_PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Optional. The claim token returned by POST /api/attempts for a quiz finished while ' +
      'signed out; it attaches that result to the account. Omit the field otherwise.',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  claimToken?: string;
}

export class RegisterDto implements CredentialsRequest {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(normalizeEmailField)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @MaxBytes(PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Optional. The claim token returned by POST /api/attempts for a quiz finished while ' +
      'signed out; it attaches that result to the new account. Omit the field to register ' +
      'before taking the quiz.',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  claimToken?: string;
}

export class AuthUserDto implements AuthUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ description: 'Whether the account has an attempt, that is, a report to show' })
  hasAttempt!: boolean;

  @ApiProperty({ description: 'Whether the claim token sent with the request attached an attempt' })
  attemptClaimed!: boolean;
}

export class MeResponseDto implements MeResponse {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty()
  hasAttempt!: boolean;
}
