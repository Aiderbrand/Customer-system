import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { MailService } from '../../mail/mail.service'
import { AuditService } from '../../audit/audit.service'
import { InvitationCreatedEvent } from '../events/invitation-created.event'

@Injectable()
export class InvitationsMailListener {
  private readonly logger = new Logger(InvitationsMailListener.name)

  constructor(
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  @OnEvent('invitation.created')
  async handleInvitationCreated(event: InvitationCreatedEvent): Promise<void> {
    let delivery: Awaited<ReturnType<MailService['sendInvitationEmail']>>

    try {
      if (event.invitationType === 'ONBOARDING') {
        delivery = await this.mailService.sendOnboardingInvitationEmail(
          event.email,
          event.inviteUrl,
          event.companyName,
        )
      } else {
        delivery = await this.mailService.sendInvitationEmail({
          to: event.email,
          companyName: event.companyName,
          inviterName: event.inviterName,
          roleLabel: event.roleLabel,
          inviteUrl: event.inviteUrl,
        })
      }
    } catch (err) {
      this.logger.error(`Failed to send invitation email to ${event.email}`, err)
      return
    }

    this.auditService
      .logSafe({
        actorId: event.actorId,
        companyId: event.companyId,
        action: delivery.sent ? 'invitation.email_sent' : 'invitation.email_failed',
        entityType: 'Invitation',
        entityId: event.invitationId,
        metadata: {
          email: event.email,
          role: event.role,
          reason: delivery.reason,
          attempted: delivery.attempted,
          errorMessage: delivery.errorMessage ?? null,
        },
      })
      .catch((err) => this.logger.error('Audit log failed on invitation email delivery', err))
  }
}
