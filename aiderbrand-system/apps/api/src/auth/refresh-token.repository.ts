import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { RefreshToken } from '@prisma/client'
import { createHash } from 'crypto'

/**
 * RefreshTokenRepository — manages server-side refresh token lifecycle.
 *
 * Tokens are stored as SHA-256 hashes. The opaque raw token is never persisted.
 * This enables server-side revocation (e.g. on password reset or logout).
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Hash an opaque token with SHA-256 for DB storage */
  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
  }

  /** Create a new refresh token record */
  async create(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data })
  }

  /** Find a non-revoked, non-expired token by its hash */
  async findValid(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
  }

  /** Revoke a single refresh token (by DB id) */
  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  /** Revoke all active refresh tokens for a user (e.g. on password reset) */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
