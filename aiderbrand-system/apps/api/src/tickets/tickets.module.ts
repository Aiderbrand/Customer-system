import { Module } from '@nestjs/common'
import { AuthContextModule } from '../auth/auth-context.module'
import { AuditModule } from '../audit/audit.module'
import { UsersModule } from '../users/users.module'
import { TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'
import { TicketsRepository } from './tickets.repository'

@Module({
  imports: [AuthContextModule, AuditModule, UsersModule],
  controllers: [TicketsController],
  providers: [TicketsRepository, TicketsService],
  exports: [TicketsService, TicketsRepository],
})
export class TicketsModule {}
