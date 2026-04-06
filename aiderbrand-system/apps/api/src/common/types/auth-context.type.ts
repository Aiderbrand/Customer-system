import type { Request } from 'express'
import type { Role } from '@prisma/client'

export interface AuthSimulationSummary {
  sessionId: string
  effectiveRole: Role
  startedAt: Date
}

export interface ActorScopeSummary {
  membershipCompanyIds: string[]
  realDataCompanyIds: string[]
}

export interface AuthContextData {
  actorUserId: string
  actorEmail: string
  actorHasSystemAdminCapability: boolean
  actorScope: ActorScopeSummary
  scopedCompanyId: string | null
  effectiveRole: Role | null
  realMembershipRole: Role | null
  simulation: AuthSimulationSummary | null
}

export interface RequestWithAuthContext extends Request {
  authContext?: AuthContextData
}
