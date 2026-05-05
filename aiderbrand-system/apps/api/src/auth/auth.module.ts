import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AuthController } from './auth.controller'
import { UsersController } from './users.controller'
import { AuthService } from './auth.service'
import { AuthMailListener } from './listeners/auth-mail.listener'
import { RefreshTokenRepository } from './refresh-token.repository'
import { PasswordResetRepository } from './password-reset.repository'
import { RoleSimulationRepository } from './role-simulation.repository'
import { JwtStrategy } from './strategies/jwt.strategy'
import { RefreshGuard } from './guards/refresh.guard'
import { PublicRateLimitGuard } from '../common/guards/public-rate-limit.guard'
import { AuthContextModule } from './auth-context.module'

import { UsersModule } from '../users/users.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { CompaniesModule } from '../companies/companies.module'
import { AuditModule } from '../audit/audit.module'
import { InvitationsModule } from '../invitations/invitations.module'
import { MailModule } from '../mail/mail.module'
import { PrismaModule } from '../prisma/prisma.module'

/**
 * AuthModule — authentication session flows.
 *
 * Provides: AuthService, JwtStrategy, RefreshGuard, RefreshTokenRepository
 * Exports: AuthService
 *
 * Imports InvitationsModule for the accept-invitation atomic transaction.
 * Imports PrismaModule for direct $transaction access in acceptInvitation.
 *
 * JwtModule is registered with async config so it reads from ConfigService.
 * The access token secret is set here; each strategy reads its own secret.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule with async config — reads JWT_ACCESS_SECRET from ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.accessSecret') ?? 'CHANGE_ME_ACCESS',
        // Note: expiresIn is set per-call in AuthService.issueAccessToken()
        // to keep flexibility; no global default here.
        signOptions: {},
      }),
    }),

    // Domain modules
    UsersModule,
    MembershipsModule,
    CompaniesModule,
    AuditModule,
    MailModule,

    // For accept-invitation atomic transaction
    InvitationsModule,
    PrismaModule,
    AuthContextModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    AuthMailListener,
    RefreshTokenRepository,
    PasswordResetRepository,
    RoleSimulationRepository,
    JwtStrategy,
    RefreshGuard,
    PublicRateLimitGuard,
  ],
  exports: [AuthService, RefreshTokenRepository],
})
export class AuthModule {}
