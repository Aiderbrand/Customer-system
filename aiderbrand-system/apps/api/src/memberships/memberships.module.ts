import { Module } from '@nestjs/common'
import { MembershipsRepository } from './memberships.repository'
import { MembershipsController } from './memberships.controller'
import { MembershipsService } from './memberships.service'
import { AuditModule } from '../audit/audit.module'
import { AuthContextModule } from '../auth/auth-context.module'

@Module({
  imports: [AuditModule, AuthContextModule],
  controllers: [MembershipsController],
  providers: [MembershipsRepository, MembershipsService],
  exports: [MembershipsService, MembershipsRepository],
})
export class MembershipsModule {}
