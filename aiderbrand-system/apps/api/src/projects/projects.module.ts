import { Module } from '@nestjs/common'
import { AuthContextModule } from '../auth/auth-context.module'
import { AuditModule } from '../audit/audit.module'
import { UsersModule } from '../users/users.module'
import { TicketsModule } from '../tickets/tickets.module'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { ProjectsRepository } from './projects.repository'

@Module({
  imports: [AuthContextModule, AuditModule, UsersModule, TicketsModule],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
