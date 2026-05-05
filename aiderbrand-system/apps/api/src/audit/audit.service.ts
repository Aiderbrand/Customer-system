import { Injectable, Logger } from '@nestjs/common'
import type { AuditLog, Role } from '@prisma/client'
import { AuditRepository } from './audit.repository'
import type { AuthContextData } from '../common/types'
import type { CreateAuditLogDto } from './audit.dto'

export type { CreateAuditLogDto }

export interface AuditAuthContextMetadata {
  actorUserId: string
  actorEmail: string
  actorHasSystemAdminCapability: boolean
  actorScope: {
    membershipCompanyIds: string[]
    realDataCompanyIds: string[]
  }
  scopedCompanyId: string | null
  effectiveRole: Role | null
  realMembershipRole: Role | null
  simulation: null | {
    sessionId: string
    effectiveRole: Role
    startedAt: Date | string
  }
}

/**
 * AuditService — audit log operations: writes and scoped reads.
 *
 * Rules:
 * - Never throws on audit failure (log and continue — audit must not block flows)
 * - Audit writes happen INSIDE transactions in calling services for critical actions
 * - This service also exposes a fire-and-forget variant for non-critical logging
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly auditRepository: AuditRepository) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    await this.auditRepository.create(dto)
  }

  async listByCompanyId(companyId: string, take = 20): Promise<AuditLog[]> {
    return this.auditRepository.findByCompanyId(companyId, take)
  }

  /**
   * Fire-and-forget audit log. Swallows errors to never block the main flow.
   * Use for non-critical / informational audit events.
   */
  async logSafe(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.log(dto)
    } catch (err) {
      this.logger.error('Failed to write audit log (non-critical)', {
        action: dto.action,
        error: err,
      })
    }
  }

  withAuthContext(
    metadata: Record<string, unknown> | undefined,
    authContext?: AuthContextData | null,
  ): Record<string, unknown> | undefined {
    return this.withAuditAuthContext(
      metadata,
      authContext ? this.toAuthContextMetadata(authContext) : null,
    )
  }

  withAuditAuthContext(
    metadata: Record<string, unknown> | undefined,
    authContext?: AuditAuthContextMetadata | null,
  ): Record<string, unknown> | undefined {
    if (!authContext) {
      return metadata
    }

    return {
      ...(metadata ?? {}),
      authContext,
    }
  }

  toAuthContextMetadata(authContext: AuthContextData): AuditAuthContextMetadata {
    return {
      actorUserId: authContext.actorUserId,
      actorEmail: authContext.actorEmail,
      actorHasSystemAdminCapability: authContext.actorHasSystemAdminCapability,
      actorScope: {
        membershipCompanyIds: [...authContext.actorScope.membershipCompanyIds],
        realDataCompanyIds: [...authContext.actorScope.realDataCompanyIds],
      },
      scopedCompanyId: authContext.scopedCompanyId,
      effectiveRole: authContext.effectiveRole,
      realMembershipRole: authContext.realMembershipRole,
      simulation: authContext.simulation
        ? {
            sessionId: authContext.simulation.sessionId,
            effectiveRole: authContext.simulation.effectiveRole,
            startedAt: authContext.simulation.startedAt instanceof Date
              ? authContext.simulation.startedAt.toISOString()
              : authContext.simulation.startedAt,
          }
        : null,
    }
  }
}
