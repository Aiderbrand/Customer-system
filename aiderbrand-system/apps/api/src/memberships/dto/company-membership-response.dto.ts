import type { Role } from '@prisma/client'

export interface CompanyMembershipItemDto {
  userId: string
  companyId: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
}
