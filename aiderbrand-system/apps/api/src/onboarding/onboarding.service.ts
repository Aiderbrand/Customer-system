import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import {
  InvitationStatus,
  InvitationType,
  OnboardingStatus,
  PhaseStatus,
  Priority,
  ProjectStatus,
  TaskStatus,
} from '@prisma/client'
import { Role as PrismaRole, type OnboardingSubmission } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { InvitationsService } from '../invitations/invitations.service'
import { ProjectsService } from '../projects/projects.service'
import { AuditService } from '../audit/audit.service'
import { CompaniesService } from '../companies/companies.service'
import { MembershipsService } from '../memberships/memberships.service'
import { OnboardingRepository } from './onboarding.repository'
import { UsersService } from '../users/users.service'
import { AuthService } from '../auth/auth.service'
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto'
import type { UpdateOnboardingSubmissionDto } from './dto/update-onboarding-submission.dto'
import { ONBOARDING_CHECKLIST_ITEMS } from './onboarding.constants'

export interface OnboardingTokenResponse {
  email: string
  companyId: string
  companyName: string
}

export interface CompleteOnboardingResponse {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string }
  company: { id: string; name: string }
  projectName: string
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationsService: InvitationsService,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
    private readonly companiesService: CompaniesService,
    private readonly membershipsService: MembershipsService,
    private readonly onboardingRepository: OnboardingRepository,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Validate an ONBOARDING token.
   * Updates Company.onboardingStatus = in_progress on success.
   */
  async validateToken(token: string): Promise<OnboardingTokenResponse> {
    const invitation = await this.invitationsService.validateToken(token)

    if (invitation.type !== InvitationType.ONBOARDING) {
      throw new BadRequestException('Invalid token type')
    }

    await this.companiesService.setOnboardingStatus(invitation.companyId, OnboardingStatus.in_progress)

    this.auditService.logSafe({
      companyId: invitation.companyId,
      action: 'onboarding.status.in_progress',
      entityType: 'Company',
      entityId: invitation.companyId,
      metadata: { email: invitation.email },
    }).catch((err) => this.logger.error('Audit log failed on onboarding.status.in_progress', err))

    const company = await this.companiesService.findByIdOrThrow(invitation.companyId)

    return {
      email: invitation.email,
      companyId: invitation.companyId,
      companyName: company.name,
    }
  }

  /**
   * Complete the onboarding flow — atomic Prisma transaction.
   *
   * Pre-tx: bcrypt, randomBytes, token validation, company lookup
   * Tx (Serializable, timeout 15s): user upsert, membership upsert, submission create,
   *   project create, refreshToken create, invitation ACCEPTED, company status completed
   * Post-tx (fire-and-forget): audit events, team invitations
   */
  async complete(dto: CompleteOnboardingDto): Promise<CompleteOnboardingResponse> {
    // ── Pre-transaction ────────────────────────────────────────────────────────

    const invitation = await this.invitationsService.validateToken(dto.token)

    if (invitation.type !== InvitationType.ONBOARDING) {
      throw new BadRequestException('Invalid token type: expected ONBOARDING')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer pending')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const refreshExpiresAt = new Date()
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30)

    // Fetch company name before the transaction (read-only, safe to do outside)
    const company = await this.companiesService.findByIdOrThrow(invitation.companyId)
    const companyName = company.name

    // Build onboarding project template (business rules live in the service)
    const kickoffDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const projectLeadId = invitation.createdById ?? null

    const projectTemplate = {
      companyId: invitation.companyId,
      name: `Optimización operativa - ${companyName}`,
      status: ProjectStatus.planificacion,
      phases: [
        {
          name: 'Formulario completado',
          order: 1,
          status: PhaseStatus.completada,
          completedAt: new Date(),
          isClientVisible: true,
        },
        {
          name: 'Kick-off',
          order: 2,
          status: PhaseStatus.desarrollo,
          dueAt: kickoffDueAt,
          isClientVisible: true,
          tasks: [
            {
              title: 'Revisar formulario inicial de onboarding',
              status: TaskStatus.pendiente,
              priority: Priority.alta,
              visibleToClient: false,
              checklistItems: ONBOARDING_CHECKLIST_ITEMS,
            },
            {
              title: 'Agendar llamada de kick-off',
              status: TaskStatus.pendiente,
              priority: Priority.urgente,
              visibleToClient: false,
            },
          ],
        },
      ],
    }

    // ── Transaction ───────────────────────────────────────────────────────────

    const { userId, userEmail, userName, submissionId, projectId, rawRefreshToken, accessToken } =
      await this.prisma.$transaction(
        async (tx) => {
          // 1. Re-verify invitation is still PENDING (idempotency guard)
          const freshInvitation = await this.invitationsService.findByIdInTx(tx, invitation.id)
          if (!freshInvitation || freshInvitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException('Invitation is no longer pending')
          }

          // 2. Upsert user
          const user = await this.usersService.upsertByEmailInTx(tx, {
            email: invitation.email,
            name: dto.name,
            passwordHash,
          })

          // 3. Upsert membership (ACCOUNT_OWNER)
          await this.membershipsService.upsertInTx(tx, {
            userId: user.id,
            companyId: invitation.companyId,
            role: PrismaRole.ACCOUNT_OWNER,
          })

          // 4. Create OnboardingSubmission
          const submission = await this.onboardingRepository.createSubmissionInTx(tx, {
            companyId: invitation.companyId,
            userId: user.id,
            ...dto.formAnswers,
          })

          // 5. Create onboarding project (template data built above by service)
          const project = await this.projectsService.createProjectInTx(tx, {
            ...projectTemplate,
            projectLeadId: projectLeadId ?? user.id,
          })

          // 6. Create auth session (refresh token + access JWT — encapsulated in auth domain)
          const session = await this.authService.createOnboardingSessionInTx(
            tx,
            user.id,
            user.email,
            refreshExpiresAt,
          )

          // 7. Mark invitation ACCEPTED
          await this.invitationsService.acceptInTx(tx, invitation.id)

          // 8. Update Company.onboardingStatus = completed
          await this.companiesService.updateOnboardingStatusInTx(tx, invitation.companyId, OnboardingStatus.completed)

          return {
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            submissionId: submission.id,
            projectId: project.id,
            rawRefreshToken: session.rawRefreshToken,
            accessToken: session.accessToken,
          }
        },
        { timeout: 15000, maxWait: 5000, isolationLevel: 'Serializable' },
      )

    // ── Post-transaction audit (fire-and-forget) ──────────────────────────────

    this.auditService.logSafe({
      actorId: userId,
      companyId: invitation.companyId,
      action: 'onboarding.completed',
      entityType: 'Company',
      entityId: invitation.companyId,
      metadata: {
        email: userEmail,
        submissionId,
        projectId,
      },
    }).catch((err) => this.logger.error('Audit log failed on onboarding.completed', err))

    // ── Post-transaction team invitations (fire-and-forget) ───────────────────

    if (dto.teamInvites && dto.teamInvites.length > 0) {
      for (const invite of dto.teamInvites) {
        this.invitationsService
          .create({
            actorId: userId,
            actorRole: PrismaRole.ACCOUNT_OWNER,
            companyId: invitation.companyId,
            email: invite.email,
            role: invite.role as PrismaRole,
            withOnboarding: false,
          })
          .then(() => {
            this.auditService
              .logSafe({
                actorId: userId,
                companyId: invitation.companyId,
                action: 'onboarding.team.invited',
                entityType: 'Invitation',
                metadata: { email: invite.email, role: invite.role },
              })
              .catch((err) => this.logger.error('Audit log failed on onboarding.team.invited', err))
          })
          .catch((err) => {
            this.logger.error(`Failed to send team invite to ${invite.email}`, err)
            this.auditService
              .logSafe({
                actorId: userId,
                companyId: invitation.companyId,
                action: 'onboarding.team.invite_failed',
                metadata: { email: invite.email, error: String(err) },
              })
              .catch(() => {})
          })
      }
    }

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: userId, name: userName, email: userEmail },
      company: { id: invitation.companyId, name: companyName },
      projectName: projectTemplate.name,
    }
  }

  async getSubmissionByUser(userId: string): Promise<OnboardingSubmission> {
    const submission = await this.onboardingRepository.findSubmissionByUserId(userId)
    if (!submission) throw new NotFoundException('Onboarding submission not found')
    return submission
  }

  async updateSubmissionByUser(
    userId: string,
    dto: UpdateOnboardingSubmissionDto,
  ): Promise<OnboardingSubmission> {
    const submission = await this.onboardingRepository.findSubmissionByUserId(userId)
    if (!submission) throw new NotFoundException('Onboarding submission not found')

    const membership = await this.membershipsService.getActiveMembership(userId, submission.companyId)

    if (!membership) {
      throw new ForbiddenException('No access to this submission')
    }

    if (submission.reviewedAt !== null) {
      throw new ForbiddenException('Submission already reviewed')
    }

    const updated = await this.onboardingRepository.updateSubmission(submission.id, dto)

    this.auditService
      .logSafe({
        actorId: userId,
        companyId: submission.companyId,
        action: 'onboarding.submission.updated',
        entityType: 'OnboardingSubmission',
        entityId: submission.id,
        metadata: { updatedFields: Object.keys(dto).filter((k) => dto[k as keyof typeof dto] !== undefined) },
      })
      .catch((err) => this.logger.error('Audit log failed on onboarding.submission.updated', err))

    return updated
  }

  async resolveCompanyIdForUser(userId: string): Promise<string> {
    const memberships = await this.membershipsService.getMembershipsForUser(userId)
    const [membership] = memberships
    if (!membership) throw new NotFoundException('No active membership found')
    return membership.companyId
  }

  async markReviewed(submissionId: string, adminId: string): Promise<OnboardingSubmission> {
    const existing = await this.onboardingRepository.findSubmissionById(submissionId)
    if (!existing) throw new NotFoundException(`Submission ${submissionId} not found`)

    const updated = await this.onboardingRepository.markReviewed(submissionId, adminId)

    this.auditService
      .logSafe({
        actorId: adminId,
        companyId: updated.companyId,
        action: 'onboarding.submission.reviewed',
        entityType: 'OnboardingSubmission',
        entityId: submissionId,
        metadata: { reviewedById: adminId },
      })
      .catch((err) => this.logger.error('Audit log failed on onboarding.submission.reviewed', err))

    return updated
  }
}
