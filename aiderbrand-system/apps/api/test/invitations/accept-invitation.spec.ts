import { BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from '../../src/auth/auth.service'

describe('AuthService.acceptInvitation', () => {
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
    }

    const refreshTokenRepo = {
      hash: jest.fn().mockReturnValue('refresh-token-hash'),
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
      hash: jest.fn().mockReturnValue('invitation-token-hash'),
    }

    const prisma = {
      $transaction: jest.fn(),
      companyMembership: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    const roleSimulationRepository = {
      findActiveByActorOrFailClosed: jest.fn().mockResolvedValue(null),
      stopActive: jest.fn(),
    }

    const mailService = {
      sendPasswordResetEmail: jest.fn(),
    }

    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-access-token'),
    }

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.jwt.refreshExpiresIn') return '7d'
        if (key === 'app.jwt.accessExpiresIn') return '15m'
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
      refreshTokenRepo,
      invitationsService,
      prisma,
      jwtService,
    }
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('accepts a valid invitation for a new user and returns an authenticated session', async () => {
    const ctx = createService()
    const invitation = {
      id: 'invite-1',
      email: 'invitee@example.com',
      companyId: 'company-1',
      role: 'COLLABORATOR',
    }

    ctx.invitationsService.validateToken.mockResolvedValue(invitation)
    ctx.usersService.findByIdOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'invitee@example.com',
      name: 'New Invitee',
      avatarUrl: null,
    })
    ctx.membershipsService.getMembershipsForUser.mockResolvedValue([
      {
        companyId: 'company-1',
        role: 'COLLABORATOR',
        isActive: true,
        company: { name: 'Company One', slug: 'company-one' },
      },
    ])

    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'invitee@example.com',
          name: 'New Invitee',
          avatarUrl: null,
        }),
        update: jest.fn(),
      },
      companyMembership: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      invitation: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    }

    ctx.prisma.$transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<void>) => {
      await callback(tx)
    })

    const result = await ctx.service.acceptInvitation({
      rawToken: 'opaque-token',
      name: 'New Invitee',
      password: 'Password123!',
    })

    const createdUserArgs = tx.user.create.mock.calls[0]?.[0]

    expect(createdUserArgs).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'invitee@example.com',
          passwordHash: expect.any(String),
          name: 'New Invitee',
        }),
      }),
    )
    expect(createdUserArgs.data.passwordHash).not.toBe('Password123!')
    expect(tx.companyMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_companyId: { userId: 'user-1', companyId: 'company-1' },
        },
        create: expect.objectContaining({ role: 'COLLABORATOR' }),
      }),
    )
    expect(tx.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACCEPTED' }) }),
    )
    expect(tx.refreshToken.create).toHaveBeenCalled()
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'invitation.accepted',
          companyId: 'company-1',
        }),
      }),
    )
    expect(result.response).toEqual({
      accessToken: 'signed-access-token',
      user: {
        id: 'user-1',
        email: 'invitee@example.com',
        name: 'New Invitee',
        avatarUrl: null,
      },
      memberships: [
        {
          companyId: 'company-1',
          companyName: 'Company One',
          companySlug: 'company-one',
          role: 'COLLABORATOR',
          isActive: true,
        },
      ],
      actor: {
        hasSystemAdminCapability: false,
        scope: {
          membershipCompanyIds: ['company-1'],
          realDataCompanyIds: ['company-1'],
        },
      },
      effective: { companyId: null, role: 'COLLABORATOR' },
      simulation: null,
    })
    expect(result.rawRefreshToken).toEqual(expect.any(String))
    expect(ctx.jwtService.sign).toHaveBeenCalledWith(
      { sub: 'user-1', email: 'invitee@example.com', type: 'access' },
      { expiresIn: '15m' },
    )
  })

  it('attaches membership to an existing invited user instead of recreating the account', async () => {
    const ctx = createService()
    const invitation = {
      id: 'invite-2',
      email: 'existing@example.com',
      companyId: 'company-2',
      role: 'ACCOUNT_OWNER',
    }

    ctx.invitationsService.validateToken.mockResolvedValue(invitation)
    ctx.usersService.findByIdOrThrow.mockResolvedValue({
      id: 'user-existing',
      email: 'existing@example.com',
      name: 'Updated Name',
      avatarUrl: null,
    })
    ctx.membershipsService.getMembershipsForUser.mockResolvedValue([
      {
        companyId: 'company-2',
        role: 'ACCOUNT_OWNER',
        isActive: true,
        company: { name: 'Company Two', slug: 'company-two' },
      },
    ])

    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-existing',
          email: 'existing@example.com',
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: 'user-existing',
          email: 'existing@example.com',
          name: 'Updated Name',
          avatarUrl: null,
        }),
      },
      companyMembership: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      invitation: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    }

    ctx.prisma.$transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<void>) => {
      await callback(tx)
    })

    await ctx.service.acceptInvitation({
      rawToken: 'opaque-token',
      name: 'Updated Name',
      password: 'Password123!',
    })

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-existing' },
        data: expect.objectContaining({ name: 'Updated Name' }),
      }),
    )
    expect(tx.user.create).not.toHaveBeenCalled()
    expect(tx.companyMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_companyId: {
            userId: 'user-existing',
            companyId: 'company-2',
          },
        },
        update: expect.objectContaining({ role: 'ACCOUNT_OWNER', isActive: true }),
      }),
    )
  })

  it('fails fast when the invitation token is expired or revoked', async () => {
    const ctx = createService()
    ctx.invitationsService.validateToken.mockRejectedValue(
      new BadRequestException('Invitation token is invalid, expired, or already used'),
    )

    await expect(
      ctx.service.acceptInvitation({
        rawToken: 'expired-token',
        name: 'Blocked User',
        password: 'Password123!',
      }),
    ).rejects.toThrow(BadRequestException)

    expect(ctx.prisma.$transaction).not.toHaveBeenCalled()
  })
})
