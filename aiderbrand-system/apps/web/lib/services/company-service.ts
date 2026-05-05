import { apiClient } from '@/lib/api/client'
import type {
  CompanyActivityItem,
  CompanyDetailMembershipItem,
  CompanyDetailPayload,
  CompanyHubItem,
  CompanyHubPayload,
  CompanyHubSummary,
  Invitation,
} from '@/lib/types'
import type { Role } from '@/lib/types'

type CompanyStatusFilter = 'active' | 'inactive'
type CompanySort = 'name.asc' | 'name.desc' | 'updatedAt.asc' | 'updatedAt.desc' | 'status.asc' | 'status.desc'

interface CompaniesListApiResponse {
  items: Array<{
    id: string
    name: string
    slug: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    activeMemberCount: number
    pendingInvitationCount: number
  }>
  summary: CompanyHubSummary
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

interface CompanyActivityApiResponseItem {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  actorId: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

interface CompanyDtoApiResponse {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CompanyDetailMembershipApiResponseItem {
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

interface CompanyInvitationApiResponseItem {
  id: string
  companyId: string
  email: string
  role: Role
  status: Invitation['status']
  expiresAt: string
  createdById: string | null
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface CompanyDetailApiResponse {
  company: CompanyDtoApiResponse & {
    activeMemberCount: number
    pendingInvitationCount: number
  }
  members: CompanyDetailMembershipApiResponseItem[]
  invitations: CompanyInvitationApiResponseItem[]
  projects: Array<never>
  activity?: CompanyActivityApiResponseItem[]
}

interface CreateCompanyApiResponse {
  company: CompanyDtoApiResponse
  creatorMembership: {
    companyId: string
    role: Role
    isActive: boolean
  }
}

interface CreateInvitationApiResponse {
  invitation: CompanyInvitationApiResponseItem
  inviteToken: string
  inviteUrl: string | null
  delivery: {
    attempted: boolean
    sent: boolean
    reason: 'sent' | 'disabled' | 'failed' | 'email_queued'
    manualShareRequired: boolean
  }
}

interface CompanyScopeOptionApiResponse {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt?: string
}

function toHubItem(item: CompaniesListApiResponse['items'][number]): CompanyHubItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    isActive: item.isActive,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    activeMemberCount: item.activeMemberCount,
    pendingInvitationCount: item.pendingInvitationCount,
  }
}

function toCompany(item: CompanyDtoApiResponse): CompanyHubItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    isActive: item.isActive,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    activeMemberCount: 0,
    pendingInvitationCount: 0,
  }
}

function toActivityItem(item: CompanyActivityApiResponseItem): CompanyActivityItem {
  return {
    id: item.id,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    actorId: item.actorId,
    createdAt: new Date(item.createdAt),
    metadata: item.metadata,
  }
}

function toMembershipItem(item: CompanyDetailMembershipApiResponseItem): CompanyDetailMembershipItem {
  return {
    userId: item.userId,
    companyId: item.companyId,
    role: item.role,
    isActive: item.isActive,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    user: item.user,
  }
}

function toInvitation(item: CompanyInvitationApiResponseItem): Invitation {
  return {
    id: item.id,
    companyId: item.companyId,
    email: item.email,
    role: item.role,
    status: item.status,
    expiresAt: new Date(item.expiresAt),
    createdById: item.createdById,
    acceptedAt: item.acceptedAt ? new Date(item.acceptedAt) : null,
    revokedAt: item.revokedAt ? new Date(item.revokedAt) : null,
    createdAt: new Date(item.createdAt),
  }
}

export const companyService = {
  async getScopedOptions(): Promise<CompanyHubItem[]> {
    const payload = await apiClient.request<CompanyScopeOptionApiResponse[]>('/companies/options')

    return payload.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      createdAt: new Date(company.createdAt),
      updatedAt: company.updatedAt ? new Date(company.updatedAt) : new Date(company.createdAt),
      isActive: true,
      activeMemberCount: 0,
      pendingInvitationCount: 0,
    }))
  },

  async getCompaniesHub(params: {
    q?: string
    status?: CompanyStatusFilter
    sort?: CompanySort
    page?: number
  }): Promise<CompanyHubPayload> {
    const searchParams = new URLSearchParams()

    if (params.q?.trim()) searchParams.set('q', params.q.trim())
    if (params.status) searchParams.set('status', params.status)
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.page && params.page > 1) searchParams.set('page', String(params.page))

    const query = searchParams.toString()
    const payload = await apiClient.request<CompaniesListApiResponse>(`/companies${query ? `?${query}` : ''}`)

    return {
      items: payload.items.map(toHubItem),
      summary: payload.summary,
      page: payload.page,
      pageSize: payload.pageSize,
      totalItems: payload.totalItems,
      totalPages: payload.totalPages,
    }
  },

  async listActivity(companyId: string): Promise<CompanyActivityItem[]> {
    const payload = await apiClient.request<CompanyActivityApiResponseItem[]>(`/companies/${companyId}/activity`, {
      companyId,
    })

    return payload.map(toActivityItem)
  },

  async getCompanyDetail(companyId: string): Promise<CompanyDetailPayload> {
    const payload = await apiClient.request<CompanyDetailApiResponse>(`/companies/${companyId}`)

    return {
      company: {
        ...toCompany(payload.company),
        activeMemberCount: payload.company.activeMemberCount,
        pendingInvitationCount: payload.company.pendingInvitationCount,
      },
      members: payload.members.map(toMembershipItem),
      invitations: payload.invitations.map(toInvitation),
      projects: payload.projects,
      activity: payload.activity ? payload.activity.map(toActivityItem) : null,
    }
  },

  async createCompany(body: { name: string; slug?: string }) {
    const payload = await apiClient.request<CreateCompanyApiResponse>('/companies', {
      method: 'POST',
      body,
    })

    return {
      company: toCompany(payload.company),
      creatorMembership: payload.creatorMembership,
    }
  },

  async createInvitation(companyId: string, body: { email: string; role: Role; withOnboarding?: boolean }) {
    const payload = await apiClient.request<CreateInvitationApiResponse>(`/companies/${companyId}/invitations`, {
      method: 'POST',
      body,
    })

    return {
      invitation: toInvitation(payload.invitation),
      inviteToken: payload.inviteToken,
      inviteUrl: payload.inviteUrl,
      delivery: payload.delivery,
    }
  },

  async revokeInvitation(companyId: string, invitationId: string) {
    const payload = await apiClient.request<CompanyInvitationApiResponseItem>(`/companies/${companyId}/invitations/${invitationId}`, {
      method: 'DELETE',
    })

    return toInvitation(payload)
  },

  async updateMembershipStatus(companyId: string, userId: string, isActive: boolean) {
    const payload = await apiClient.request<CompanyDetailMembershipApiResponseItem>(
      `/companies/${companyId}/memberships/${userId}/status`,
      {
        method: 'PATCH',
        body: { isActive },
      },
    )

    return toMembershipItem(payload)
  },

  async updateMembershipRole(companyId: string, userId: string, role: Role) {
    const payload = await apiClient.request<CompanyDetailMembershipApiResponseItem>(
      `/companies/${companyId}/memberships/${userId}/role`,
      {
        method: 'PATCH',
        body: { role },
      },
    )

    return toMembershipItem(payload)
  },

  async updateCompany(companyId: string, body: { name?: string; slug?: string }) {
    return apiClient.request(`/companies/${companyId}`, {
      method: 'PATCH',
      body,
      companyId,
    })
  },

  async updateCompanyStatus(companyId: string, status: 'active' | 'inactive') {
    return apiClient.request(`/companies/${companyId}/status`, {
      method: 'PATCH',
      body: { status },
      companyId,
    })
  },
}
