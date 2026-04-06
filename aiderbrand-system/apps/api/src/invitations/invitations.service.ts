import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'crypto'
import { InvitationsRepository } from './invitations.repository'
import { MembershipsService } from '../memberships/memberships.service'
import { AuditService } from '../audit/audit.service'
import { MailService, type MailDeliveryResult } from '../mail/mail.service'
import { INVITE_CAPABLE_ROLES } from '../common/enums/role.enum'
import { Role as LocalRole } from '../common/enums/role.enum'
import type { Role, Invitation } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface CreateInvitationResult {
  invitation: Invitation
  rawToken: string
  inviteUrl: string
  delivery: MailDeliveryResult
}

/**
 * InvitationsService — domain logic for invitation lifecycle.
 *
 * Enforces:
 * - RBAC: only INVITE_CAPABLE_ROLES can create invitations
 * - Role hierarchy: inviter cannot assign a role higher than their own
 * - Uniqueness: no duplicate PENDING invites per (email, companyId)
 * - Multi-tenant: all operations scoped to a companyId
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name)

  constructor(
    private readonly invitationsRepo: InvitationsRepository,
    private readonly membershipsService: MembershipsService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new PENDING invitation.
   *
   * @param actorId      - The user creating the invitation
   * @param actorRole    - The actor's role in the company (set by CompanyMembershipGuard)
   * @param companyId    - Target company (from X-Company-Id header)
   * @param email        - Email of the invitee
   * @param role         - Role to assign upon acceptance
   */
  async create(params: {
    actorId: string
    actorRole: Role
    companyId: string
    email: string
    role: Role
  }): Promise<CreateInvitationResult> {
    const { actorId, actorRole, companyId, email, role } = params

    // 1. Check actor has invite permission
    if (!INVITE_CAPABLE_ROLES.includes(actorRole as unknown as LocalRole)) {
      throw new ForbiddenException(
        `Your role (${actorRole}) is not allowed to invite users`,
      )
    }

    // 2. Validate role hierarchy (cannot invite higher than self)
    this.membershipsService.validateInvitePermission(
      actorRole as unknown as LocalRole,
      role as unknown as LocalRole,
    )

    // 3. Check for existing pending invitation (no duplicate pending invites)
    const existing = await this.invitationsRepo.findPendingByEmailAndCompany(email, companyId)
    if (existing) {
      throw new ConflictException(
        `A pending invitation already exists for ${email} in this company`,
      )
    }

    // 4. Generate opaque token
    const { rawToken, tokenHash } = this.invitationsRepo.generateToken()

    // 5. Resolve expiry from config (default: 7d)
    const expiresAt = this.resolveExpiryDate()

    // 6. Create invitation record
    const invitation = await this.invitationsRepo.create({
      companyId,
      email,
      role,
      tokenHash,
      expiresAt,
      createdById: actorId,
    })

    const inviteUrl = this.buildInviteUrl(rawToken)
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    })
    const inviter = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    })
    const delivery = await this.mailService.sendInvitationEmail({
      to: email,
      companyName: company?.name ?? 'Aiderbrand',
      inviterName: inviter?.name ?? null,
      roleLabel: this.formatRoleLabel(role),
      inviteUrl,
    })

    await this.auditInvitationDelivery({
      actorId,
      companyId,
      invitationId: invitation.id,
      email,
      role,
      delivery,
    })

    this.auditService.logSafe({
      actorId,
      companyId,
      action: 'invitation.created',
      entityType: 'Invitation',
      entityId: invitation.id,
      metadata: { email, role },
    }).catch((err) => this.logger.error('Audit log failed on invitation.created', err))

    return { invitation, rawToken, inviteUrl, delivery }
  }

  /**
   * Revoke a PENDING invitation.
   * Only INVITE_CAPABLE_ROLES can revoke, and only within their company.
   */
  async revoke(params: {
    actorId: string
    actorRole: Role
    companyId: string
    invitationId: string
  }): Promise<Invitation> {
    const { actorId, actorRole, companyId, invitationId } = params

    // 1. Check actor has invite permission
    if (!INVITE_CAPABLE_ROLES.includes(actorRole as unknown as LocalRole)) {
      throw new ForbiddenException(
        `Your role (${actorRole}) is not allowed to revoke invitations`,
      )
    }

    // 2. Find the invitation
    const invitation = await this.invitationsRepo.findById(invitationId)
    if (!invitation) {
      throw new NotFoundException(`Invitation ${invitationId} not found`)
    }

    // 3. Ensure it belongs to the active company (multi-tenant isolation)
    if (invitation.companyId !== companyId) {
      throw new ForbiddenException('Invitation does not belong to this company')
    }

    // 4. Only PENDING invitations can be revoked
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Invitation cannot be revoked — current status: ${invitation.status}`,
      )
    }

    // 5. Revoke
    const revoked = await this.invitationsRepo.revoke(invitationId)

    // 6. Audit
    this.auditService.logSafe({
      actorId,
      companyId,
      action: 'invitation.revoked',
      entityType: 'Invitation',
      entityId: invitationId,
      metadata: { email: invitation.email, role: invitation.role },
    }).catch((err) => this.logger.error('Audit log failed on invitation.revoked', err))

    return revoked
  }

  /**
   * List invitations for a company.
   * Filtered by status if provided.
   */
  async listForCompany(
    companyId: string,
    status?: string,
  ): Promise<Invitation[]> {
    // Validate the status value if provided
    const validStatuses = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']
    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status filter: ${status}`)
    }

    return this.invitationsRepo.findAllByCompany(
      companyId,
      status as Parameters<typeof this.invitationsRepo.findAllByCompany>[1],
    )
  }

  /**
   * Validate an invitation token.
   * Returns the invitation if valid (PENDING + not expired).
   * Used by the accept-invitation endpoint to pre-validate before the transaction.
   */
  async validateToken(rawToken: string): Promise<Invitation> {
    const tokenHash = this.invitationsRepo.hash(rawToken)
    const invitation = await this.invitationsRepo.findValidByTokenHash(tokenHash)

    if (!invitation || !this.hashesMatch(tokenHash, invitation.tokenHash)) {
      throw new BadRequestException('Invitation token is invalid, expired, or already used')
    }

    return invitation
  }

  /**
   * Accept an invitation — this is called INSIDE an atomic transaction
   * coordinated by AuthService.acceptInvitation().
   * Returns the invitation record after marking it accepted.
   */
  async acceptInvitation(invitationId: string): Promise<Invitation> {
    return this.invitationsRepo.accept(invitationId)
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private resolveExpiryDate(): Date {
    // Config stores hours (INVITATION_EXPIRES_IN_HOURS, default 72h = 3 days)
    const hours = this.configService.get<number>('app.invitation.expiresInHours') ?? 72

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + hours)
    return expiresAt
  }

  private hashesMatch(left: string, right: string): boolean {
    return timingSafeEqual(Buffer.from(left), Buffer.from(right))
  }

  private buildInviteUrl(rawToken: string): string {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000'
    return `${frontendUrl}/invite/${rawToken}`
  }

  private formatRoleLabel(role: Role): string {
    return role.toLowerCase().split('_').map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(' ')
  }

  private async auditInvitationDelivery(params: {
    actorId: string
    companyId: string
    invitationId: string
    email: string
    role: Role
    delivery: MailDeliveryResult
  }): Promise<void> {
    const action = params.delivery.sent ? 'invitation.email_sent' : 'invitation.email_failed'

    await this.auditService.logSafe({
      actorId: params.actorId,
      companyId: params.companyId,
      action,
      entityType: 'Invitation',
      entityId: params.invitationId,
      metadata: {
        email: params.email,
        role: params.role,
        reason: params.delivery.reason,
        attempted: params.delivery.attempted,
        errorMessage: params.delivery.errorMessage ?? null,
      },
    })
  }
}
