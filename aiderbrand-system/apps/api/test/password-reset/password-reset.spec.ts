import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AuthController } from '../../src/auth/auth.controller'
import { AuthService } from '../../src/auth/auth.service'

describe('Password reset flows', () => {
  const createControllerConfig = (nodeEnv: 'development' | 'production' = 'development') =>
    ({
      get: jest.fn((key: string) => {
        if (key === 'app.nodeEnv') return nodeEnv
        return undefined
      }),
    }) as unknown as ConfigService

  const createAuthServiceForController = () => ({
    forgotPassword: jest.fn(),
  })

  const createService = () => {
    const usersService = {
      findByEmail: jest.fn(),
      findByIdOrThrow: jest.fn(),
    }

    const membershipsService = {
      getMembershipsForUser: jest.fn(),
    }

    const auditService = {
      logSafe: jest.fn().mockResolvedValue(undefined),
      withAuthContext: jest.fn((metadata) => metadata),
    }

    const refreshTokenRepo = {
      hash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      findValid: jest.fn(),
    }

    const passwordResetRepo = {
      hash: jest.fn(),
      findValid: jest.fn(),
      invalidatePriorAndCreate: jest.fn(),
    }

    const invitationsService = {
      validateToken: jest.fn(),
    }

    const invitationsRepo = {
      hash: jest.fn(),
    }

    const prisma = {
      $transaction: jest.fn(),
    }

    const roleSimulationRepository = {
      findActiveByActorOrFailClosed: jest.fn().mockResolvedValue(null),
      stopActive: jest.fn(),
    }

    const mailService = {
      sendPasswordResetEmail: jest.fn(),
    }

    const jwtService = {
      sign: jest.fn(),
    }

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.passwordReset.expiresInHours') return 1
        if (key === 'app.frontendUrl') return 'https://app.aiderbrand.test'
        if (key === 'app.jwt.accessExpiresIn') return '15m'
        if (key === 'app.jwt.refreshExpiresIn') return '7d'
        return undefined
      }),
    }

    const service = new AuthService(
      usersService as never,
      membershipsService as never,
      auditService as never,
      refreshTokenRepo as never,
      passwordResetRepo as never,
      invitationsService as never,
      invitationsRepo as never,
      prisma as never,
      roleSimulationRepository as never,
      mailService as never,
      jwtService as JwtService,
      configService as never,
    )

    return {
      service,
      usersService,
      membershipsService,
      auditService,
      passwordResetRepo,
      prisma,
      mailService,
    }
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('keeps forgot-password non-oracle for unknown emails', async () => {
    const authService = createAuthServiceForController()
    authService.forgotPassword.mockResolvedValue(undefined)
    const controller = new AuthController(
      authService as never,
      createControllerConfig('development'),
    )

    const result = await controller.forgotPassword({ email: 'missing@example.com' })

    expect(result).toEqual({
      message: 'If the email is registered, a password reset link has been sent.',
    })
    expect(authService.forgotPassword).toHaveBeenCalledWith('missing@example.com')
  })

  it('rejects reset-password when the token was already used or expired', async () => {
    const ctx = createService()
    ctx.passwordResetRepo.hash.mockReturnValue('reset-token-hash')
    ctx.passwordResetRepo.findValid.mockResolvedValue(null)

    await expect(ctx.service.resetPassword('used-token', 'NewPassword123!')).rejects.toThrow(
      BadRequestException,
    )

    expect(ctx.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('resets the password, marks the token used, and revokes all refresh tokens', async () => {
    const ctx = createService()
    ctx.passwordResetRepo.hash.mockReturnValue('reset-token-hash')
    ctx.passwordResetRepo.findValid.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      tokenHash: 'reset-token-hash',
    })
    ctx.membershipsService.getMembershipsForUser.mockResolvedValue([
      { companyId: 'company-1', isActive: true },
      { companyId: 'company-2', isActive: false },
    ])

    const tx = {
      user: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      passwordResetToken: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    }

    ctx.prisma.$transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<void>) => {
      await callback(tx)
    })

    await ctx.service.resetPassword('valid-token', 'NewPassword123!')

    const passwordUpdateArgs = tx.user.update.mock.calls[0]?.[0]

    expect(passwordUpdateArgs).toEqual(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      }),
    )
    expect(passwordUpdateArgs.data.passwordHash).not.toBe('NewPassword123!')
    expect(tx.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'reset-1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    )
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null },
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'password.reset',
          metadata: expect.objectContaining({ companyIds: ['company-1'] }),
        }),
      }),
    )
  })

  it('generates an admin reset link and audits the target user and company context', async () => {
    const ctx = createService()
    ctx.usersService.findByIdOrThrow.mockResolvedValue({
      id: 'target-user',
      email: 'target@example.com',
      isActive: true,
    })
    ctx.passwordResetRepo.invalidatePriorAndCreate.mockResolvedValue({
      rawToken: 'raw-reset-token',
      record: { id: 'reset-record-1' },
    })

    const result = await ctx.service.generateAdminResetLink(
      'admin-user',
      'target-user',
      'company-admin',
    )

    expect(result).toEqual({
      resetUrl: 'https://app.aiderbrand.test/reset-password?token=raw-reset-token',
    })
    expect(ctx.auditService.logSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-user',
        companyId: 'company-admin',
        action: 'password_reset_link.generated',
        entityId: 'target-user',
        metadata: expect.objectContaining({
          targetUserId: 'target-user',
          targetEmail: 'target@example.com',
          tokenId: 'reset-record-1',
        }),
      }),
    )
  })

  it('sends a password reset email when mail is enabled', async () => {
    const ctx = createService()
    ctx.usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Person',
      isActive: true,
    })
    ctx.passwordResetRepo.invalidatePriorAndCreate.mockResolvedValue({
      rawToken: 'reset-opaque-token',
    })
    ctx.mailService.sendPasswordResetEmail.mockResolvedValue({
      attempted: true,
      sent: true,
      reason: 'sent',
    })

    await ctx.service.forgotPassword('person@example.com')

    expect(ctx.mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'person@example.com',
        resetUrl: 'https://app.aiderbrand.test/reset-password?token=reset-opaque-token',
      }),
    )
    expect(ctx.auditService.logSafe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'password_reset.email_sent' }),
    )
  })
})
