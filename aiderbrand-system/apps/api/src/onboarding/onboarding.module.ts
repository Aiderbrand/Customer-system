import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OnboardingController } from './onboarding.controller'
import { OnboardingService } from './onboarding.service'
import { OnboardingRepository } from './onboarding.repository'
import { PrismaModule } from '../prisma/prisma.module'
import { InvitationsModule } from '../invitations/invitations.module'
import { ProjectsModule } from '../projects/projects.module'
import { AuditModule } from '../audit/audit.module'
import { AuthContextModule } from '../auth/auth-context.module'
import { AuthModule } from '../auth/auth.module'
import { CompaniesModule } from '../companies/companies.module'
import { UsersModule } from '../users/users.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { PublicRateLimitGuard } from '../common/guards/public-rate-limit.guard'
import { OnboardingFeatureGuard } from './onboarding-feature.guard'

/**
 * OnboardingModule — coordinates the full client onboarding flow.
 *
 * Public endpoints:
 *   POST /onboarding/validate-token  — validate ONBOARDING token, get prefill data
 *   POST /onboarding/complete        — atomic tx: user + membership + submission + project + session
 *
 * Authenticated endpoints:
 *   GET  /onboarding/me/submission   — read own submission
 *   PATCH /onboarding/me/submission  — update own submission (blocked after review)
 *   POST /onboarding/:id/review      — mark reviewed (SYSTEM_ADMIN only, enforced in service)
 *
 * AuthModule imported for AuthService.issueAccessToken — no circular dep:
 *   AuthModule does NOT import OnboardingModule.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthContextModule,
    AuthModule,
    InvitationsModule,
    ProjectsModule,
    CompaniesModule,
    UsersModule,
    MembershipsModule,
    AuditModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRepository, PublicRateLimitGuard, OnboardingFeatureGuard],
})
export class OnboardingModule {}
