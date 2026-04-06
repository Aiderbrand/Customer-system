import { renderHook, waitFor } from '@testing-library/react'
import { useCompaniesHub } from '@/features/companies/hooks/use-companies-hub'
import { companyService } from '@/lib/services/company-service'

const navigationState = {
  pathname: '/companies',
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => navigationState.searchParams,
}))

vi.mock('@/lib/services/company-service', () => ({
  companyService: {
    getCompaniesHub: vi.fn(),
  },
}))

describe('useCompaniesHub', () => {
  beforeEach(() => {
    navigationState.pathname = '/companies'
    navigationState.searchParams = new URLSearchParams()
    navigationState.replace.mockReset()
    vi.mocked(companyService.getCompaniesHub).mockReset()
  })

  it('normalizes invalid params and keeps selected company only when present in payload', async () => {
    navigationState.searchParams = new URLSearchParams('status=legacy&sort=weird&page=-1&company=comp-404')
    vi.mocked(companyService.getCompaniesHub).mockResolvedValue({
      items: [
        {
          id: 'comp-1',
          name: 'Aiderbrand',
          slug: 'aiderbrand',
          isActive: true,
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
          updatedAt: new Date('2026-04-02T10:00:00.000Z'),
          activeMemberCount: 3,
          pendingInvitationCount: 1,
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

    const { result } = renderHook(() => useCompaniesHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(companyService.getCompaniesHub).toHaveBeenCalledWith({
      q: '',
      status: undefined,
      sort: 'updatedAt.desc',
      page: 1,
    })
    expect(navigationState.replace).toHaveBeenCalled()
    expect(result.current.selectedCompany).toBeNull()
  })
})
