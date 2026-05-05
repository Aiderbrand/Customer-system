import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { PasswordResetToken, Prisma } from '@prisma/client'
import { hashToken } from '../common/utils/crypto'

/**
 * PasswordResetRepository — manages the lifecycle of password reset tokens.
 *
 * Tokens are opaque (crypto.randomBytes), stored as SHA-256 hashes.
 * The raw token is only ever returned at creation time (never stored in plaintext).
 *
 * Rules:
 * - Only one valid (non-used, non-expired) token per user at a time.
 *   Prior tokens are invalidated before creating a new one.
 * - Token expiry is configurable (default 1h via PASSWORD_RESET_EXPIRES_IN_HOURS).
 */
@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  hash(rawToken: string): string {
    return hashToken(rawToken)
  }

  /** Invalidate all unused tokens for a user (mark as used). Call before createToken. */
  async invalidateAllUnusedForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
  }

  /** Create a reset token record from a caller-supplied raw token. Returns DB record. */
  async createToken(
    userId: string,
    rawToken: string,
    expiresAt: Date,
  ): Promise<{ rawToken: string; record: PasswordResetToken }> {
    const tokenHash = this.hash(rawToken)
    const record = await this.prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    })
    return { rawToken, record }
  }

  /**
   * Find a valid (unused, non-expired) token by its hash.
   * Returns null if the token does not exist, was already used, or has expired.
   */
  async findValid(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
  }

  /** Mark a token as used (one-time use enforcement) */
  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }

  /** Mark a token as used inside an existing transaction */
  async markUsedByIdInTx(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }
}
