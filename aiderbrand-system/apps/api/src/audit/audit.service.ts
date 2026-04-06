import { Injectable, Logger } from '@nestjs/common'
import type { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthContextData } from '../common/types'

export interface CreateAuditLogDto {
  actorId?: string
  companyId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

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
 * AuditService — write-only service for creating immutable audit log entries.
 *
 * Rules:
 * - Never throws on audit failure (log and continue — audit must not block flows)
 * - Audit writes happen INSIDE transactions in calling services for critical actions
 * - This service also exposes a fire-and-forget variant for non-critical logging
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an audit log entry.
   * Call this inside a Prisma transaction for critical operations.
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: dto.actorId ?? null,
        companyId: dto.companyId ?? null,
        action: dto.action,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        metadata: dto.metadata ? (dto.metadata as object) : undefined,
      },
    })
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
      authContext: this.serializeAuditAuthContext(authContext),
    }
  }

  toAuthContextMetadata(authContext: AuthContextData): AuditAuthContextMetadata {
    return this.serializeAuditAuthContext({
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
            startedAt: authContext.simulation.startedAt,
          }
        : null,
    })
  }

  private serializeAuditAuthContext(
    authContext: AuditAuthContextMetadata,
  ): AuditAuthContextMetadata {
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
