import type { Role } from '@prisma/client'

export interface CompanyDto {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CompanyCreatorMembershipDto {
  companyId: string
  role: Role
  isActive: boolean
}

export interface CreateCompanyResponseDto {
  company: CompanyDto
  creatorMembership: CompanyCreatorMembershipDto
}

export interface CompanyHubItemDto extends CompanyDto {
  activeMemberCount: number
  pendingInvitationCount: number
}

export interface CompanyMembershipDetailItemDto {
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

export interface CompanyInvitationDetailItemDto {
  id: string
  companyId: string
  email: string
  role: Role
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
  createdById: string | null
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface CompanyDetailResponseDto {
  company: CompanyHubItemDto
  members: CompanyMembershipDetailItemDto[]
  invitations: CompanyInvitationDetailItemDto[]
  projects: Array<never>
  activity?: CompanyActivityItemDto[]
}

export interface CompanyHubSummaryDto {
  totalCompanies: number
  activeCompanies: number
  inactiveCompanies: number
  companiesWithPendingInvitations: number
}

export interface CompaniesListResponseDto {
  items: CompanyHubItemDto[]
  summary: CompanyHubSummaryDto
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface CompanyActivityItemDto {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  actorId: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface CompanyScopeOptionDto {
  id: string
  name: string
  slug: string
  createdAt: string
}
