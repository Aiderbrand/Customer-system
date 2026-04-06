import type { CompanyMembership } from '@/lib/types'

export const MOCK_COMPANY_MEMBERSHIPS: Record<string, CompanyMembership[]> = {
  'user-1': [
    {
      companyId: 'comp-1',
      companyName: 'Aiderbrand',
      companySlug: 'aiderbrand',
      role: 'SYSTEM_ADMIN',
      isActive: true,
    },
  ],
  'user-2': [
    {
      companyId: 'comp-1',
      companyName: 'Aiderbrand',
      companySlug: 'aiderbrand',
      role: 'PROJECT_LEAD',
      isActive: true,
    },
  ],
  'user-3': [
    {
      companyId: 'comp-1',
      companyName: 'Aiderbrand',
      companySlug: 'aiderbrand',
      role: 'DELIVERY_SPECIALIST',
      isActive: true,
    },
  ],
  'user-4': [
    {
      companyId: 'comp-2',
      companyName: 'Acme Solutions',
      companySlug: 'acme',
      role: 'ACCOUNT_OWNER',
      isActive: true,
    },
  ],
  'user-5': [
    {
      companyId: 'comp-2',
      companyName: 'Acme Solutions',
      companySlug: 'acme',
      role: 'COLLABORATOR',
      isActive: true,
    },
  ],
}
