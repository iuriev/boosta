import type { AuthResponse, CredentialsRequest, MeResponse } from '@boosta/contracts';
import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { DataSource } from 'typeorm';

import { AttemptsService } from '../attempts/attempts.service';
import { ApiException } from '../common/api.exception';
import type { Env } from '../config/env';
import { User } from '../users/user.entity';
import type { SessionPayload } from './session';

export interface AuthResult {
  body: AuthResponse;
  sessionToken: string;
  /** False when registration signed in to an existing account instead of creating one. */
  created: boolean;
}

/** Unique violation: another request created the same email first. */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;
  /** Compared against when the email is unknown, so both failures cost one bcrypt comparison. */
  private readonly decoyHash: Promise<string>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly attemptsService: AttemptsService,
    config: ConfigService<Env, true>,
  ) {
    this.bcryptRounds = config.get('BCRYPT_ROUNDS', { infer: true });
    this.decoyHash = hash('decoy-password-never-matches', this.bcryptRounds);
  }

  /**
   * Creates an account and attaches the claimed attempt, atomically: an invalid
   * claim token leaves no account behind.
   *
   * If the email already has an account and the password matches it, the user
   * is signed in instead. This is a deliberate shortcut for this project; see
   * the README for why it is not the right design for a real product.
   */
  async register(request: CredentialsRequest): Promise<AuthResult> {
    const existing = await this.findUserWithPassword(request.email);
    if (existing) {
      return this.signInToExisting(existing, request);
    }

    const passwordHash = await hash(request.password, this.bcryptRounds);
    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const created = await manager.save(
          manager.create(User, { email: request.email, passwordHash }),
        );
        if (request.claimToken !== undefined) {
          await this.attemptsService.claim(request.claimToken, created.id, manager);
        }
        return created;
      });
      return await this.buildResult(user, request.claimToken !== undefined, true);
    } catch (error) {
      // Another request registered the same email between the lookup and the
      // insert (a double submit, typically). Treat it as the existing-account case.
      const winner = isUniqueViolation(error)
        ? await this.findUserWithPassword(request.email)
        : null;
      if (winner) {
        return this.signInToExisting(winner, request);
      }
      throw error;
    }
  }

  private async signInToExisting(user: User, request: CredentialsRequest): Promise<AuthResult> {
    if (!(await compare(request.password, user.passwordHash))) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists. Sign in instead.',
      );
    }
    return this.signIn(user, request.claimToken);
  }

  async login(request: CredentialsRequest): Promise<AuthResult> {
    const user = await this.findUserWithPassword(request.email);
    const passwordMatches = await compare(
      request.password,
      user?.passwordHash ?? (await this.decoyHash),
    );
    if (!user || !passwordMatches) {
      // The same response for an unknown email and a wrong password.
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Invalid email or password.',
      );
    }
    return this.signIn(user, request.claimToken);
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) {
      // A valid token for an account that no longer exists.
      throw new UnauthorizedException('Sign in to continue');
    }
    return {
      user: { id: user.id, email: user.email },
      hasAttempt: await this.attemptsService.hasAttempt(user.id),
    };
  }

  /**
   * Signing in never fails because of the claim token: a stale token means the
   * anonymous result is lost, not that the user is locked out.
   */
  private async signIn(user: User, claimToken: string | undefined): Promise<AuthResult> {
    const attemptClaimed = claimToken !== undefined && (await this.tryClaim(claimToken, user.id));
    return this.buildResult(user, attemptClaimed, false);
  }

  private async tryClaim(claimToken: string, userId: string): Promise<boolean> {
    try {
      await this.attemptsService.claim(claimToken, userId);
      return true;
    } catch (error) {
      if (error instanceof ApiException) {
        return false;
      }
      throw error;
    }
  }

  private async buildResult(
    user: User,
    attemptClaimed: boolean,
    created: boolean,
  ): Promise<AuthResult> {
    const payload: SessionPayload = { sub: user.id };
    return {
      body: {
        user: { id: user.id, email: user.email },
        hasAttempt: await this.attemptsService.hasAttempt(user.id),
        attemptClaimed,
      },
      sessionToken: await this.jwtService.signAsync(payload),
      created,
    };
  }

  private findUserWithPassword(email: string): Promise<User | null> {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === PG_UNIQUE_VIOLATION
  );
}
