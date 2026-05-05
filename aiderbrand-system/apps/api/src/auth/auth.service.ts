import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ConfigService } from '@nestjs/config'
import { randomBytes, timingSafeEqual } from 'crypto'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { MembershipsService } from '../memberships/memberships.service'
import { AuditService } from '../audit/audit.service'
import { RefreshTokenRepository } from './refresh-token.repository'
import { PasswordResetRepository } from './password-reset.repository'
import { InvitationsService } from '../invitations/invitations.service'
import { PrismaService } from '../prisma/prisma.service'
import { CompaniesService } from '../companies/companies.service'
import { RoleSimulationRepository } from './role-simulation.repository'
import { MailService } from '../mail/mail.service'
import { PasswordResetRequestedEvent } from './events/password-reset-requested.event'
import type { JwtPayload } from '../common/types/jwt-payload.type'
import type { AuthContextData } from '../common/types'
import type {
  ActorContextDto,
  EffectiveContextDto,
  LoginResponseDto,
  MembershipDto,
  SessionResponseDto,
  SimulationSessionDto,
} from './dto/auth-response.dto'
import { Role } from '../common/enums/role.enum'
import { StartRoleSimulationDto } from './dto/start-role-simulation.dto'
import type { AuditAuthContextMetadata } from '../audit/audit.service'

