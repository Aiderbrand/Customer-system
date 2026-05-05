import type { Role } from '@/lib/types'

export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PROJECT_LEAD: 'PROJECT_LEAD',
  DELIVERY_SPECIALIST: 'DELIVERY_SPECIALIST',
  ACCOUNT_OWNER: 'ACCOUNT_OWNER',
  COLLABORATOR: 'COLLABORATOR',
} as const satisfies Record<string, Role>
