import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { createHash, randomBytes } from 'crypto'
import type { Invitation, InvitationStatus, Role } from '@prisma/client'

/**
 * InvitationsRepository — manages invitation lifecycle.
 *
 * Token design:
 * - Raw opaque token: crypto.randomBytes(48) → hex (96 chars)
 * - Stored in DB: SHA-256(rawToken) in tokenHash column (UNIQUE)
 * - The raw token is only returned at creation time and sent via email
 *
 * Invariants:
 * - Only one PENDING invite per (email, companyId) — enforced at app level
 *   since Prisma doesn't support partial unique indexes directly
 * - Expired invites are resolved on-read (status set to EXPIRED lazily)
 */
@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate a cryptographically secure opaque invitation token */
  generateToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(48).toString('hex') // 96 hex chars
    const tokenHash = this.hash(rawToken)
    return { rawToken, tokenHash }
  }

  /** SHA-256 hash of a raw opaque token */
  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
  }

  /** Create a new PENDING invitation */
  async create(data: {
    companyId: string
    email: string
    role: Role
    tokenHash: string
    expiresAt: Date
    createdById?: string
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
   * Sets status to EXPIRED on-read if the invite has expired.
   */
  async findValidByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    })

    if (!invitation) return null

    // Lazily expire if past expiry
    if (invitation.status === 'PENDING' && invitation.expiresAt <= new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return null
    }

    if (invitation.status !== 'PENDING') return null

    return invitation
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
}
