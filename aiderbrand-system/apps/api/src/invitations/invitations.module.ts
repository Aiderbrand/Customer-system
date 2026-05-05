import { Module, forwardRef } from '@nestjs/common'
import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'
import { InvitationsRepository } from './invitations.repository'
import { InvitationsMailListener } from './listeners/invitations-mail.listener'

import { MembershipsModule } from '../memberships/memberships.module'
import { AuditModule } from '../audit/audit.module'
import { MailModule } from '../mail/mail.module'
import { PublicRateLimitGuard } from '../common/guards/public-rate-limit.guard'
import { AuthContextModule } from '../auth/auth-context.module'
import { CompaniesModule } from '../companies/companies.module'
import { UsersModule } from '../users/users.module'

/**
 * InvitationsModule — invitation lifecycle management.
 *
 * Provides: InvitationsService, InvitationsRepository
 * Exports: InvitationsService (consumed by AuthModule for accept-invitation)
 *
 * Imports:
 * - MembershipsModule: for role validation and membership creation
 * - AuditModule: for audit logging
 *
 * Note: AuthModule is NOT imported here to avoid circular dependency.
 * The accept-invitation flow is implemented in AuthService (which imports InvitationsModule).
 */
@Module({
  imports: [
    MembershipsModule,
    forwardRef(() => CompaniesModule),
    UsersModule,
    AuditModule,
    MailModule,
    AuthContextModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsRepository, InvitationsMailListener, PublicRateLimitGuard],
  exports: [InvitationsService, InvitationsRepository],
})
export class InvitationsModule {}
