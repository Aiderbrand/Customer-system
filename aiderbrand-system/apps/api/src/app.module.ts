import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuditModule } from './audit/audit.module'
import { CompaniesModule } from './companies/companies.module'
import { MembershipsModule } from './memberships/memberships.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { InvitationsModule } from './invitations/invitations.module'
import { ProjectsModule } from './projects/projects.module'
import { TicketsModule } from './tickets/tickets.module'
import { MailModule } from './mail/mail.module'
import { OnboardingModule } from './onboarding/onboarding.module'
import appConfig from './config/app.config'

@Module({
  imports: [
    // ─── Config (global, loads .env) ────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Event bus (global, for event-driven notifications) ─────────────────
    EventEmitterModule.forRoot({ global: true }),

    // ─── Database ────────────────────────────────────────────────────────────
    PrismaModule,

    // ─── Domain modules ──────────────────────────────────────────────────────
    AuditModule,
    MailModule,
    CompaniesModule,
    MembershipsModule,
    UsersModule,

    // ─── Feature modules ─────────────────────────────────────────────────────
    AuthModule,
    InvitationsModule,
    ProjectsModule,
    TicketsModule,
    OnboardingModule,
  ],
})
export class AppModule {}
