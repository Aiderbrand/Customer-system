import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { MembershipsRepository, type MembershipWithCompany } from './memberships.repository'
import { INVITATION_PERMISSION_MATRIX, Role as LocalRole } from '../common/enums/role.enum'
import type { CompanyMembership, Prisma, Role } from '@prisma/client'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class MembershipsService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getMembershipsForUser(userId: string): Promise<MembershipWithCompany[]> {
    return this.membershipsRepository.findAllByUser(userId)
  }

  async getMembershipsForCompany(companyId: string): Promise<CompanyMembership[]> {
    return this.membershipsRepository.findAllByCompany(companyId)
  }

  async listMembershipsForCompany(
    companyId: string,
    status?: 'active' | 'inactive' | 'all',
  ) {
    const normalizedStatus = status === 'all' || !status
      ? undefined
      : status === 'active'
    return this.membershipsRepository.findAllByCompanyWithStatus(companyId, normalizedStatus)
  }

  async getActiveMembership(
    userId: string,
    companyId: string,
  ): Promise<CompanyMembership | null> {
    const membership = await this.membershipsRepository.findByUserAndCompany(userId, companyId)
    return membership?.isActive ? membership : null
  }

  validateInvitePermission(inviterRole: Role, targetRole: Role): void {
    const allowedRoles = INVITATION_PERMISSION_MATRIX[
      inviterRole as keyof typeof INVITATION_PERMISSION_MATRIX
    ]

    if (!allowedRoles) {
      throw new ForbiddenException('Invalid role specified')
    }

    if (!allowedRoles.includes(targetRole as keyof typeof INVITATION_PERMISSION_MATRIX)) {
      throw new ForbiddenException(
        `Your role (${inviterRole}) is not allowed to invite ${targetRole}`,
      )
    }
  }

  async updateMembershipStatus(params: {
    actorId: string
    actorRole: Role
    companyId: string
    userId: string
    isActive: boolean
  }) {
    const membership = await this.membershipsRepository.findByUserAndCompany(params.userId, params.companyId)

    if (!membership) {
      throw new NotFoundException('Membership not found')
    }

    if (params.actorRole !== LocalRole.SYSTEM_ADMIN) {
      this.validateInvitePermission(
        params.actorRole as unknown as LocalRole,
        membership.role as unknown as LocalRole,
      )
    }

    const updatedMembership = await this.membershipsRepository.updateStatus(
      params.userId,
      params.companyId,
      params.isActive,
    )

    await this.auditService.logSafe({
      actorId: params.actorId,
      companyId: params.companyId,
      action: params.isActive ? 'membership.activated' : 'membership.deactivated',
      entityType: 'CompanyMembership',
      entityId: updatedMembership.id,
      metadata: {
        userId: params.userId,
        role: updatedMembership.role,
        actorRole: params.actorRole,
      },
    })

    return updatedMembership
  }

  async updateMembershipRole(params: {
    actorId: string
    actorRole: Role
    companyId: string
    userId: string
    role: Role
  }) {
    const membership = await this.membershipsRepository.findByUserAndCompany(params.userId, params.companyId)

    if (!membership) {
      throw new NotFoundException('Membership not found')
    }

    this.validateInvitePermission(
      params.actorRole as unknown as LocalRole,
      params.role as unknown as LocalRole,
    )

    if (params.actorRole !== LocalRole.SYSTEM_ADMIN && membership.role !== params.role) {
      this.validateInvitePermission(
        params.actorRole as unknown as LocalRole,
        membership.role as unknown as LocalRole,
      )
    }

    const updatedMembership = await this.membershipsRepository.updateRole(
      params.userId,
      params.companyId,
      params.role,
    )

    await this.auditService.logSafe({
      actorId: params.actorId,
      companyId: params.companyId,
      action: 'membership.role_updated',
      entityType: 'CompanyMembership',
      entityId: updatedMembership.id,
      metadata: {
        userId: params.userId,
        previousRole: membership.role,
        nextRole: updatedMembership.role,
        actorRole: params.actorRole,
      },
    })

    return updatedMembership
  }

  async getDetailedMembership(companyId: string, userId: string) {
    return this.membershipsRepository.findDetailedByUserAndCompany(userId, companyId)
  }

  async upsertMembership(data: {
    userId: string
    companyId: string
    role: Role
  }): Promise<CompanyMembership> {
    return this.membershipsRepository.upsert(data)
  }

  async hasSystemAdminCapability(userId: string): Promise<boolean> {
    return this.membershipsRepository.hasSystemAdminMembership(userId)
  }

  async upsertInTx(
    tx: Prisma.TransactionClient,
    data: { userId: string; companyId: string; role: Role },
  ): Promise<void> {
    return this.membershipsRepository.upsertInTx(tx, data)
  }
}
