import { resolveScopedCompanyOptions, resolveScopedCompanySelection } from '@/lib/company-scope'

describe('company scope', () => {
  const availableCompanies = [
    { id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand', createdAt: new Date('2026-01-01T00:00:00Z') },
    { id: 'comp-2', name: 'Orbital', slug: 'orbital', createdAt: new Date('2026-01-02T00:00:00Z') },
  ]

  it('preserves accessible company selections', () => {
    expect(resolveScopedCompanySelection(availableCompanies, 'comp-2')).toEqual({
      selectedCompanyId: 'comp-2',
      isAccessible: true,
    })
  })

  it('fails closed when the requested company is outside the visible scope', () => {
    expect(resolveScopedCompanySelection(availableCompanies, 'comp-9')).toEqual({
      selectedCompanyId: null,
      isAccessible: false,
    })
  })

  it('uses real memberships as the only source of company options, even for simulated system admins', () => {
    expect(resolveScopedCompanyOptions({
      memberships: [
        {
          companyId: 'comp-1',
          companyName: 'Aiderbrand',
          companySlug: 'aiderbrand',
          role: 'SYSTEM_ADMIN',
          isActive: true,
        },
        {
          companyId: 'comp-2',
          companyName: 'Orbital',
          companySlug: 'orbital',
          role: 'PROJECT_LEAD',
          isActive: true,
        },
      ],
      effectiveRole: 'COLLABORATOR',
      actorHasSystemAdminCapability: true,
    })).toEqual([
      expect.objectContaining({ id: 'comp-1', name: 'Aiderbrand', slug: 'aiderbrand' }),
      expect.objectContaining({ id: 'comp-2', name: 'Orbital', slug: 'orbital' }),
    ])
  })
})
