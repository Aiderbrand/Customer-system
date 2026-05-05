import {
  Inject,
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ConfigService } from '@nestjs/config'
import { randomBytes, timingSafeEqual } from 'crypto'
import { InvitationsRepository } from './invitations.repository'
import { MembershipsService } from '../memberships/memberships.service'
import { AuditService } from '../audit/audit.service'
import { INVITE_CAPABLE_ROLES } from '../common/enums/role.enum'
import { Role as LocalRole } from '../common/enums/role.enum'
import { OnboardingStatus, Role, type Invitation, type InvitationType, type Prisma } from '@prisma/client'
import { CompaniesService } from '../companies/companies.service'
import { UsersService } from '../users/users.service'
import { InvitationCreatedEvent } from './events/invitation-created.event'

export interface CreateInvitationResult {
  invitation: Invitation
  rawToken: string
  inviteUrl: string
  publicInviteUrl: string
  manualShareRequired: boolean
  delivery: { attempted: boolean; sent: boolean; reason: 'sent' | 'disabled' | 'failed' | 'email_queued'; manualShareRequired: boolean }
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
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new PENDING invitation.
   *
   * @param actorId        - The user creating the invitation
   * @param actorRole      - The actor's role in the company (set by CompanyMembershipGuard)
   * @param companyId      - Target company (from X-Company-Id header)
   * @param email          - Email of the invitee
   * @param role           - Role to assign upon acceptance
   * @param withOnboarding - If true, creates an ONBOARDING invitation instead of MEMBER
   */
  async create(params: {
    actorId: string
    actorRole: Role
    companyId: string
    email: string
    role: Role
    withOnboarding?: boolean
  }): Promise<CreateInvitationResult> {
    const { actorId, actorRole, companyId, email, role, withOnboarding } = params

    // 1. Check actor has invite permission
    if (!INVITE_CAPABLE_ROLES.includes(actorRole as unknown as LocalRole)) {
      throw new ForbiddenException(
        `Your role (${actorRole}) is not allowed to invite users`,
      )
    }

    // 2. Guard: ACCOUNT_OWNER cannot create onboarding invitations
    if (withOnboarding && actorRole === Role.ACCOUNT_OWNER) {
      throw new ForbiddenException('ACCOUNT_OWNER cannot create onboarding invitations')
    }

    // 3. Validate role hierarchy (cannot invite higher than self)
    this.membershipsService.validateInvitePermission(
      actorRole as unknown as LocalRole,
      role as unknown as LocalRole,
    )

    // 4. Check for existing pending invitation (no duplicate pending invites)
    const existing = await this.invitationsRepo.findPendingByEmailAndCompany(email, companyId)
    if (existing) {
      throw new ConflictException(
        `A pending invitation already exists for ${email} in this company`,
      )
    }

    // 5. Generate opaque token (service responsibility)
    const rawToken = randomBytes(48).toString('hex')
    const tokenHash = this.invitationsRepo.hash(rawToken)

    // 6. Resolve expiry from config (default: 7d)
    const expiresAt = this.resolveExpiryDate()

    // 7. Resolve invitation type
    const invitationType: InvitationType = withOnboarding ? 'ONBOARDING' : 'MEMBER'

    // 8. Create invitation record
    const invitation = await this.invitationsRepo.create({
      companyId,
      email,
      role,
      tokenHash,
      expiresAt,
      createdById: actorId,
      type: invitationType,
    })

    // 9. If ONBOARDING — update Company.onboardingStatus = invited
    if (invitationType === 'ONBOARDING') {
      await this.companiesService.setOnboardingStatus(companyId, OnboardingStatus.invited)
    }

    const inviteUrl = this.buildInviteUrlForType(rawToken, invitationType)
    const company = await this.companiesService.findByIdOrThrow(companyId)
    const inviter = await this.usersService.findById(actorId)

    // 10. Emit event for async email delivery (non-blocking)
    this.eventEmitter.emit(
      'invitation.created',
      new InvitationCreatedEvent(
        invitationType,
        email,
        company.name,
        inviteUrl,
        inviter?.name ?? null,
        this.formatRoleLabel(role),
        actorId,
        companyId,
        invitation.id,
        role,
      ),
    )

    // 11. Audit invitation.created (base event)
    this.auditService.logSafe({
      actorId,
      companyId,
      action: 'invitation.created',
      entityType: 'Invitation',
      entityId: invitation.id,
      metadata: { email, role, type: invitationType },
    }).catch((err) => this.logger.error('Audit log failed on invitation.created', err))

    // 12. If ONBOARDING — emit additional audit event
    if (invitationType === 'ONBOARDING') {
      this.auditService.logSafe({
        actorId,
        companyId,
        action: 'invitation.created.onboarding',
        entityType: 'Invitation',
        entityId: invitation.id,
        metadata: { email, role, companyId },
      }).catch((err) => this.logger.error('Audit log failed on invitation.created.onboarding', err))
    }

    return {
      invitation,
      rawToken,
      inviteUrl,
      publicInviteUrl: inviteUrl,
      manualShareRequired: false,
      delivery: { attempted: true, sent: false, reason: 'email_queued', manualShareRequired: false },
    }
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
   * Lazily marks the token EXPIRED in the DB if it has passed its expiry date.
   */
  async validateToken(rawToken: string): Promise<Invitation> {
    const tokenHash = this.invitationsRepo.hash(rawToken)

    // Check raw record first to detect expired-but-still-PENDING tokens
    const raw = await this.invitationsRepo.findByTokenHash(tokenHash)

    if (!raw) {
      throw new BadRequestException('Invitation token is invalid, expired, or already used')
    }

    if (raw.status === 'PENDING' && raw.expiresAt <= new Date()) {
      void this.invitationsRepo.expireById(raw.id).catch(() => {})
      throw new BadRequestException('Invitation token is invalid, expired, or already used')
    }

    if (raw.status !== 'PENDING' || !this.hashesMatch(tokenHash, raw.tokenHash)) {
      throw new BadRequestException('Invitation token is invalid, expired, or already used')
    }

    return raw
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

  private buildInviteUrlForType(rawToken: string, type: InvitationType): string {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000'
    const path = type === 'ONBOARDING' ? 'onboarding' : 'invite'
    return `${frontendUrl}/${path}/${rawToken}`
  }

  hash(rawToken: string): string {
    return this.invitationsRepo.hash(rawToken)
  }

  async findByIdInTx(tx: Prisma.TransactionClient, id: string): Promise<Invitation | null> {
    return this.invitationsRepo.findByIdInTx(tx, id)
  }

  async acceptInTx(tx: Prisma.TransactionClient, id: string): Promise<void> {
    return this.invitationsRepo.acceptInTx(tx, id)
  }

  async acceptByTokenHashInTx(tx: Prisma.TransactionClient, tokenHash: string): Promise<void> {
    return this.invitationsRepo.acceptByTokenHashInTx(tx, tokenHash)
  }

  private formatRoleLabel(role: Role): string {
    return role.toLowerCase().split('_').map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(' ')
  }

}
