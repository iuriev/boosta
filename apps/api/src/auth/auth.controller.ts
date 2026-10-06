import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';

import { type Env, NodeEnv } from '../config/env';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthResponseDto, LoginDto, MeResponseDto, RegisterDto } from './dto/credentials.dto';
import { Public } from './public.decorator';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, type SessionUser } from './session';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        config.get('COOKIE_SECURE', { infer: true }) ??
        config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
      path: '/',
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  @ApiOperation({
    summary:
      'Create an account, optionally attaching a finished quiz, and start a session. ' +
      'With an existing email and its correct password this signs in instead.',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      beforeQuiz: {
        summary: 'Without a quiz result',
        value: { email: 'user@example.com', password: 'password123' },
      },
      afterQuiz: {
        summary: 'With the claim token returned by POST /api/attempts',
        value: {
          email: 'user@example.com',
          password: 'password123',
          claimToken: '<claimToken from POST /api/attempts>',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Account created' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Signed in to the existing account' })
  @ApiConflictResponse({ description: 'The email is registered and the password does not match' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; try again in a minute' })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(body);
    this.startSession(response, result.sessionToken);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.body;
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in, optionally attaching a finished quiz, and start a session.' })
  @ApiBody({
    type: LoginDto,
    examples: {
      signIn: {
        summary: 'Sign in',
        value: { email: 'user@example.com', password: 'password123' },
      },
      signInAfterQuiz: {
        summary: 'Sign in and attach a quiz finished while signed out',
        value: {
          email: 'user@example.com',
          password: 'password123',
          claimToken: '<claimToken from POST /api/attempts>',
        },
      },
    },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unknown email or wrong password' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; try again in a minute' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(body);
    this.startSession(response, result.sessionToken);
    return result.body;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the session by clearing the cookie.' })
  @ApiNoContentResponse()
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'The signed-in user.' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'No valid session' })
  me(@CurrentUser() user: SessionUser): Promise<MeResponseDto> {
    return this.authService.getMe(user.id);
  }

  private startSession(response: Response, sessionToken: string): void {
    response.cookie(SESSION_COOKIE, sessionToken, {
      ...this.cookieOptions,
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
  }
}
