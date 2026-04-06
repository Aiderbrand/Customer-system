import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'

export interface MailDeliveryResult {
  attempted: boolean
  sent: boolean
  reason: 'sent' | 'disabled' | 'failed'
  errorMessage?: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporterPromise: Promise<nodemailer.Transporter> | null = null

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.get<boolean>('app.mail.enabled') ?? false
  }

  async sendInvitationEmail(params: {
    to: string
    companyName: string
    inviterName?: string | null
    roleLabel: string
    inviteUrl: string
  }): Promise<MailDeliveryResult> {
    return this.sendMail({
      to: params.to,
      subject: `Invitación a ${params.companyName}`,
      text: [
        `Hola,`,
        '',
        `${params.inviterName ?? 'El equipo de Aiderbrand'} te invitó a ${params.companyName} con el rol ${params.roleLabel}.`,
        '',
        `Aceptá la invitación desde este enlace: ${params.inviteUrl}`,
        '',
        'Si no esperabas este mensaje, podés ignorarlo.',
      ].join('\n'),
      html: [
        '<p>Hola,</p>',
        `<p>${params.inviterName ?? 'El equipo de Aiderbrand'} te invitó a <strong>${params.companyName}</strong> con el rol <strong>${params.roleLabel}</strong>.</p>`,
        `<p><a href="${params.inviteUrl}">Aceptar invitación</a></p>`,
        '<p>Si no esperabas este mensaje, podés ignorarlo.</p>',
      ].join(''),
    })
  }

  async sendPasswordResetEmail(params: {
    to: string
    userName?: string | null
    resetUrl: string
  }): Promise<MailDeliveryResult> {
    return this.sendMail({
      to: params.to,
      subject: 'Restablecer contraseña',
      text: [
        `Hola${params.userName ? ` ${params.userName}` : ''},`,
        '',
        'Recibimos una solicitud para restablecer tu contraseña.',
        `Usá este enlace para continuar: ${params.resetUrl}`,
        '',
        'Si no fuiste vos, podés ignorar este mensaje.',
      ].join('\n'),
      html: [
        `<p>Hola${params.userName ? ` ${params.userName}` : ''},</p>`,
        '<p>Recibimos una solicitud para restablecer tu contraseña.</p>',
        `<p><a href="${params.resetUrl}">Restablecer contraseña</a></p>`,
        '<p>Si no fuiste vos, podés ignorar este mensaje.</p>',
      ].join(''),
    })
  }

  private async sendMail(params: {
    to: string
    subject: string
    text: string
    html: string
  }): Promise<MailDeliveryResult> {
    if (!this.isEnabled()) {
      return { attempted: false, sent: false, reason: 'disabled' }
    }

    try {
      const transporter = await this.getTransporter()

      await transporter.sendMail({
        from: {
          address: this.configService.get<string>('app.mail.from.email') ?? 'no-reply@example.com',
          name: this.configService.get<string>('app.mail.from.name') ?? 'Aiderbrand',
        },
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      })

      return { attempted: true, sent: true, reason: 'sent' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_mail_error'
      this.logger.error(`Mail delivery failed: ${message}`)

      return {
        attempted: true,
        sent: false,
        reason: 'failed',
        errorMessage: message,
      }
    }
  }

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = Promise.resolve(
        nodemailer.createTransport({
          host: this.configService.get<string>('app.mail.smtp.host'),
          port: this.configService.get<number>('app.mail.smtp.port') ?? 587,
          secure: this.configService.get<boolean>('app.mail.smtp.secure') ?? false,
          auth: this.configService.get<string>('app.mail.smtp.user')
            ? {
                user: this.configService.get<string>('app.mail.smtp.user'),
                pass: this.configService.get<string>('app.mail.smtp.pass'),
              }
            : undefined,
        }),
      )
    }

    return this.transporterPromise
  }
}
