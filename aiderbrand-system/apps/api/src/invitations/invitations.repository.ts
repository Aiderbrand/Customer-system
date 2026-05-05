import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { InvitationStatus } from '@prisma/client'
import type { Invitation, InvitationType, Role, Prisma } from '@prisma/client'
import { hashToken } from '../common/utils/crypto'

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  hash(rawToken: string): string {
    return hashToken(rawToken)
  }

  /** Create a new PENDING invitation */
  async create(data: {
    companyId: string
    email: string
    role: Role
    tokenHash: string
    expiresAt: Date
    createdById?: string
    type?: InvitationType
  }): Promise<Invitation> {
    return this.prisma.invitation.create({ data })
  }

  /** Find a pending invitation by (email, companyId) — for duplicate detection */
  async findPendingByEmailAndCompany(
    email: string,
    companyId: string,
  ): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        email,
        companyId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })
  }

  /**
   * Find an invitation by its token hash.
   * Returns the invitation regardless of status (caller validates).
   */
  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.prisma.invitation.findUnique({
      where: { tokenHash },
    })
  }

  /**
   * Find a valid (PENDING + not expired) invitation by token hash.
   * Pure read — callers must handle lazy expiry via expireById() if needed.
   */
  async findValidByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        tokenHash,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    })
  }

  /** Mark an invitation as EXPIRED (used by service for lazy expiry on-read) */
  async expireById(id: string): Promise<void> {
    await this.prisma.invitation.update({
      where: { id },
      data: { status: 'EXPIRED' },
    })
  }

  /** List all invitations for a company, optionally filtered by status */
  async findAllByCompany(
    companyId: string,
    status?: InvitationStatus,
  ): Promise<Invitation[]> {
    return this.prisma.invitation.findMany({
      where: {
        companyId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Mark an invitation as ACCEPTED (inside a transaction) */
  async accept(id: string): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    })
  }

  /** Mark an invitation as REVOKED */
  async revoke(id: string): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    })
  }

  /** Find an invitation by ID */
  async findById(id: string): Promise<Invitation | null> {
    return this.prisma.invitation.findUnique({ where: { id } })
  }

  /** Find an invitation by ID inside a transaction */
  async findByIdInTx(tx: Prisma.TransactionClient, id: string): Promise<Invitation | null> {
    return tx.invitation.findUnique({ where: { id } })
  }

  /** Mark an invitation ACCEPTED inside a transaction (by invitation ID) */
  async acceptInTx(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.invitation.update({
      where: { id },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
    })
  }

  /** Mark an invitation ACCEPTED inside a transaction (by token hash) */
  async acceptByTokenHashInTx(tx: Prisma.TransactionClient, tokenHash: string): Promise<void> {
    await tx.invitation.update({
      where: { tokenHash },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
    })
  }
}
