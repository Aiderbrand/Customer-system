import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { AcceptInvitationDto } from './dto/accept-invitation.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { StartRoleSimulationDto } from './dto/start-role-simulation.dto'
import { RefreshGuard, type RequestWithRefreshContext } from './guards/refresh.guard'
import { ConfigService } from '@nestjs/config'
import type { LoginResponseDto, SessionResponseDto } from './dto/auth-response.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { JwtPayload } from '../common/types/jwt-payload.type'
import { PublicRateLimit } from '../common/decorators/public-rate-limit.decorator'
import { PublicRateLimitGuard } from '../common/guards/public-rate-limit.guard'

/**
 * AuthController — public auth endpoints.
 *
 * POST /auth/login    → credentials → accessToken (body) + refresh cookie
 * POST /auth/refresh  → refresh cookie → new accessToken + new refresh cookie
 * POST /auth/logout   → refresh cookie → revoke + clear cookie
 *
 * No global guard on this controller — routes are intentionally public.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /auth/login
   *
   * Validates email + password, issues:
   * - accessToken (JWT, 15m) in response body
   * - refresh token (opaque, 7d) in httpOnly secure cookie
   * - memberships[] in response body
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 5, windowMs: 60_000, keyPrefix: 'auth.login' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { response, rawRefreshToken } = await this.authService.login(dto.email, dto.password)

    this.setRefreshCookie(res, rawRefreshToken)

    return response
  }

  /**
   * POST /auth/refresh
   *
   * Requires a valid refresh token in the httpOnly cookie.
   * Rotates: old token is revoked, new pair is issued.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshGuard)
  async refresh(
    @Req() req: RequestWithRefreshContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    if (!req.refreshAuth?.rawToken || !req.refreshAuth.tokenRecord) {
      throw new UnauthorizedException('Refresh token missing')
    }

    const { accessToken, rawRefreshToken } = await this.authService.refresh(
      req.refreshAuth.tokenRecord.userId,
      req.refreshAuth.rawToken,
      req.refreshAuth.tokenRecord.id,
    )

    this.setRefreshCookie(res, rawRefreshToken)

    return { accessToken }
  }

  /**
   * POST /auth/logout
   *
   * Requires a valid refresh token in the httpOnly cookie.
   * Revokes the token and clears the cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RefreshGuard)
  async logout(
    @Req() req: RequestWithRefreshContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!req.refreshAuth?.rawToken || !req.refreshAuth.tokenRecord) {
      // If no cookie, just clear it silently (idempotent logout)
      this.clearRefreshCookie(res)
      return
    }

    await this.authService.logout(req.refreshAuth.tokenRecord.id, req.refreshAuth.tokenRecord.userId)

    this.clearRefreshCookie(res)
  }

  /**
   * POST /auth/accept-invitation
   *
   * Public endpoint — no JWT required.
   *
   * Accepts an invitation token + name + password, atomically:
   * - Creates or updates the user account
   * - Attaches the company membership
   * - Marks the invitation as ACCEPTED
   * - Returns the same shape as /auth/login (auto-login)
   */
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: 'auth.accept-invitation' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { response, rawRefreshToken } = await this.authService.acceptInvitation({
      rawToken: dto.token,
      name: dto.name,
      password: dto.password,
    })

    this.setRefreshCookie(res, rawRefreshToken)

    return response
  }

  /**
   * POST /auth/forgot-password
   *
   * Public endpoint — no JWT required.
   *
   * Initiates a password reset flow for the given email.
   *
   * Security: ALWAYS returns 200 with a generic message, regardless of whether
   * the email exists in the system. This prevents user enumeration (email oracle attacks).
   *
   * In production, an email would be sent asynchronously.
   * For development/testing, the response includes the raw token only when NODE_ENV !== 'production'.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: 'auth.forgot-password' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email)

    // Always return the same generic message — oracle prevention
    return {
      message: 'If the email is registered, a password reset link has been sent.',
    }
  }

  /**
   * POST /auth/reset-password
   *
   * Public endpoint — no JWT required.
   *
   * Resets the user's password using a valid opaque reset token.
   *
   * On success:
   * - Password is updated (bcrypt, 10 rounds)
   * - The reset token is marked as used (one-time use)
   * - ALL active refresh tokens for the user are revoked (all sessions invalidated)
   * - Audit log: 'password.reset'
   *
   * Returns 400 if the token is invalid, expired, or already used.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: 'auth.reset-password' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.password)

    // Clear any existing refresh cookie — all sessions were revoked server-side
    this.clearRefreshCookie(res)

    return { message: 'Password has been reset successfully. Please log in again.' }
  }

  @Get('session')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getSession(@CurrentUser() currentUser: JwtPayload): Promise<SessionResponseDto> {
    return this.authService.getSession(currentUser.sub)
  }

  @Post('simulation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async startRoleSimulation(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: StartRoleSimulationDto,
  ): Promise<SessionResponseDto> {
    return this.authService.startRoleSimulation(currentUser.sub, dto)
  }

  @Delete('simulation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async stopRoleSimulation(@CurrentUser() currentUser: JwtPayload): Promise<SessionResponseDto> {
    return this.authService.stopRoleSimulation(currentUser.sub)
  }

  @Post('register')
  @HttpCode(HttpStatus.FORBIDDEN)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 5, windowMs: 60_000, keyPrefix: 'auth.register-disabled' })
  registerDisabled(): never {
    throw new ForbiddenException('Self-registration is disabled. Use an invitation instead.')
  }

  // ─── Private cookie helpers ─────────────────────────────────────────────────

  private setRefreshCookie(res: Response, rawToken: string): void {
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production'
    const expiresInDays = 7 // mirrors AuthService resolveRefreshExpiryDays()

    res.cookie('refresh_token', rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth', // scoped — only sent to auth endpoints
      maxAge: expiresInDays * 24 * 60 * 60 * 1000, // ms
    })
  }

  private clearRefreshCookie(res: Response): void {
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production'

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
    })
  }
}
