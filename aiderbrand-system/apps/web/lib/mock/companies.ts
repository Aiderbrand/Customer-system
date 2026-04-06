import type { Company } from '@/lib/types'

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    name: 'Aiderbrand',
    slug: 'aiderbrand',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'comp-2',
    name: 'Acme Solutions',
    slug: 'acme',
    createdAt: new Date('2024-02-01'),
  },
]
