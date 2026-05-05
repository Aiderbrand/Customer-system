import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { OnboardingService } from './onboarding.service'
import { OnboardingFeatureGuard } from './onboarding-feature.guard'
import { ValidateOnboardingTokenDto } from './dto/validate-onboarding-token.dto'
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto'
import { UpdateOnboardingSubmissionDto } from './dto/update-onboarding-submission.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { PublicRateLimitGuard } from '../common/guards/public-rate-limit.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { PublicRateLimit } from '../common/decorators/public-rate-limit.decorator'
import { RequireRoles } from '../common/decorators/require-roles.decorator'
import { AllowInternalCrossCompany } from '../common/decorators/allow-internal-cross-company.decorator'
import { Role } from '../common/enums/role.enum'
import type { JwtPayload } from '../common/types/jwt-payload.type'
import type { OnboardingTokenResponse } from './onboarding.service'
import type { OnboardingSubmission } from '@prisma/client'

@Controller('onboarding')
@UseGuards(OnboardingFeatureGuard)
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly configService: ConfigService,
  ) {}

  // ── Public endpoints (token-gated, rate-limited) ───────────────────────────

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 10, windowMs: 5 * 60_000, keyPrefix: 'onboarding.validate-token' })
  async validateToken(
    @Body() dto: ValidateOnboardingTokenDto,
  ): Promise<OnboardingTokenResponse> {
    return this.onboardingService.validateToken(dto.token)
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PublicRateLimitGuard)
  @PublicRateLimit({ limit: 5, windowMs: 15 * 60_000, keyPrefix: 'onboarding.complete' })
  async complete(
    @Body() dto: CompleteOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; projectName: string }> {
    const result = await this.onboardingService.complete(dto)
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production'
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    return { accessToken: result.accessToken, projectName: result.projectName }
  }

  // ── Authenticated endpoints ────────────────────────────────────────────────

  @Get('me/submission')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getSubmission(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<OnboardingSubmission> {
    return this.onboardingService.getSubmissionByUser(currentUser.sub)
  }

  @Patch('me/submission')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateSubmission(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateOnboardingSubmissionDto,
  ): Promise<OnboardingSubmission> {
    return this.onboardingService.updateSubmissionByUser(currentUser.sub, dto)
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AuthContextGuard, RolesGuard)
  @RequireRoles(Role.SYSTEM_ADMIN)
  @AllowInternalCrossCompany()
  async markReviewed(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<OnboardingSubmission> {
    return this.onboardingService.markReviewed(id, currentUser.sub)
  }
}
