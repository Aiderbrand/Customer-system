import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { AuthContextGuard } from '../common/guards/company-membership.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RoleSimulationRepository } from './role-simulation.repository'

@Module({
  imports: [AuditModule],
  providers: [AuthContextGuard, RolesGuard, RoleSimulationRepository],
  exports: [AuthContextGuard, RolesGuard, RoleSimulationRepository],
})
export class AuthContextModule {}
