import { apiClient } from './client'
import type { CompanyMembership, Invitation, Role, RoleSimulationSession, User } from '@/lib/types'

// ─── Onboarding types ─────────────────────────────────────────────────────────

export interface OnboardingTokenInfo {
  email: string
  companyId: string
  companyName: string
}

export interface DecisionMaker {
  name: string
  role: string
  email: string
}

export interface PrimaryContact {
  name: string
  role: string
  email: string
  phone?: string
}

export interface OnboardingFormAnswers {
  industry: string
  teamSize: string
  yearsOperating: string
  mainPainPoints: string
  toolsInUse: string[]
  decisionMakers: DecisionMaker[]
  primaryContact: PrimaryContact
  shortTermGoals: string
  midTermGoals: string
  successMetrics: string
  budgetRange?: string
  startTimeframe?: string
  notes?: string
}

export interface TeamInvite {
  email: string
  role: string
}

export interface CompleteOnboardingPayload {
  token: string
  name: string
  password: string
  formAnswers: OnboardingFormAnswers
  teamInvites?: TeamInvite[]
}

export interface OnboardingSubmission {
  id: string
  companyId: string
  industry: string | null
  teamSize: string | null
  yearsOperating: string | null
  mainPainPoints: string | null
  toolsInUse: string[]
  decisionMakers: DecisionMaker[]
  primaryContact: PrimaryContact | null
  shortTermGoals: string | null
  midTermGoals: string | null
  successMetrics: string | null
  budgetRange: string | null
  startTimeframe: string | null
  notes: string | null
  reviewedAt: Date | null
  reviewedById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthSession {
  accessToken: string
  user: User
  memberships: CompanyMembership[]
  actor: {
    hasSystemAdminCapability: boolean
    scope: {
      membershipCompanyIds: string[]
      realDataCompanyIds: string[]
    }
  }
  effective: {
    companyId: string | null
    role: Role | null
  }
  simulation: RoleSimulationSession | null
}

interface LoginApiResponse {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
  memberships: CompanyMembership[]
  actor: AuthSession['actor']
  effective: AuthSession['effective']
  simulation: SimulationApiResponse | null
}

interface SessionApiResponse {
  user: LoginApiResponse['user']
  memberships: CompanyMembership[]
  actor: AuthSession['actor']
  effective: AuthSession['effective']
  simulation: SimulationApiResponse | null
}

interface SimulationApiResponse {
  sessionId: string
  effectiveRole: Role
  startedAt: string
}

interface ValidateInvitationApiResponse {
  id: string
  email: string
  role: CompanyMembership['role']
  status: Invitation['status']
  expiresAt: string
}

function toUser(payload: LoginApiResponse['user']): User {
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl ?? undefined,
    createdAt: new Date(),
  }
}

function toSession(payload: LoginApiResponse): AuthSession {
  return {
    accessToken: payload.accessToken,
    user: toUser(payload.user),
    memberships: payload.memberships.filter((membership) => membership.isActive),
    actor: payload.actor,
    effective: payload.effective,
    simulation: payload.simulation ? toSimulation(payload.simulation) : null,
  }
}

function toSimulation(payload: SimulationApiResponse): RoleSimulationSession {
  return {
    sessionId: payload.sessionId,
    effectiveRole: payload.effectiveRole,
    startedAt: new Date(payload.startedAt),
  }
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const payload = await apiClient.request<LoginApiResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    return toSession(payload)
  },

  async refresh(accessToken?: string | null): Promise<{ accessToken: string }> {
    return apiClient.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      accessToken,
    })
  },

  async getSession(accessToken: string): Promise<AuthSession> {
    const payload = await apiClient.request<SessionApiResponse>('/auth/session', {
      method: 'GET',
      accessToken,
    })

    return {
      accessToken,
      user: toUser(payload.user),
      memberships: payload.memberships.filter((membership) => membership.isActive),
      actor: payload.actor,
      effective: payload.effective,
      simulation: payload.simulation ? toSimulation(payload.simulation) : null,
    }
  },

  async startRoleSimulation(
    accessToken: string,
    params: { effectiveRole: Role },
  ): Promise<AuthSession> {
    const payload = await apiClient.request<SessionApiResponse>('/auth/simulation', {
      method: 'POST',
      accessToken,
      body: params,
      companyId: null,
    })

    return {
      accessToken,
      user: toUser(payload.user),
      memberships: payload.memberships.filter((membership) => membership.isActive),
      actor: payload.actor,
      effective: payload.effective,
      simulation: payload.simulation ? toSimulation(payload.simulation) : null,
    }
  },

  async stopRoleSimulation(accessToken: string): Promise<AuthSession> {
    const payload = await apiClient.request<SessionApiResponse>('/auth/simulation', {
      method: 'DELETE',
      accessToken,
      companyId: null,
    })

    return {
      accessToken,
      user: toUser(payload.user),
      memberships: payload.memberships.filter((membership) => membership.isActive),
      actor: payload.actor,
      effective: payload.effective,
      simulation: payload.simulation ? toSimulation(payload.simulation) : null,
    }
  },

  async logout(accessToken?: string | null): Promise<void> {
    await apiClient.request('/auth/logout', {
      method: 'POST',
      accessToken,
    })
  },

  async acceptInvitation(params: {
    token: string
    name: string
    password: string
  }): Promise<AuthSession> {
    const payload = await apiClient.request<LoginApiResponse>('/auth/accept-invitation', {
      method: 'POST',
      body: params,
    })

    return toSession(payload)
  },

  async validateInvitationToken(token: string): Promise<Pick<Invitation, 'id' | 'email' | 'role' | 'status' | 'expiresAt'>> {
    const payload = await apiClient.request<ValidateInvitationApiResponse>(
      '/invitations/validate-token',
      {
        method: 'POST',
        body: { token },
      },
    )

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      status: payload.status,
      expiresAt: new Date(payload.expiresAt),
    }
  },

  async validateOnboardingToken(token: string): Promise<OnboardingTokenInfo> {
    return apiClient.request<OnboardingTokenInfo>('/onboarding/validate-token', {
      method: 'POST',
      body: { token },
    })
  },

  async submitOnboarding(payload: CompleteOnboardingPayload): Promise<{ session: AuthSession; projectName: string }> {
    const { accessToken, projectName } = await apiClient.request<{ accessToken: string; projectName: string }>('/onboarding/complete', {
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
    })
    const session = await authApi.getSession(accessToken)
    return { session, projectName }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    })
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    })
  },
}
