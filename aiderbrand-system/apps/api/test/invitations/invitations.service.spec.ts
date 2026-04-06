import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { MembershipsService } from '../../src/memberships/memberships.service'
import { InvitationsService } from '../../src/invitations/invitations.service'
import { Role } from '../../src/common/enums/role.enum'

describe('InvitationsService', () => {
  const createConfigService = () =>
    ({
      get: jest.fn((key: string) => {
        if (key === 'app.invitation.expiresInHours') return 72
        return undefined
      }),
    })

  const createAuditService = () => ({
    logSafe: jest.fn().mockResolvedValue(undefined),
  })

  const createMailService = () => ({
    sendInvitationEmail: jest.fn().mockResolvedValue({
      attempted: true,
      sent: true,
      reason: 'sent',
    }),
  })

  const createInvitationsRepo = () => ({
    findPendingByEmailAndCompany: jest.fn(),
    generateToken: jest.fn(),
    create: jest.fn(),
    hash: jest.fn(),
    findValidByTokenHash: jest.fn(),
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('forbids an ACCOUNT_OWNER from inviting another ACCOUNT_OWNER', async () => {
    const invitationsRepo = createInvitationsRepo()
    const membershipsService = new MembershipsService({} as never)
    const service = new InvitationsService(
      invitationsRepo as never,
      membershipsService,
      createAuditService() as never,
      createMailService() as never,
      createConfigService() as never,
      {
        company: { findUnique: jest.fn() },
        user: { findUnique: jest.fn() },
      } as never,
    )

    await expect(
      service.create({
        actorId: 'user-1',
        actorRole: Role.ACCOUNT_OWNER as never,
        companyId: 'company-1',
        email: 'owner@example.com',
        role: Role.ACCOUNT_OWNER as never,
      }),
    ).rejects.toThrow(ForbiddenException)

    expect(invitationsRepo.create).not.toHaveBeenCalled()
  })

  it('rejects expired or already-consumed invitation tokens', async () => {
    const invitationsRepo = createInvitationsRepo()
    invitationsRepo.hash.mockReturnValue('hashed-token')
    invitationsRepo.findValidByTokenHash.mockResolvedValue(null)

    const service = new InvitationsService(
      invitationsRepo as never,
      new MembershipsService({} as never),
      createAuditService() as never,
      createMailService() as never,
      createConfigService() as never,
      {
        company: { findUnique: jest.fn() },
        user: { findUnique: jest.fn() },
      } as never,
    )

    await expect(service.validateToken('opaque-token')).rejects.toThrow(BadRequestException)
    expect(invitationsRepo.findValidByTokenHash).toHaveBeenCalledWith('hashed-token')
  })

  it('returns fallback invite url when delivery fails', async () => {
    const invitationsRepo = createInvitationsRepo()
    invitationsRepo.findPendingByEmailAndCompany.mockResolvedValue(null)
    invitationsRepo.generateToken.mockReturnValue({ rawToken: 'invite-token', tokenHash: 'hashed-token' })
    invitationsRepo.create.mockResolvedValue({
      id: 'inv-1',
      companyId: 'company-1',
      email: 'person@example.com',
      role: Role.COLLABORATOR,
      status: 'PENDING',
      expiresAt: new Date('2026-04-10T10:00:00.000Z'),
      createdById: 'user-1',
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-04-03T09:00:00.000Z'),
      updatedAt: new Date('2026-04-03T09:00:00.000Z'),
    })

    const prisma = {
      company: { findUnique: jest.fn().mockResolvedValue({ name: 'Aiderbrand' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ name: 'Lead User' }) },
    }
    const mailService = {
      sendInvitationEmail: jest.fn().mockResolvedValue({
        attempted: true,
        sent: false,
        reason: 'failed',
        errorMessage: 'smtp_down',
      }),
    }

    const service = new InvitationsService(
      invitationsRepo as never,
      new MembershipsService({} as never),
      createAuditService() as never,
      mailService as never,
      {
        get: jest.fn((key: string) => {
          if (key === 'app.invitation.expiresInHours') return 72
          if (key === 'app.frontendUrl') return 'https://app.aiderbrand.test'
          return undefined
        }),
      } as never,
      prisma as never,
    )

    const result = await service.create({
      actorId: 'user-1',
      actorRole: Role.PROJECT_LEAD as never,
      companyId: 'company-1',
      email: 'person@example.com',
      role: Role.COLLABORATOR as never,
    })

    expect(result.inviteUrl).toBe('https://app.aiderbrand.test/invite/invite-token')
    expect(result.delivery.sent).toBe(false)
  })
})