/**
 * AuthService — core authentication logic.
 *
 * Responsibilities:
 * - Validate credentials (bcrypt)
 * - Issue JWT access token (15m)
 * - Issue opaque refresh token (hashed in DB, httpOnly cookie)
 * - Refresh token rotation (revoke old, issue new)
 * - Logout (revoke refresh token)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly membershipsService: MembershipsService,
    private readonly auditService: AuditService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly invitationsService: InvitationsService,
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService,
    private readonly roleSimulationRepository: RoleSimulationRepository,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate credentials and return login response + opaque refresh token.
   *
   * Returns the opaque refresh token separately so the controller can set
   * it as an httpOnly cookie without including it in the response body.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ response: LoginResponseDto; rawRefreshToken: string }> {
    // 1. Find user — use constant-time comparison even if not found
    const user = await this.usersService.findByEmail(email)

    // Always run bcrypt comparison to prevent timing attacks
    const dummyHash = '$2a$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const isValid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash)

    if (!user || !isValid || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password')
    }

    // 2. Issue access token
    const accessToken = this.issueAccessToken(user.id, user.email)

    // 3. Issue opaque refresh token + persist hashed
    const rawRefreshToken = await this.issueRefreshToken(user.id)

    // 4. Fetch canonical session payload for response
    const session = await this.getSession(user.id)

    // 5. Audit log (fire-and-forget — non-critical)
    void this.auditService.logSafe({
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        membershipCount: session.memberships.length,
        companyIds: session.memberships.map((membership) => membership.companyId),
      },
    })

    return {
      response: {
        accessToken,
        ...session,
      },
      rawRefreshToken,
    }
  }

  async getSession(userId: string): Promise<SessionResponseDto> {
    const user = await this.usersService.findByIdOrThrow(userId)
    const memberships = await this.membershipsService.getMembershipsForUser(user.id)
    const actor = await this.resolveActorContext(user.id, memberships)
    const simulation = await this.resolveSimulationSummary(user.id, actor.hasSystemAdminCapability)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
      },
      memberships: this.toMembershipDtos(memberships),
      actor,
      effective: this.toEffectiveContext(simulation, memberships),
      simulation,
    }
  }

  async startRoleSimulation(
    actorUserId: string,
    dto: StartRoleSimulationDto,
  ): Promise<SessionResponseDto> {
    const actor = await this.resolveActorContext(actorUserId)

    if (!actor.hasSystemAdminCapability) {
      await this.auditService.logSafe({
        actorId: actorUserId,
        action: 'auth.simulation.denied',
        entityType: 'RoleSimulationSession',
        metadata: this.auditService.withAuditAuthContext(
          {
            reason: 'missing_system_admin_capability',
            effectiveRole: dto.effectiveRole,
          },
          await this.buildAuditAuthContext(actorUserId, {
            actorHasSystemAdminCapability: actor.hasSystemAdminCapability,
            effectiveRole: dto.effectiveRole,
          }),
        ),
      })

      throw new ForbiddenException('Only SYSTEM_ADMIN can start role simulation')
    }

    if (dto.effectiveRole === Role.SYSTEM_ADMIN) {
      try {
        return await this.stopRoleSimulation(actorUserId)
      } catch (error) {
        if (error instanceof NotFoundException) {
          return this.getSession(actorUserId)
        }

        throw error
      }
    }

    const session = await this.roleSimulationRepository.start({
      actorUserId,
      effectiveRole: dto.effectiveRole,
    })

    await this.auditService.logSafe({
      actorId: actorUserId,
      action: 'auth.simulation.started',
      entityType: 'RoleSimulationSession',
      entityId: session.id,
      metadata: this.auditService.withAuditAuthContext(
        {
          effectiveRole: dto.effectiveRole,
        },
        await this.buildAuditAuthContext(actorUserId, {
          actorHasSystemAdminCapability: actor.hasSystemAdminCapability,
          effectiveRole: dto.effectiveRole,
          simulation: {
            sessionId: session.id,
            effectiveRole: session.effectiveRole,
            startedAt: session.startedAt,
          },
        }),
      ),
    })

    return this.getSession(actorUserId)
  }

  async stopRoleSimulation(actorUserId: string): Promise<SessionResponseDto> {
    let stopped: Awaited<ReturnType<RoleSimulationRepository['stopActive']>>

    try {
      stopped = await this.roleSimulationRepository.stopActive(actorUserId, actorUserId)
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.auditService.logSafe({
          actorId: actorUserId,
          action: 'auth.simulation.denied',
          entityType: 'RoleSimulationSession',
          metadata: this.auditService.withAuditAuthContext(
            { reason: 'missing_active_simulation' },
            await this.buildAuditAuthContext(actorUserId),
          ),
        })
      }

      throw error
    }

    await this.auditService.logSafe({
      actorId: actorUserId,
      action: 'auth.simulation.stopped',
      entityType: 'RoleSimulationSession',
      entityId: stopped.id,
      metadata: this.auditService.withAuditAuthContext(
        {
          effectiveRole: stopped.effectiveRole,
          stoppedAt: stopped.stoppedAt?.toISOString() ?? null,
        },
        await this.buildAuditAuthContext(actorUserId, {
          effectiveRole: stopped.effectiveRole,
        }),
      ),
    })

    return this.getSession(actorUserId)
  }

  /**
   * Rotate refresh token — revoke old, issue new access + refresh pair.
   *
   * Uses token rotation: each refresh token is single-use.
   * The old token is revoked before issuing the new pair.
   */
  async refresh(
    userId: string,
    rawRefreshToken: string,
    refreshTokenDbId: string,
  ): Promise<{ accessToken: string; rawRefreshToken: string }> {
    // Revoke the used token (rotation)
    await this.refreshTokenRepo.revoke(refreshTokenDbId)

    // Issue new pair
    const user = await this.usersService.findByIdOrThrow(userId)
    const accessToken = this.issueAccessToken(user.id, user.email)
    const newRawRefreshToken = await this.issueRefreshToken(user.id)

    return { accessToken, rawRefreshToken: newRawRefreshToken }
  }

  /**
   * Logout — revoke the provided refresh token.
   * The access token expires naturally (15m TTL, stateless).
   */
  async logout(refreshTokenDbId: string, userId: string): Promise<void> {
    await this.refreshTokenRepo.revoke(refreshTokenDbId)

    // Audit (fire-and-forget)
    void this.auditService.logSafe({
      actorId: userId,
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
    })
  }

  /**
   * Validate a raw refresh token against the DB.
   * Used by AuthController refresh endpoint to get the DB record ID.
   *
   * Returns the DB record or throws Unauthorized.
   */
  async validateRefreshToken(rawToken: string): Promise<{ id: string; userId: string }> {
    const tokenHash = this.refreshTokenRepo.hash(rawToken)
    const record = await this.refreshTokenRepo.findValid(tokenHash)

    if (!record || !this.hashesMatch(tokenHash, record.tokenHash)) {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }

    return { id: record.id, userId: record.userId }
  }

  /**
   * Accept an invitation — atomic transaction:
   *
   * 1. Validate the invitation token (must be PENDING + not expired)
   * 2. If user with that email exists → reuse (update name if changed, attach membership)
   * 3. If user does not exist → create user with bcrypt-hashed password
   * 4. Upsert membership (idempotent — handles re-invite after previous membership)
   * 5. Mark invitation ACCEPTED
   * 6. Write audit log (inside transaction for consistency)
   * 7. Issue access JWT + opaque refresh token (auto-login)
   *
   * All DB writes in steps 2-6 are inside a single Prisma transaction.
   * If any step fails, the entire transaction rolls back.
   */
  async acceptInvitation(params: {
    rawToken: string
    name: string
    password: string
  }): Promise<{ response: LoginResponseDto; rawRefreshToken: string }> {
    const { rawToken, name, password } = params

    // Step 1: Validate token (throws BadRequestException if invalid/expired)
    const invitation = await this.invitationsService.validateToken(rawToken)

    // Guard: ONBOARDING invitations must go through /onboarding/complete, not this endpoint
    if (invitation.type === 'ONBOARDING') {
      throw new BadRequestException('Use /onboarding/complete for onboarding invitations')
    }

    const tokenHash = this.invitationsService.hash(rawToken)

    // Hash password before the transaction
    const BCRYPT_ROUNDS = 10
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Resolve refresh token expiry
    const expiresInDays = this.resolveRefreshExpiryDays()
    const refreshExpiresAt = new Date()
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + expiresInDays)

    // Generate refresh token before transaction (randomBytes is not transactional)
    const rawRefreshToken = randomBytes(48).toString('hex')
    const refreshTokenHash = this.refreshTokenRepo.hash(rawRefreshToken)

    // Steps 2–6: Atomic transaction — delegates to repositories
    let userId: string
    let userEmail: string

    await this.prisma.$transaction(async (tx) => {
      // 2. Upsert user
      const user = await this.usersService.upsertByEmailInTx(tx, {
        email: invitation.email,
        name,
        passwordHash,
      })

      userId = user.id
      userEmail = user.email

      // 3. Upsert membership (idempotent)
      await this.membershipsService.upsertInTx(tx, {
        userId: user.id,
        companyId: invitation.companyId,
        role: invitation.role,
      })

      // 4. Mark invitation ACCEPTED
      await this.invitationsService.acceptByTokenHashInTx(tx, tokenHash)

      // 5. Persist refresh token
      await this.refreshTokenRepo.createInTx(tx, {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
      })
    })

    // Audit log (fire-and-forget outside transaction)
    void this.auditService.logSafe({
      actorId: userId!,
      companyId: invitation.companyId,
      action: 'invitation.accepted',
      entityType: 'Invitation',
      entityId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    })

    // Fetch memberships for auto-login response (outside transaction — read-only)
    const session = await this.getSession(userId!)

    // Issue access JWT (stateless — outside transaction is fine)
    const accessToken = this.issueAccessToken(userId!, userEmail!)

    return {
      response: {
        accessToken,
        ...session,
      },
      rawRefreshToken,
    }
  }

  // ─── Password reset ─────────────────────────────────────────────────────────

  /**
   * Initiate a password reset flow for the given email.
   *
   * Security invariants:
   * - ALWAYS returns a generic 200 response, regardless of whether the email exists.
   *   This prevents email oracle attacks (user enumeration).
   * - If the email is unknown → silently no-op (log warning, no error thrown).
   * - Prior unused reset tokens for the user are invalidated before creating a new one.
   *
   * In production this method should trigger a transactional email with the reset URL.
   * For now it returns the raw token in the response only for development/testing;
   * the controller will decide how to use it.
   *
   * Audit log: 'password_reset.requested' (fire-and-forget, non-blocking).
   */
  async forgotPassword(email: string): Promise<void> {
    // 1. Look up user — do NOT throw if not found (oracle prevention)
    const user = await this.usersService.findByEmail(email)

    if (!user || !user.isActive) {
      this.logger.warn(`forgotPassword: unknown or inactive email requested — ${email}`)
      return
    }

    // 2. Compute expiry from config (default: 1 hour)
    const expiresInHours =
      this.configService.get<number>('app.passwordReset.expiresInHours') ?? 1
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // 3. Invalidate prior tokens + create new one (service generates the raw token)
    const rawToken = randomBytes(48).toString('hex')
    await this.passwordResetRepo.invalidateAllUnusedForUser(user.id)
    await this.passwordResetRepo.createToken(user.id, rawToken, expiresAt)

    // 4. Audit: request event
    void this.auditService.logSafe({
      actorId: user.id,
      action: 'password_reset.requested',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    })

    // 5. Emit event for async email delivery (non-blocking)
    const resetUrl = this.buildResetUrl(rawToken)
    this.eventEmitter.emit(
      'password.reset.requested',
      new PasswordResetRequestedEvent(user.id, user.email, user.name, resetUrl),
    )
  }

  /**
   * Reset a user's password using a valid opaque reset token.
   *
   * Steps:
   * 1. Hash the raw token → find in DB (must be unused + non-expired)
   * 2. Update the user's passwordHash (bcrypt, 10 rounds)
   * 3. Mark the reset token as used (one-time use)
   * 4. Revoke ALL active refresh tokens for this user (invalidate all sessions)
   * 5. Write audit log inside the transaction for strong consistency
   *
   * Throws BadRequestException if the token is invalid or expired.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    // 1. Validate token
    const tokenHash = this.passwordResetRepo.hash(rawToken)
    const resetRecord = await this.passwordResetRepo.findValid(tokenHash)

    if (!resetRecord || !this.hashesMatch(tokenHash, resetRecord.tokenHash)) {
      throw new BadRequestException('Reset token is invalid or has expired')
    }

    // 2. Hash new password before the transaction (bcrypt is CPU-heavy)
    const BCRYPT_ROUNDS = 10
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

    const memberships = await this.membershipsService.getMembershipsForUser(resetRecord.userId)

    // 3. Atomic transaction: update password + mark token used + revoke all refresh tokens
    await this.prisma.$transaction(async (tx) => {
      await this.usersService.updatePasswordHashInTx(tx, resetRecord.userId, passwordHash)
      await this.passwordResetRepo.markUsedByIdInTx(tx, resetRecord.id)
      await this.refreshTokenRepo.revokeAllForUserInTx(tx, resetRecord.userId)
    })

    // 4. Audit (fire-and-forget — outside transaction)
    void this.auditService.logSafe({
      actorId: resetRecord.userId,
      action: 'password.reset',
      entityType: 'User',
      entityId: resetRecord.userId,
      metadata: {
        tokenId: resetRecord.id,
        companyIds: memberships
          .filter((membership) => membership.isActive)
          .map((membership) => membership.companyId),
      },
    })
  }

  /**
   * Generate a password reset link for any user — SYSTEM_ADMIN only.
   *
   * This is an admin operation that bypasses the email flow:
   * the raw URL is returned directly so the admin can share it manually (e.g. Slack, support ticket).
   *
   * The link is constructed using FRONTEND_URL from config.
   *
   * Audit log: 'password_reset_link.generated' — records actorId (admin) + targetUserId.
   * This audit write is inside a transaction for traceability.
   *
   * Throws NotFoundException if the target user does not exist or is inactive.
   */
  async generateAdminResetLink(
    actorId: string,
    targetUserId: string,
    companyId?: string,
    authContext?: AuthContextData,
  ): Promise<{ resetUrl: string }> {
    // 1. Verify target user exists and is active
    const targetUser = await this.usersService.findByIdOrThrow(targetUserId)
    if (!targetUser.isActive) {
      throw new NotFoundException(`User ${targetUserId} is not active`)
    }

    // 2. Compute expiry (same 1h window as regular forgot-password)
    const expiresInHours =
      this.configService.get<number>('app.passwordReset.expiresInHours') ?? 1
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // 3. Invalidate prior tokens + create new one (service generates the raw token)
    const rawToken = randomBytes(48).toString('hex')
    await this.passwordResetRepo.invalidateAllUnusedForUser(targetUser.id)
    const { record } = await this.passwordResetRepo.createToken(targetUser.id, rawToken, expiresAt)

    // 4. Build reset URL
    const resetUrl = this.buildResetUrl(rawToken)

    // 5. Audit log (write directly — admin action must be traceable, but don't need full tx here
    //    since the token is already persisted above; fire-and-forget with structured error logging)
    void this.auditService.logSafe({
      actorId,
      companyId,
      action: 'password_reset_link.generated',
      entityType: 'User',
      entityId: targetUser.id,
      metadata: this.auditService.withAuthContext({
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        tokenId: record.id,
        expiresAt: expiresAt.toISOString(),
      }, authContext),
    })

    return { resetUrl }
  }

  /**
   * Create a full auth session inside an existing transaction (for onboarding flow).
   * Generates the refresh token, stores it in the tx, and issues the access JWT.
   * Encapsulates all auth internals so OnboardingService stays out of auth domain.
   */
  async createOnboardingSessionInTx(
    tx: import('@prisma/client').Prisma.TransactionClient,
    userId: string,
    userEmail: string,
    refreshExpiresAt: Date,
  ): Promise<{ rawRefreshToken: string; accessToken: string }> {
    const rawRefreshToken = randomBytes(48).toString('hex')
    const tokenHash = this.refreshTokenRepo.hash(rawRefreshToken)
    await this.refreshTokenRepo.createInTx(tx, { userId, tokenHash, expiresAt: refreshExpiresAt })
    const accessToken = this.issueAccessToken(userId, userEmail)
    return { rawRefreshToken, accessToken }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private issueAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email, type: 'access' }
    const expiresIn = this.configService.get<string>('app.jwt.accessExpiresIn') ?? '15m'
    return this.jwtService.sign(payload, { expiresIn })
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    // Opaque random token (crypto-secure)
    const rawToken = randomBytes(48).toString('hex') // 96 hex chars
    const tokenHash = this.refreshTokenRepo.hash(rawToken)

    // Resolve expiry from config
    const expiresInDays = this.resolveRefreshExpiryDays()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    await this.refreshTokenRepo.create({ userId, tokenHash, expiresAt })

    return rawToken
  }

  private resolveRefreshExpiryDays(): number {
    const expiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn') ?? '7d'
    // Parse "7d" → 7, "30d" → 30, fallback to 7
    const match = /^(\d+)d$/.exec(expiresIn)
    return match ? parseInt(match[1]!, 10) : 7
  }

  private toMembershipDtos(
    memberships: Awaited<ReturnType<MembershipsService['getMembershipsForUser']>>,
  ): MembershipDto[] {
    return memberships
      .filter((membership) => membership.isActive && membership.company)
      .map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company?.name ?? '',
        companySlug: membership.company?.slug ?? '',
        role: membership.role,
        isActive: membership.isActive,
      }))
  }

  private hashesMatch(left: string, right: string): boolean {
    return timingSafeEqual(Buffer.from(left), Buffer.from(right))
  }

  private buildResetUrl(rawToken: string): string {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000'
    return `${frontendUrl}/reset-password?token=${rawToken}`
  }

  private async resolveActorContext(
    userId: string,
    memberships?: Awaited<ReturnType<MembershipsService['getMembershipsForUser']>>,
  ): Promise<ActorContextDto> {
    const resolvedMemberships = memberships ?? await this.membershipsService.getMembershipsForUser(userId)

    const hasSystemAdminCapability = await this.membershipsService.hasSystemAdminCapability(userId)

    const membershipCompanyIds = resolvedMemberships
      .filter((membership) => membership.isActive)
      .map((membership) => membership.companyId)

    return {
      hasSystemAdminCapability,
      scope: {
        membershipCompanyIds,
        realDataCompanyIds: await this.resolveRealDataCompanyIds({
          membershipCompanyIds,
          actorHasSystemAdminCapability: hasSystemAdminCapability,
        }),
      },
    }
  }

  private async resolveRealDataCompanyIds(params: {
    membershipCompanyIds: string[]
    actorHasSystemAdminCapability: boolean
  }): Promise<string[]> {
    if (!params.actorHasSystemAdminCapability) {
      return params.membershipCompanyIds
    }

    return this.companiesService.findAllActiveIds()
  }

  private async resolveSimulationSummary(
    userId: string,
    actorHasSystemAdminCapability: boolean,
  ): Promise<SimulationSessionDto | null> {
    let simulation: Awaited<ReturnType<RoleSimulationRepository['findActiveByActorOrFailClosed']>>

    try {
      simulation = await this.roleSimulationRepository.findActiveByActorOrFailClosed(userId)
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        await this.auditService.logSafe({
          actorId: userId,
          action: 'auth.simulation.denied',
          entityType: 'RoleSimulationSession',
          metadata: this.auditService.withAuditAuthContext(
            { reason: 'invalid_state' },
            await this.buildAuditAuthContext(userId, {
              actorHasSystemAdminCapability,
            }),
          ),
        })
      }

      throw error
    }

    if (!simulation) {
      return null
    }

    if (!actorHasSystemAdminCapability) {
      await this.auditService.logSafe({
        actorId: userId,
        action: 'auth.simulation.denied',
        entityType: 'RoleSimulationSession',
        entityId: simulation.id,
        metadata: this.auditService.withAuditAuthContext(
          {
            reason: 'missing_system_admin_capability',
            effectiveRole: simulation.effectiveRole,
          },
          await this.buildAuditAuthContext(userId, {
            actorHasSystemAdminCapability,
            effectiveRole: simulation.effectiveRole,
            simulation: {
              sessionId: simulation.id,
              effectiveRole: simulation.effectiveRole,
              startedAt: simulation.startedAt,
            },
          }),
        ),
      })

      throw new ForbiddenException('Invalid role simulation state')
    }

    return {
      sessionId: simulation.id,
      effectiveRole: simulation.effectiveRole,
      startedAt: simulation.startedAt.toISOString(),
    }
  }

  private toEffectiveContext(
    simulation: SimulationSessionDto | null,
    memberships: Awaited<ReturnType<MembershipsService['getMembershipsForUser']>>,
  ): EffectiveContextDto {
    const activeMembership = memberships.find((membership) => membership.isActive) ?? null

    return {
      companyId: null,
      role: simulation?.effectiveRole ?? activeMembership?.role ?? null,
    }
  }

  private async buildAuditAuthContext(
    actorUserId: string,
    overrides?: Partial<AuditAuthContextMetadata>,
  ): Promise<AuditAuthContextMetadata> {
    const user = await this.usersService.findByIdOrThrow(actorUserId)
    const actor = await this.resolveActorContext(actorUserId)

    return {
      actorUserId,
      actorEmail: overrides?.actorEmail ?? user.email,
      actorHasSystemAdminCapability: overrides?.actorHasSystemAdminCapability ?? actor.hasSystemAdminCapability,
      actorScope: overrides?.actorScope ?? actor.scope,
      scopedCompanyId: overrides?.scopedCompanyId ?? null,
      effectiveRole: overrides?.effectiveRole ?? null,
      realMembershipRole: overrides?.realMembershipRole ?? null,
      simulation: overrides?.simulation ?? null,
    }
  }
}
