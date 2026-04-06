import { ForbiddenException } from '@nestjs/common'
import { MembershipsService } from '../../src/memberships/memberships.service'
import { Role } from '../../src/common/enums/role.enum'

describe('MembershipsService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('lets project leads list inactive memberships when requested', async () => {
    const repository = {
      findAllByCompanyWithStatus: jest.fn().mockResolvedValue([]),
    }

    const service = new MembershipsService(repository as never, { logSafe: jest.fn() } as never)

    await service.listMembershipsForCompany('comp-1', 'inactive')

    expect(repository.findAllByCompanyWithStatus).toHaveBeenCalledWith('comp-1', false)
  })

  it('blocks project leads from toggling system admin memberships', async () => {
    const repository = {
      findByUserAndCompany: jest.fn().mockResolvedValue({
        id: 'membership-1',
        companyId: 'comp-1',
        userId: 'user-2',
        role: Role.SYSTEM_ADMIN,
        isActive: true,
      }),
    }

    const service = new MembershipsService(repository as never, { logSafe: jest.fn() } as never)

    await expect(
      service.updateMembershipStatus({
        actorId: 'user-1',
        actorRole: Role.PROJECT_LEAD as never,
        companyId: 'comp-1',
        userId: 'user-2',
        isActive: false,
      }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('updates an existing membership role with audit logging', async () => {
    const repository = {
      findByUserAndCompany: jest.fn().mockResolvedValue({
        id: 'membership-1',
        companyId: 'comp-1',
        userId: 'user-2',
        role: Role.COLLABORATOR,
        isActive: true,
      }),
      updateRole: jest.fn().mockResolvedValue({
        id: 'membership-1',
        companyId: 'comp-1',
        userId: 'user-2',
        role: Role.ACCOUNT_OWNER,
        isActive: true,
      }),
    }
    const auditService = { logSafe: jest.fn().mockResolvedValue(undefined) }
    const service = new MembershipsService(repository as never, auditService as never)

    const result = await service.updateMembershipRole({
      actorId: 'user-1',
      actorRole: Role.PROJECT_LEAD as never,
      companyId: 'comp-1',
      userId: 'user-2',
      role: Role.ACCOUNT_OWNER as never,
    })

    expect(repository.updateRole).toHaveBeenCalledWith('user-2', 'comp-1', Role.ACCOUNT_OWNER)
    expect(auditService.logSafe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'membership.role_updated' }),
    )
    expect(result.role).toBe(Role.ACCOUNT_OWNER)
  })
})
