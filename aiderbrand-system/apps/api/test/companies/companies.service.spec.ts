import { ForbiddenException } from '@nestjs/common'
import { CompaniesService } from '../../src/companies/companies.service'
import { Role } from '../../src/common/enums/role.enum'

describe('CompaniesService', () => {
  function createService(repository: Record<string, unknown>) {
    return new CompaniesService(
      repository as never,
      { listMembershipsForCompany: jest.fn().mockResolvedValue([]) } as never,
      { listForCompany: jest.fn().mockResolvedValue([]) } as never,
    )
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('lists companies with normalized pagination defaults', async () => {
    const repository = {
      list: jest.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
        summary: {
          totalCompanies: 0,
          activeCompanies: 0,
          inactiveCompanies: 0,
          companiesWithPendingInvitations: 0,
        },
      }),
    }

    const service = createService(repository)

    await service.list({ q: ' aid ', status: 'active', sort: 'name.asc' })

    expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({
      search: 'aid',
      status: true,
      skip: 0,
      take: 10,
      orderBy: { name: 'asc' },
    }))
  })

  it('restricts company status changes to system admins', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        id: 'comp-1',
        name: 'Aiderbrand',
        slug: 'aiderbrand',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    }

    const service = createService(repository)

    await expect(
      service.updateStatus({
        companyId: 'comp-1',
        actorId: 'user-1',
        actorRole: Role.PROJECT_LEAD as never,
        status: 'inactive',
      }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('builds detail payload with activity only for system admins', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        id: 'comp-1',
        name: 'Aiderbrand',
        slug: 'aiderbrand',
        isActive: true,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
        updatedAt: new Date('2026-04-02T10:00:00.000Z'),
        deletedAt: null,
      }),
      listActivity: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
    }
    const membershipsService = {
      listMembershipsForCompany: jest.fn().mockResolvedValue([
        { isActive: true },
        { isActive: false },
      ]),
    }
    const invitationsService = {
      listForCompany: jest.fn().mockResolvedValue([
        { status: 'PENDING' },
        { status: 'REVOKED' },
      ]),
    }

    const service = new CompaniesService(
      repository as never,
      membershipsService as never,
      invitationsService as never,
    )

    const payload = await service.getDetail({
      companyId: 'comp-1',
      actorRole: Role.SYSTEM_ADMIN as never,
    })

    expect(payload.company.activeMemberCount).toBe(1)
    expect(payload.company.pendingInvitationCount).toBe(1)
    expect(payload.activity).toEqual([{ id: 'log-1' }])
    expect(payload.projects).toEqual([])
  })

  it('restricts company creation to system admins', async () => {
    const repository = {
      findBySlug: jest.fn(),
    }

    const service = createService(repository)

    await expect(service.create({
      actorId: 'user-1',
      actorRole: Role.PROJECT_LEAD as never,
      name: 'Northwind',
    })).rejects.toThrow(ForbiddenException)
  })
})
