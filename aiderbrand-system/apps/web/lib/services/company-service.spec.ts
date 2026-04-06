import { companyService } from '@/lib/services/company-service'
import { apiClient } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    request: vi.fn(),
  },
}))

describe('companyService', () => {
  it('maps list payload dates and preserves aggregate fields', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      items: [
        {
          id: 'comp-1',
          name: 'Aiderbrand',
          slug: 'aiderbrand',
          isActive: true,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
          activeMemberCount: 4,
          pendingInvitationCount: 2,
        },
      ],
      summary: {
        totalCompanies: 1,
        activeCompanies: 1,
        inactiveCompanies: 0,
        companiesWithPendingInvitations: 1,
      },
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    })

    const payload = await companyService.getCompaniesHub({ q: 'aid', status: 'active', sort: 'name.asc', page: 2 })

    expect(apiClient.request).toHaveBeenCalledWith('/companies?q=aid&status=active&sort=name.asc&page=2')
    expect(payload.items[0]).toEqual(expect.objectContaining({
      id: 'comp-1',
      activeMemberCount: 4,
      pendingInvitationCount: 2,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    }))
  })

  it('creates a company without injecting company scope headers', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      company: {
        id: 'comp-2',
        name: 'Northwind',
        slug: 'northwind',
        isActive: true,
        createdAt: '2026-04-03T10:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      },
      creatorMembership: {
        companyId: 'comp-2',
        role: 'SYSTEM_ADMIN',
        isActive: true,
      },
    })

    const payload = await companyService.createCompany({ name: 'Northwind' })

    expect(apiClient.request).toHaveBeenCalledWith('/companies', {
      method: 'POST',
      body: { name: 'Northwind' },
    })
    expect(payload.company.createdAt).toBeInstanceOf(Date)
  })

  it('maps company detail memberships and invitations', async () => {
    vi.mocked(apiClient.request).mockResolvedValueOnce({
      company: {
        id: 'comp-1',
        name: 'Aiderbrand',
        slug: 'aiderbrand',
        isActive: true,
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        activeMemberCount: 2,
        pendingInvitationCount: 1,
      },
      members: [
        {
          userId: 'user-1',
          companyId: 'comp-1',
          role: 'PROJECT_LEAD',
          isActive: true,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
          user: {
            id: 'user-1',
            email: 'lead@example.com',
            name: 'Lead User',
            avatarUrl: null,
          },
        },
      ],
      invitations: [
        {
          id: 'inv-1',
          companyId: 'comp-1',
          email: 'new@example.com',
          role: 'COLLABORATOR',
          status: 'PENDING',
          expiresAt: '2026-04-10T10:00:00.000Z',
          createdById: 'user-1',
          acceptedAt: null,
          revokedAt: null,
          createdAt: '2026-04-02T10:00:00.000Z',
        },
      ],
      projects: [],
      activity: [],
    })

    const payload = await companyService.getCompanyDetail('comp-1')

    expect(apiClient.request).toHaveBeenCalledWith('/companies/comp-1')
    expect(payload.company.activeMemberCount).toBe(2)
    expect(payload.members[0]?.updatedAt).toBeInstanceOf(Date)
    expect(payload.invitations[0]?.expiresAt).toBeInstanceOf(Date)
  })
})
