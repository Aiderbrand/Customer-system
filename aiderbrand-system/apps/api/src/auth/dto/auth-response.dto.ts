import type { Role } from '@prisma/client'

/**
 * MembershipDto — compact membership item returned in login response.
 * Includes company info inline for frontend convenience.
 */
export interface MembershipDto {
  companyId: string
  companyName: string
  companySlug: string
  role: Role
  isActive: boolean
}

export interface ActorContextDto {
  hasSystemAdminCapability: boolean
  scope: {
    membershipCompanyIds: string[]
    realDataCompanyIds: string[]
  }
}

export interface EffectiveContextDto {
  companyId: string | null
  role: Role | null
}

export interface SimulationSessionDto {
  sessionId: string
  effectiveRole: Role
  startedAt: string
}

/**
 * LoginResponseDto — the response body for POST /auth/login.
 *
 * The JWT access token is returned in the body.
 * The refresh token is set as an httpOnly cookie (not in this body).
 */
export interface LoginResponseDto {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
  memberships: MembershipDto[]
  actor: ActorContextDto
  effective: EffectiveContextDto
  simulation: SimulationSessionDto | null
}

export interface SessionResponseDto {
  user: LoginResponseDto['user']
  memberships: MembershipDto[]
  actor: ActorContextDto
  effective: EffectiveContextDto
  simulation: SimulationSessionDto | null
}
