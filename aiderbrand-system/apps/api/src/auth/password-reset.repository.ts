import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { createHash, randomBytes } from 'crypto'
import type { PasswordResetToken } from '@prisma/client'

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

  /** Hash an opaque token with SHA-256 for DB storage */
  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
  }

  /** Generate a new opaque reset token (raw, 48 bytes = 96 hex chars) */
  generate(): string {
    return randomBytes(48).toString('hex')
  }

  /**
   * Invalidate all existing (unused) tokens for a user, then create a new one.
   * This ensures only the latest token is valid — no stale tokens floating around.
   *
   * Returns { rawToken, record } so the service can embed the raw token in a URL.
   */
  async invalidatePriorAndCreate(
    userId: string,
    expiresAt: Date,
  ): Promise<{ rawToken: string; record: PasswordResetToken }> {
    // Invalidate any prior unused tokens (mark as used immediately)
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })

    // Generate fresh token
    const rawToken = this.generate()
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
}
