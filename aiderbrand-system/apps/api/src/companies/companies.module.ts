import { Module } from '@nestjs/common'
import { CompaniesController } from './companies.controller'
import { CompaniesRepository } from './companies.repository'
import { CompaniesService } from './companies.service'
import { AuthContextModule } from '../auth/auth-context.module'
import { AuditModule } from '../audit/audit.module'
import { MembershipsModule } from '../memberships/memberships.module'
import { InvitationsModule } from '../invitations/invitations.module'

@Module({
  imports: [AuthContextModule, AuditModule, MembershipsModule, InvitationsModule],
  controllers: [CompaniesController],
  providers: [CompaniesRepository, CompaniesService],
  exports: [CompaniesService, CompaniesRepository],
})
export class CompaniesModule {}
