import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { MailService } from '../../mail/mail.service'
import { AuditService } from '../../audit/audit.service'
import { PasswordResetRequestedEvent } from '../events/password-reset-requested.event'

@Injectable()
export class AuthMailListener {
  private readonly logger = new Logger(AuthMailListener.name)

  constructor(
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  @OnEvent('password.reset.requested')
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    let delivery: Awaited<ReturnType<MailService['sendPasswordResetEmail']>>

    try {
      delivery = await this.mailService.sendPasswordResetEmail({
        to: event.email,
        userName: event.userName,
        resetUrl: event.resetUrl,
      })
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${event.email}`, err)
      return
    }

    this.auditService
      .logSafe({
        actorId: event.userId,
        action: delivery.sent ? 'password_reset.email_sent' : 'password_reset.email_failed',
        entityType: 'User',
        entityId: event.userId,
        metadata: {
          email: event.email,
          reason: delivery.reason,
          attempted: delivery.attempted,
          errorMessage: delivery.errorMessage ?? null,
        },
      })
      .catch((err) => this.logger.error('Audit log failed on password reset email delivery', err))
  }
}
